import store from "./store";
import Store from "../helpers/store";
import {
  EmitAble,
  isHit,
  listen,
  listenWheel,
  renderBg
} from "../helpers/utils";
import { limit } from "../packages/utils";

type Props = {
  url: string;
  width: number;
  height: number;
  window?: object;
  wheelSpeed?: number;
  maxRate?: number;
  minRate?: number;
  cropMode?: string;
  maskColor?: string;
  windowResizable?: true;
  windowMoveable?: true;
  devicePixelRatio?: number;
};

const dftOptions: Props = {
  url: "", // 截图链接
  width: 600, // 容器尺寸
  height: 375, // 容器尺寸
  window: null, // 截图框的rect对象截图框被限制在容器内设置超出部分无效
  wheelSpeed: 0.05, // 放大步长
  maxRate: 10, // 图片最大放大倍数
  minRate: 0.5, // 图片最小缩小倍数
  cropMode: "cover", //  截图模式,cover表示不留白边拖动时也无法拖出
  maskColor: "rgba(0,0,0,0.6)", // 蒙层颜色
  windowResizable: true,
  windowMoveable: true,
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
  $el: HTMLElement;
  wrapBoundingRect: { x: number; y: number };
  isHitWindow: boolean;
  isDown: boolean;
  hitTarget: any; // windowModel|ImageModel|resizeRect
  window: any; // windowModel
  model: any; // ImageModel
  HEIGHT: number;
  dpr: number;
  WIDTH: number;
  ctx: CanvasRenderingContext2D;
  positionTimer: number;

  // [prop: string]: any

  constructor(el: HTMLElement | string, options: Props) {
    super();
    this.handlerStore({ ...dftOptions, ...options });
    this.handlerDOM(el);
  }

  // region 计算属性
  // 根据hitTarget来决定
  get cursor() {
    return "";
  }

  //endregion

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

  onDown = (e: MouseEvent & TouchEvent) => {
    if (!this.model) return;
    this.isDown = true;
    const point = e.touches ? e.touches[0] : e;

    const { x, y } = this.getEventPoint(point);
    this.position.startX = point.clientX;
    this.position.startY = point.clientY;

    const resizeRect = /*(this.resizeRect = */ this.hitResizeRect({ x, y }); //);
    // this.resizeRect && (this.resizeRect = {...this.resizeRect});

    if (resizeRect) {
      this.hitTarget = resizeRect;
      // this.position.endX = resizeRect.x + resizeRect.size / 2;
      // this.position.endY = resizeRect.y + resizeRect.size / 2;
      return;
    }

    const hitWindow = isHit({ x, y }, this.window.rect);

    if (hitWindow && this.window.moveable) {
      this.hitTarget = this.window;
      return;
    }

    this.hitTarget = this.model;

    // this.position.endX = model.x;
    // this.position.endY = model.y;
  };
  onMove = (e: MouseEvent & TouchEvent) => {
    if (!this.model) return;
    if (!this.isDown) return;
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    const {
      position: { startX, startY },
      dpr
    } = this;
    const deltaX = clientX - startX; //* dpr;
    const deltaY = clientY - startY; //* dpr;

    this.hitTarget.move({ deltaX, deltaY });
    /*
        this.window.modelX = this.limiter.modelX = this.model.x;
        this.window.modelY = this.limiter.modelY = this.model;
        if (!this.resizeRect) {
          if (this.isHitWindow && this.window.moveable) {
            model = this.window;
          }

          model.move({
            x: endX + deltaX,
            y: endY + deltaY
          });
        } else {
          this.window.resize(
            {
              x: endX + deltaX,
              y: endY + deltaY
            },
            this.resizeRect
          );
        }
        this.render();
    */
  };
  onUp = (e: MouseEvent) => {
    if (!this.model) return;
    if (!this.isDown) return;
    this.isDown = false;
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
    if (!this.window.resizable) return null;
    const { resizeRect } = this.window;
    return resizeRect.find((it: any) => isHit(point, it)) || null;
  }

  // endregion

  // region 子组件相关

  createModel() {
    this.model = new ImageModel({});
  }

  zoom(point: { x: number; y: number }, scale: number) {
    // console.log("[mouse zoom on] ", position, scale, delta);
    this.model.zoom(point, scale);
    /*   console.log(
         "scale [%s], width [%s], height [%s], x [%s], y [%s]",
         scale,
         this.model.width,
         this.model.height,
         this.model.x,
         this.model.y
       );*/
    // this.render();
  }

  // endregion

  // region store 相关

  handlerStore(opt: object) {
    this.$store = store;
    this.initStore(opt);
    this.mapStore();
  }

  initStore(options: object) {
    this.$store.commit("SET_OPTIONS", options);
  }

  mapStore() {
    this.$store.mapGetters(["HEIGHT", "WIDTH", "dpr"]).call(this);
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
        /*        this.fire("change", {
                  x: (this.model.x - this.window.x) / this.$options.devicePixelRatio,
                  y: (this.model.y - this.window.y) / this.$options.devicePixelRatio,
                  height: this.model.height / this.$options.devicePixelRatio,
                  width: this.model.width / this.$options.devicePixelRatio
                });*/
      });
    });
  }

  // 绘制图像
  // 在此前需要更新model的属性
  renderModel() {
    const { x, y, width, dpr, height, img } = this.model;
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
      window: { x, y, height, width, resizable, resizeRect, rect, splitLine }
    } = this;

    // console.log(' window : %s %s \n limiter: %s %s', this.window.x, this.window.y, this.limiter.x, this.limiter.y);
    ctx.save();
    ctx.fillStyle = maskColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.fillRect(x * dpr, y * dpr, width * dpr, height * dpr);
    ctx.restore();
    if (resizable) {
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
        ctx.moveTo(list[0].x, list[0].y);
        ctx.lineTo(list[1].x, list[1].y);
        ctx.stroke();
      });
      ctx.restore();
      resizeRect.forEach((rect: { [prop: string]: number }) => {
        ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      });
      ctx.restore();
    }
  }

  // endregion
}
