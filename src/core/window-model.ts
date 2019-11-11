import Model from "./model";
import Limiter from "./limiter";
import Store from "../helpers/store";
import { limit } from "../helpers/utils";

type WindowProps = {
  x: number;
  y: number;
  height: number;
  width: number;
  store: Store;
  resizeSize?: number;
  resizeable?: boolean;
  moveable?: boolean;
};

export default class WindowModel extends Model {
  static roleName = "WindowModel";
  model: { [prop: string]: any };
  $props: WindowProps;

  get splitLine() {
    const {
      rect: { top, left, right, bottom },
      width,
      height,
      x,
      y
    } = this;
    const w0 = x + width / 3;
    const w1 = x + (width * 2) / 3;
    const h0 = y + height / 3;
    const h1 = y + (height * 2) / 3;
    return [
      [{ x: w0, y }, { x: w0, y: bottom }],
      [{ x: w1, y }, { x: w1, y: bottom }],
      [{ x, y: h0 }, { x: right, y: h0 }],
      [{ x, y: h1 }, { x: right, y: h1 }]
    ];
  }

  get resizeRect() {
    const {
      rect: { top, left, right, bottom },
      $props: { resizeSize }
    } = this;
    const size = resizeSize / 2;
    const m_w = left + this.width / 2;
    const m_h = top + this.height / 2;
    const maps: { cursor: string; x: number; y: number }[] = [
      { cursor: "nwse", x: left - size, y: top - size },
      { cursor: "ns", x: m_w - size, y: top - size },
      { cursor: "nesw", x: right - size, y: top - size },
      { cursor: "ew", x: right - size, y: m_h - size },
      { cursor: "nwse", x: right - size, y: bottom - size },
      { cursor: "ns", x: m_w - size, y: bottom - size },
      { cursor: "nesw", x: left - size, y: bottom - size },
      { cursor: "ew", x: left - size, y: m_h - size }
    ];
    /*
     * [0]--[1]--[2]
     * |				  |
     * [7]			 [3]
     * |				  |
     * [6]--[5]--[4]
     *
     * */
    return maps.map(
      (it, index) =>
        new ResizeRect({
          ...it,
          index,
          width: resizeSize,
          height: resizeSize,
          parent: this
        })
    );
  }

  constructor(props: WindowProps) {
    super(props);
    this.$props = { ...props };
    this.commit();
    this.createLimiter();
  }

  // region 计算属性
  get FREE() {
    return this.MODE === "free-window";
  }

  get minX() {
    return this.FREE ? 0 : Math.max(0, this.model.x);
  }

  get minY() {
    return this.FREE ? 0 : Math.max(0, this.model.y);
  }

  get maxX() {
    const { WIDTH, width, model } = this;
    return this.FREE ? WIDTH - width : model.rect.right - model.rect.left;
  }

  get maxY() {
    const { HEIGHT, height, model } = this;
    return this.FREE ? HEIGHT - height : model.rect.bottom - model.rect.top;
  }

  get maxWidth() {
    const { WIDTH, FREE, model, x } = this;
    return FREE ? WIDTH : Math.min(model.width + model.x - x, WIDTH - x);
  }

  get maxHeight() {
    const { HEIGHT, FREE, model, y } = this;
    return FREE ? HEIGHT : Math.min(model.height + model.y - y, HEIGHT - y);
  }

  // endregion

  createLimiter() {
    const {
      MODE,
      model,
      $options: { width, height }
    } = this;
    let options: {
      x: number;
      y: number;
      width: number;
      height: number;
      free: boolean;
    } = {
      x: 0,
      y: 0,
      width,
      height,
      free: false
    };
    const limitRect = this.getLimitRect();
    switch (MODE) {
      case "cover":
        break;
      case "contain":
        break;
      case "window":
        options.x = limitRect.x;
        options.y = limitRect.y;
        options.width = limitRect.width;
        options.height = limitRect.height;
        break;
      case "free-window":
        options.free = true;
        break;
    }
    this.$store.on("mutation_model", () => {
      const { x, y, width, height } = this.getLimitRect();
      // console.log(x, y, width, height, 'model changed');
      this.limiter.width = width;
      this.limiter.height = height;
      this.limiter.x = x;
      this.limiter.y = y;
    });
    this.limiter = new Limiter({
      ...options,
      isLimitInRect: false,
      keepRatio: false,
      store: this.$store,
      maxHeight: height,
      maxWidth: width,
      minHeight: 0,
      minWidth: 0
    });
  }

  resize({ index, x, y }: { index: number; x: number; y: number }) {
    const { width, height, minX, minY, maxX, maxY, maxWidth, maxHeight } = this;
    const limitHeight = limit(0, maxHeight);
    const limitWidth = limit(0, maxWidth);
    const limitX = limit(minX, maxX);
    const limitY = limit(minY, maxY);
    const newHeight = height + this.y - limitY(y);
    const newWidth = width + this.x - limitX(x);

    const newRight = width - newWidth - limitX(x) + x;
    const newBottom = height - newHeight - limitY(y) + y;
    console.log(this.model.rect);
    switch (index) {
      case 0:
        this.height = newHeight;
        this.y = y;
        this.width = newWidth;
        this.x = x;
        break;
      case 1:
        this.height = newHeight;
        this.y = y;
        break;
      case 2:
        this.y = y;
        this.height = newHeight;
        this.width = newRight;
        break;
      case 3:
        this.width = newRight;
        break;
      case 4:
        this.width = newRight;
        this.height = newBottom;
        break;
      case 5:
        this.height = newBottom;
        break;
      case 6:
        this.height = newBottom;
        this.width = newWidth;
        this.x = x;
        break;
      case 7:
        this.width = newWidth;
        this.x = x;
        break;
    }

    const size = this.limiter.limitSize({
      width: this.width,
      height: this.height
    });
    console.log(this.y, this.height, ">>>>>>>>>>");

    this.height = limitHeight(this.height);
    this.width = limitWidth(this.width);
    // this.width = size.width;
    // this.height = size.height;

    this.x = limitX(this.x);
    this.y = limitY(this.y);

    console.log(this.y, this.height, "<<<<<<<<<<");
    this.commit();
  }

  // 计算容器与图片的重叠部分,重叠部分即限制区域
  getLimitRect() {
    const { model, $options } = this;
    const x = Math.max(this.model.x, 0);
    const y = Math.max(this.model.y, 0);
    const right = Math.min($options.width, model.x + model.width);
    const bottom = Math.min($options.height, model.y + model.height);
    return {
      x,
      y,
      width: right - x,
      height: bottom - y
    };
  }

  commit() {
    this.$store.commit("SET_WINDOW", {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rect: { ...this.rect }
    });
  }
}

interface ResizeProps {
  cursor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: WindowModel;
  index: number;
}

export class ResizeRect {
  cursor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: WindowModel;
  index: number;
  endX: number;
  endY: number;

  constructor(props: ResizeProps) {
    Object.assign(this, props);
    this.cursor += "-resize";
    // Object.keys(props).forEach(key => {
    //   // @ts-ignore
    //   this[key] = props[key];
    // });
  }

  start() {
    this.endX = this.centerX;
    this.endY = this.centerY;
  }

  move(point: { x: number; y: number }) {
    const targetX = point.x + this.endX;
    const targetY = point.y + this.endY;

    let width = targetX - this.parent.rect.left;
    let height = targetY - this.parent.rect.top;
    this.parent.resize({ index: this.index, x: targetX, y: targetY });
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  get top() {
    return this.y;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get bottom() {
    return this.y + this.height;
  }
}
