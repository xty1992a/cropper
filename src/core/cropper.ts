import "../helpers/polyfill";
import store from "./store";
import Store from "../helpers/store";

import {
  EmitAble,
  isHit,
  listen,
  listenWheel,
  renderBg
} from "../helpers/utils";
import { dataURLtoBlob, limit } from "../packages/utils";
import ImageModel from "./image-model";
import WindowModel, { ResizeRect } from "./window-model";

type WindowProp = {
  x: number;
  y: number;
  width: number;
  height: number;
  moveable?: boolean;
  resizeable?: boolean;
  free?: boolean;
  resizeSize?: number;
};

type Props = {
  url: string;
  width: number;
  height: number;
  window?: WindowProp;
  wheelSpeed?: number;
  maxRate?: number;
  minRate?: number;
  cropMode?: string;
  maskColor?: string;
  resizeSize?: number;
  devicePixelRatio?: number;
};

type OutputType = {
  mime?: string;
  type?: string;
  quality?: number;
  success?: Function;
  fail?: Function;
};

const outputOptions: OutputType = {
  mime: "image/png",
  type: "base64",
  quality: 1,
  success: () => {},
  fail: () => {}
};

const dftOptions: Props = {
  url: "", // 截图链接
  width: 600, // 容器尺寸
  height: 375, // 容器尺寸
  window: null, // 截图框的rect对象截图框被限制在容器内设置超出部分无效
  wheelSpeed: 0.05, // 放大步长
  maxRate: 10, // 图片最大放大倍数
  minRate: 0.5, // 图片最小缩小倍数
  resizeSize: 8,
  cropMode: "cover", //  截图模式,cover表示不留白边拖动时也无法拖出
  maskColor: "rgba(0,0,0,0.6)", // 蒙层颜色
  devicePixelRatio: window.devicePixelRatio || 1 // dpr
};

type EventPoint = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  // endX: number
  // endY: number
};

export default class Cropper extends EmitAble {
  $store: Store;
  $options: Props;
  position: EventPoint;
  $canvas: HTMLCanvasElement;
  outputCanvas: HTMLCanvasElement;
  $el: HTMLElement;
  wrapBoundingRect: { x: number; y: number };
  isHitWindow: boolean;
  isDown: boolean;
  hitTarget: WindowModel | ImageModel | ResizeRect;
  window: WindowModel;
  model: ImageModel;
  HEIGHT: number;
  dpr: number;
  WIDTH: number;
  ctx: CanvasRenderingContext2D;
  positionTimer: number;
  MODE: "window" | "free-window" | "cover" | "contain";

  constructor(el: HTMLElement | string, options: Props) {
    super();
    this.init(el, { ...dftOptions, ...options });
  }

  // region 计算属性
  //endregion

  // region init
  init(el: HTMLElement | string, options: Props) {
    let window = Cropper.fmtWindow(options);
    this.handlerStore({ ...options, window });
    this.handlerDOM(el);
    this.handlerEvents();
    this.createModel(() => {
      this.createWindow();
      this.render();
      console.log(this);
    });
  }

  // 整理window
  static fmtWindow({ window, width, height, cropMode }: Props) {
    if (window) {
      window = { ...window };
      window.x = limit(0, width)(window.x || 0);
      window.y = limit(0, height)(window.y || 0);
      window.width = limit(0, width - window.x)(window.width);
      window.height = limit(0, height - window.y)(window.height);
    } else {
      window = {
        x: 0,
        y: 0,
        width,
        height,
        moveable: true,
        resizeable: true
      };
    }
    window.moveable =
      window.moveable && ["window", "free-window"].includes(cropMode);
    window.resizeable =
      window.moveable && ["window", "free-window"].includes(cropMode);
    window.free = window.free && ["free-window"].includes(cropMode);
    window.resizeSize = window.resizeSize || 5;
    return window;
  }

  // endregion

  // region DOM相关

  handlerDOM(el: HTMLElement | string) {
    let dom: HTMLElement;
    if (!(el instanceof Element)) {
      dom = document.querySelector(el);
    } else {
      dom = el;
    }
    if (!(dom instanceof Element)) throw new Error("el not exist!");
    this.$el = dom;
    this.createCanvas();
  }

  createCanvas() {
    const { width, height } = this.$options;
    const canvas = (this.$canvas = document.createElement("canvas"));
    const ctx = (this.ctx = canvas.getContext("2d"));
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    this.$el.appendChild(canvas);
    renderBg(canvas);
  }

  handlerEvents() {
    this.position = {
      x: 0,
      y: 0,
      startX: 0,
      startY: 0
      // endX: 0,
      // endY: 0
    };
    const el = this.$canvas;
    listenWheel(el, this.onMouseWheel);
    listen(el, "mousedown", this.onDown);
    listen(el, "mousemove", this.onMove);
    listen(el, "mouseup", this.onUp);
    listen(el, "mouseleave", this.onUp);
  }

