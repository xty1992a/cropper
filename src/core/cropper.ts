import "../helpers/polyfill";
import store from "./store";
import Store from "../helpers/store";
import { ICropper, OutputType } from "../types/index";
import EventManager from "./events-manager";

import {
  EmitAble,
  isHit,
  isMobile,
  renderBg,
  dataURLtoBlob,
  limit
} from "../helpers/utils";
import ImageModel from "./image-model";
import WindowModel, { ResizeRect } from "./window-model";

// region types
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
  devicePixelRatio?: number;
};

type Events = {
  [prop: string]: keyof GlobalEventHandlersEventMap;
};
// endregion

// region options&constant
const outputOptions: OutputType = {
  mime: "image/png",
  type: "base64",
  quality: 1
};

const dftOptions: Props = {
  url: "", // 截图链接
  width: 600, // 容器尺寸
  height: 375, // 容器尺寸
  window: null, // 截图框的rect对象,截图框被限制在容器内,设置超出容器部分无效
  wheelSpeed: 0.05, // 放大步长
  maxRate: 10, // 图片最大放大倍数
  minRate: 0.5, // 图片最小缩小倍数
  cropMode: "cover", //  截图模式,cover表示不留白边,拖动时也无法拖出容器
  maskColor: "rgba(0,0,0,0.6)", // 蒙层颜色
  devicePixelRatio: window.devicePixelRatio || 1 // dpr
};

// endregion

export default class Cropper extends EmitAble implements ICropper {
  // region types
  $store: Store;
  $options: Props;
  $canvas: HTMLCanvasElement;
  outputCanvas: HTMLCanvasElement;
  $el: HTMLElement;
  hitTarget: WindowModel | ImageModel | ResizeRect;
  window: WindowModel;
  model: ImageModel;
  $eventManager: EventManager;
  HEIGHT: number;
  dpr: number;
  WIDTH: number;
  ctx: CanvasRenderingContext2D;
  MODE: "window" | "free-window" | "cover" | "contain";

  // endregion

  constructor(el: HTMLElement | string, options: Props) {
    super();
    this.handleStore({ ...dftOptions, ...options });
    this.handleDOM(el);
    this.changeImage(this.$options.url);
  }

  // region 子组件相关

  handlerChildren(url: string) {}

  createChildren(img: HTMLImageElement) {
    this.createModel(img);
    this.createWindow();
    this.render();
    this.fire("ready");
  }

