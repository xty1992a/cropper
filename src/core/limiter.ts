import { limit } from "../helpers/utils";
import Store from "../helpers/store";

type LimiterProps = {
  free: boolean;
  isLimitInRect: boolean;
  keepRatio: boolean;
  maxHeight: number;
  maxWidth: number;
  minHeight: number;
  minWidth: number;
  x: number;
  y: number;
  height: number;
  width: number;
  store: Store;
};

type anyObj = {
  [prop: string]: any;
};

type Size = { width: number; height: number };
type Point = { x: number; y: number };

export interface ILimiter {
  x: number;
  y: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;

  limitSize(size: Size): Size;

  limitPosition(point: Point): Point;
}

export default class Limiter implements ILimiter {
  x: number;
  y: number;
  width: number;
  height: number;
  modelWidth: number;
  modelHeight: number;
  maxWidth: number;
  minWidth: number;
  minHeight: number;
  maxHeight: number;
  $store: Store;
  $options: anyObj;
  model: anyObj;
  window: anyObj;
  FREE: boolean;
  isLimitInRect: boolean;
  keepRatio: boolean;

  // region 计算属性
  get top() {
    return this.y;
  }

  get left() {
    return this.x;
  }

  get bottom() {
    return this.y + this.height;
  }

  get right() {
    return this.x + this.width;
  }

  // endregion

  constructor(props: LimiterProps) {
    this.$store = props.store;
    this.mapStore();
    this.FREE = props.free;
    Object.assign(this, props);
  }

  limitSize(size: Size): Size {
    const {
      width,
      height,
      minWidth,
      minHeight,
      maxHeight,
      maxWidth,
      FREE
    } = this;
    if (FREE) return size;
    let w = limit(Math.max(minWidth, width), maxWidth)(size.width);
    let h = limit(Math.max(minHeight, height), maxHeight)(size.height);

    if (this.keepRatio) {
      const ratio = +(size.width / size.height).toFixed(4);
      const imgRatio = +(w / h).toFixed(4);
      if (ratio !== imgRatio) {
        if (ratio > imgRatio) {
          w = h * ratio;
        } else {
          h = w / ratio;
        }
      }
    }
    return {
      width: w,
      height: h
    };
  }

  limitPosition(point: Point): Point {
    const { width, height, x, y, FREE } = this;
    if (FREE) return point;
    if (this.isLimitInRect) {
      return {
        x: limit(x - (this.model.width - width), x)(point.x),
        y: limit(y - (this.model.height - height), y)(point.y)
      };
    } else {
      return {
        x: limit(x, width - this.window.width + x)(point.x),
        y: limit(y, height - this.window.height + y)(point.y)
      };
    }
  }

  mapStore() {
    this.$store.mapGetters(["modelWidth", "modelHeight", "dpr"]).call(this);
    this.$store
      .mapState({
        $options: "options",
        model: "model",
        window: "window"
      })
      .call(this);
  }
}