  // region DOM事件
  onDown = (e: MouseEvent & TouchEvent) => {
    if (!this.model) return;
    this.isDown = true;
    const point = e.touches ? e.touches[0] : e;

    const { x, y } = this.getEventPoint(point);
    this.position.startX = point.clientX;
    this.position.startY = point.clientY;

    const resizeRect = this.hitResizeRect({ x, y });
    console.log(resizeRect);
    if (resizeRect) {
      this.hitTarget = resizeRect;
    } else {
      const hitWindow = isHit({ x, y }, this.window.rect);

      console.log(hitWindow, "hitWindow");
      if (hitWindow && this.window.moveable) {
        this.hitTarget = this.window;
      } else {
        this.hitTarget = this.model;
      }
    }
    this.hitTarget.start();
  };
  onMove = (e: MouseEvent & TouchEvent) => {
    this.handlerCursor(e);
    if (!this.model) return;
    if (!this.isDown) return;
    if (!this.hitTarget) return;
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    const {
      position: { startX, startY }
    } = this;
    const deltaX = clientX - startX; //* dpr;
    const deltaY = clientY - startY; //* dpr;
    this.hitTarget.move({ x: deltaX, y: deltaY });
    this.render();
  };
  onUp = (e: MouseEvent) => {
    if (!this.model) return;
    if (!this.isDown) return;
    this.isDown = false;
    this.$canvas.style.cursor = "";
  };
  onMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = limit(-1, 1)(-e.deltaY || -e.detail);
    const { x, y } = this.getEventPoint(e);
    const limitFn = limit(this.$options.minRate, this.$options.maxRate);
    const step = this.$options.wheelSpeed * -delta;
    const scale = +limitFn(this.model.scale + step).toFixed(2);
    this.zoom({ x, y }, scale);
  };

  handlerCursor(e: TouchEvent & MouseEvent) {
    if (!this.window) return;
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    const resizeRect = this.hitResizeRect(
      this.getEventPoint({ clientX, clientY })
    );
    this.$canvas.style.cursor = resizeRect ? resizeRect.cursor : "";
  }

  // endregion

  // endregion

  // region helpers

  getEventPoint({ clientX, clientY }: { clientX: number; clientY: number }) {
    // 节流慢操作
    clearTimeout(this.positionTimer);
    if (!this.wrapBoundingRect) {
      const rect = this.$canvas.getBoundingClientRect();
      this.wrapBoundingRect = {
        x: rect.left,
        y: rect.top
      };
    }
    const position = this.wrapBoundingRect;
    const x = clientX - position.x; // * this.dpr;
    const y = clientY - position.y; // * this.dpr;
    this.positionTimer = window.setTimeout(() => {
      this.wrapBoundingRect = null;
    }, 200);
    return { x, y };
  }

  hitResizeRect(point: { x: number; y: number }) {
    if (!this.window.resizeable) return null;
    const { resizeRect } = this.window;
    return resizeRect.find((it: any) => isHit(point, it)) || null;
  }

  // endregion

  // region 子组件相关
  // 计算图片初始位置
  computeModelOptions({ width, height }: { width: number; height: number }) {
    const {
      MODE,
      dpr,
      $options: { width: WIDTH, height: HEIGHT }
    } = this;
    // js计算有误差,简单取整
    const imgRatio = +(width / height).toFixed(4);
    const RATIO = +(WIDTH / HEIGHT).toFixed(4);
    // 占满容器
    let result: { x: number; y: number; width: number; height: number } = {
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT
    };

    // 高度与容器相等
    const fill_height = {
      width: HEIGHT * imgRatio,
      height: HEIGHT,
      x: (WIDTH - HEIGHT * imgRatio) / 2,
      y: 0
    };

    // 宽度与容器相等
    const fill_width = {
      width: WIDTH,
      height: WIDTH / imgRatio,
      y: (HEIGHT - WIDTH / imgRatio) / 2,
      x: 0
    };

    // 当图片比例与容器不一致时，按照合适的方式布局图片
    if (RATIO !== imgRatio) {
      // 容器宽度不足,顶住高度
      if (RATIO < imgRatio) {
        result = fill_height;
      }
      // 容器高度不足,顶住宽度
      else {
        result = fill_width;
      }
    }

    // contain模式应该顶住短边,正好反转
    if (["contain"].includes(MODE)) {
      result =
        result === fill_height
          ? fill_width
          : result === fill_width
          ? fill_height
          : result;
    }
    return result;
  }

  createModel(cb: Function) {
    const {
      $options: { url }
    } = this;
    ImageModel.loadImage(url, img => {
      const options = {
        img,
        x: 0,
        y: 0,
        scale: 1,
        ...this.computeModelOptions(img),
        moveable: true,
        resizeable: true,
        store: this.$store,
        free: true
      };
      this.model = new ImageModel(options);
      cb && cb();
    });
  }

  createWindow() {
    const {
      MODE,
      $options: { width, height, window: options }
    } = this;
    switch (MODE) {
      case "cover":
        options.x = options.y = 0;
        options.width = width;
        options.height = height;
        options.resizeable = false;
        options.moveable = false;
        break;
      case "contain":
        options.x = options.y = 0;
        options.width = width;
        options.resizeable = false;
        options.moveable = false;
        // windowOptions.height = height;
        // limiterOptions.free = true;
        break;
      case "window":
        options.resizeable = true;
        options.moveable = true;
        break;
      case "free-window":
        options.resizeable = true;
        options.moveable = true;
        /*        limiterOptions.x = limiterOptions.y = 0;
                limiterOptions.width = width;
                limiterOptions.height = height;
                limiterOptions.free = true;*/
        options.free = true;
        break;
    }
    this.window = new WindowModel({
      ...options,
      resizeSize: this.$options.resizeSize,
      store: this.$store
    });
  }

  zoom(point: { x: number; y: number }, scale: number) {
    this.model.zoom(point, scale);
    this.render();
  }

  // endregion

  // region store 相关

  handlerStore(opt: object) {
    this.$store = new Store(store);
    this.initStore(opt);
    this.mapStore();
  }

  initStore(options: object) {
    this.$store.commit("SET_OPTIONS", options);
  }

  mapStore() {
    this.$store.mapGetters(["HEIGHT", "WIDTH", "dpr", "MODE"]).call(this);
    this.$store.mapState(["options"]).call(this);
    this.$store
      .mapState({
        $options: "options"
      })
      .call(this);
  }

  // endregion

  // region 绘制
  render() {
    // requestAnimationFrame可以将回调放到浏览器渲染帧(相对空闲)时调用
    requestAnimationFrame(() => {
      const { ctx, WIDTH, HEIGHT } = this;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // 先绘制抠除窗口的蒙层,再将图像绘制到蒙层底部
      ctx.save();
      this.renderWindow();
      ctx.globalCompositeOperation = "destination-over";
      this.renderModel();
      ctx.restore();
      setTimeout(() => {
        // 派发事件到外部,数据是model的尺寸以及与相对于截图框的位移
        this.fire("change", {
          window: {
            x: this.model.x - this.window.x,
            y: this.model.y - this.window.y,
            width: this.window.width,
            height: this.window.height
          },
          model: {
            height: this.model.height,
            width: this.model.width
          }
        });
      });
    });
  }

  // 绘制图像
  // 在此前需要更新model的属性
  renderModel() {
    const {
      dpr,
      model: { x, y, width, height, img }
    } = this;
    if (!img) return;
    const { ctx } = this;
    ctx.drawImage(img, x * dpr, y * dpr, width * dpr, height * dpr);
  }

  // 绘制一个空心的蒙层
  renderWindow() {
    const {
      ctx,
      WIDTH,
      HEIGHT,
      dpr,
      $options: { maskColor },
      window: { x, y, height, width, resizeable, resizeRect, rect, splitLine }
    } = this;

    ctx.save();
    ctx.fillStyle = maskColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.fillRect(x * dpr, y * dpr, width * dpr, height * dpr);
    ctx.restore();
    if (resizeable) {
      ctx.save();
      ctx.fillStyle = "#39f";
      ctx.lineWidth = dpr;
      ctx.strokeStyle = "#39f";
      ctx.beginPath();
      ctx.moveTo(x * dpr, y * dpr);
      ctx.lineTo(rect.right * dpr, y * dpr);
      ctx.lineTo(rect.right * dpr, rect.bottom * dpr);
      ctx.lineTo(rect.left * dpr, rect.bottom * dpr);
      ctx.closePath();
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = "#fff";

      splitLine.forEach((list: { x: number; y: number }[]) => {
        ctx.beginPath();
        ctx.moveTo(list[0].x * dpr, list[0].y * dpr);
        ctx.lineTo(list[1].x * dpr, list[1].y * dpr);
        ctx.stroke();
      });
      ctx.restore();
      resizeRect.forEach(rect => {
        ctx.fillRect(
          rect.x * dpr,
          rect.y * dpr,
          rect.width * dpr,
          rect.height * dpr
        );
      });
      ctx.restore();
    }
  }

  // endregion

  // region API
  getCropImage = ({
    mime,
    quality
  }: {
    mime: string;
    quality: number;
  }): string => {
    const {
      model,
      window: { x, y, width, height }
    } = this;
    const canvas =
      this.outputCanvas ||
      (this.outputCanvas = document.createElement("canvas"));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      model.img,
      model.x - x,
      model.y - y,
      model.width,
      model.height
    );
    return canvas.toDataURL(mime, quality);
  };

  // 库本身不打包Promise
  output = (options: OutputType) => {
    // @ts-ignore
    return new window.Promise((resolve, reject) => {
      try {
        options = { ...outputOptions, ...options };
        let data: any = this.getCropImage({
          mime: options.mime,
          quality: options.quality
        });
        if (options.type === "blob") {
          data = dataURLtoBlob(data);
        }
        options.success && options.success(data);
        resolve(data);
      } catch (e) {
        options.fail && options.fail(e);
        reject(e);
      }
    });
  };
  // endregion
}