  createModel(img: HTMLImageElement) {
    const {
      MODE: mode,
      $options: { width, height }
    } = this;
    const options = {
      ...Cropper.fmtModelOptions({ img, mode, width, height }),
      store: this.$store,
      moveable: true,
      resizeable: true,
      img
    };
    this.model = new ImageModel(options);
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
      store: this.$store
    });
  }

  // endregion

  // region DOM 相关

  handleDOM(el: HTMLElement | string) {
    let dom: HTMLElement =
      typeof el === "string" ? document.querySelector(el) : el;
    if (!(dom instanceof Element))
      throw new Error("el must be Element or domSelectors!");
    const canvas = this.createCanvas();
    renderBg(canvas);
    dom.appendChild(canvas);
    this.$el = dom;
    this.$eventManager = new EventManager({ el: this.$canvas });
    this.handleEvents();
  }

  createCanvas() {
    const { width, height } = this.$options;
    const canvas = (this.$canvas = document.createElement("canvas"));
    this.ctx = canvas.getContext("2d");
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    return canvas;
  }

  handleEvents() {
    const event = this.$eventManager;
    event.on("point-down", e => {
      const { x, y } = e;
      const resizeRect = this.hitResizeRect({ x, y });
      if (resizeRect) {
        this.hitTarget = resizeRect;
      } else {
        const hitWindow = isHit({ x, y }, this.window.rect);
        if (hitWindow && this.window.moveable) {
          this.hitTarget = this.window;
        } else {
          this.hitTarget = this.model;
        }
      }
      this.hitTarget.start();
    });
    event.on("point-move", e => {
      const { deltaX: x, deltaY: y } = e;
      this.hitTarget.move({ x, y });
      this.render();
    });
    event.on("mouse-move", e => {
      const resizeRect = this.hitResizeRect(e);
      this.$canvas.style.cursor = resizeRect ? resizeRect.cursor : "";
    });
    event.on("point-up", e => {
      console.log("point-up", e);
    });
    event.on("zoom", e => {
      this.zoom(e.origin, e.direction);
    });
  }

  // endregion

  // region store 相关
  handleStore(opt: Props) {
    const window = Cropper.fmtWindowOptions(opt);
    this.$store = new Store(store);
    this.commitOptions({ ...opt, window });
    this.mapStore();
  }

  // 将外部配置提交到store
  commitOptions(options: object) {
    this.$store.commit("SET_OPTIONS", options);
  }

  // 将store中的字段映射到本类中
  mapStore() {
    this.$store.mapGetters(["HEIGHT", "WIDTH", "dpr", "MODE"]).call(this);
    this.$store.mapState({ $options: "options" }).call(this);
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
          window: { ...this.window.rect },
          model: { ...this.model.rect },
          offset: this.window.getOffsetBy(this.model)
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
  changeImage(img: HTMLImageElement | string, callback?: Function) {
    if (typeof img === "string") {
      ImageModel.loadImage(img, image => {
        if (!image) throw new Error(img + " is not valid image url!");
        this.createChildren(image);
        setTimeout(() => callback && callback());
      });
      return;
    }
    if (!(img instanceof Image))
      throw new Error("img must be Image or image url!");
    this.createChildren(img);
    setTimeout(() => callback && callback());
  }

  // 在指定位置进行缩放
  // origin指缩放发生的坐标(canvas坐标),delta指方向
  zoom(origin: { x: number; y: number }, direction: number) {
    const { wheelSpeed } = this.$options;
    const {
      width,
      height,
      $props: { width: originWidth, height: originHeight }
    } = this.model;
    // 计算需要缩放到的面积
    const newArea = width * height * (1 + wheelSpeed * direction);
    // 计算它相对于初始面积的比值
    const ratio = newArea / (originWidth * originHeight);
    // 开根即宽高相对于初始尺寸的比值
    const scale = Math.sqrt(ratio);
    // 更新model
    this.model.zoom(origin, scale);
    // 更新model后更新画面
    this.render();
  }

  // 移动到指定位置
  moveTo = (x: number, y: number) => {
    if (!this.model) return;
    this.model.moveTo({ x, y });
    this.render();
  };

  // 获取截图窗内的图片，base64格式
  getCropImage = ({ mime, quality }: OutputType): string => {
    const {
      model,
      dpr,
      window: { x, y, width, height }
    } = this;
    const canvas =
      this.outputCanvas ||
      (this.outputCanvas = document.createElement("canvas"));
    canvas.style.cssText = `width:${width}px;height:${height}px;`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      model.img,
      (model.x - x) * dpr,
      (model.y - y) * dpr,
      model.width * dpr,
      model.height * dpr
    );
    return canvas.toDataURL(mime, quality);
  };

  // 对getCropImage的包装，同时支持promise及callback两种方式返回
  output = (options: OutputType = {}): string | Blob | Error => {
    try {
      options = { ...outputOptions, ...options };
      let data: string | Blob = this.getCropImage({
        mime: options.mime,
        quality: options.quality
      });
      if (options.type === "blob") {
        data = dataURLtoBlob(data);
      }
      return data;
    } catch (e) {
      return e;
    }
  };
  // endregion

  // region helpers

  // 检查是否命中截图框缩放节点
  hitResizeRect(point: { x: number; y: number }) {
    if (!this.window.resizeable) return null;
    const { resizeRect } = this.window;
    return resizeRect.find((it: any) => isHit(point, it)) || null;
  }

  // 格式化window的配置
  static fmtWindowOptions(options: Props): WindowProp {
    let { window: win, width, height, cropMode } = options;
    if (win) {
      win = { ...win };
      win.x = limit(0, width)(win.x || width / 4);
      win.y = limit(0, height)(win.y || 0);
      win.width = limit(0, width - win.x)(win.width || width / 2);
      win.height = limit(0, height - win.y)(win.height || height);
    } else {
      win = {
        x: width / 4,
        y: 0,
        width: width / 2,
        height,
        moveable: true,
        resizeable: true
      };
    }
    win.moveable = win.moveable && ["window", "free-window"].includes(cropMode);
    win.resizeable =
      win.moveable && ["window", "free-window"].includes(cropMode);
    win.free = win.free && ["free-window"].includes(cropMode);
    win.resizeSize = (win.resizeSize || 5) * window.devicePixelRatio; // 高分屏下,放大window缩放点
    return win;
  }

  // 格式化model的配置
  static fmtModelOptions(options: {
    img: HTMLImageElement;
    mode: string;
    width: number;
    height: number;
  }) {
    const { img, mode, width, height } = options;
    // js计算有误差,简单取整
    const imgRatio = +(img.width / img.height).toFixed(4);
    const RATIO = +(width / height).toFixed(4);
    // 占满容器
    let result: {
      x: number;
      y: number;
      width: number;
      height: number;
      scale?: number;
    } = {
      x: 0,
      y: 0,
      width,
      height
    };

    // 高度与容器相等
    const fill_height = {
      width: height * imgRatio,
      height: height,
      x: (width - height * imgRatio) / 2,
      y: 0
    };

    // 宽度与容器相等
    const fill_width = {
      width,
      height: width / imgRatio,
      y: (height - width / imgRatio) / 2,
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
    if (["contain"].includes(mode)) {
      result =
        result === fill_height
          ? fill_width
          : result === fill_width
          ? fill_height
          : result;
    }
    return { ...result, scale: result.height / img.height };
  }

  // endregion
}
