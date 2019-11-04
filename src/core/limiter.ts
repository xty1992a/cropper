import { limit, Rect } from "../helpers/utils";
import Store from "../helpers/store";

type LimiterProps = {
  free: boolean;
  isLimitInRect: boolean;
  keepRatio: boolean;
  maxHeight: number;
  maxWidth: number;
  x: number;
  y: number;
  height: number;
  width: number;
  store: Store;
};

type anyObj = {
  [prop: string]: any;
};

export default class Limiter {
  x: number;
  y: number;
  width: number;
  modelWidth: number;
  height: number;
  modelHeight: number;
  maxWidth: number;
  maxHeight: number;
  $store: Store;
  $options: anyObj;
  model: anyObj;
  window: anyObj;
  FREE: boolean;
  isLimitInRect: boolean;
  keepRatio: boolean;

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

  /*  get maxModelWidth() {
      return this.width * this.$options.maxRate;
    }

    get maxModelHeight() {
      return this.height * this.$options.maxRate;
    }*/

  constructor(props: LimiterProps) {
    this.$store = props.store;
    this.mapStore();
    this.FREE = props.free;
    this.x = props.x;
    this.y = props.y;
    this.width = props.width;
    this.height = props.height;
    this.keepRatio = props.keepRatio;
    this.maxWidth = props.maxWidth;
    this.maxHeight = props.maxHeight;
    this.isLimitInRect = props.isLimitInRect;
  }

  limitSize(size: { width: number; height: number }) {
    const { width, height, maxHeight, maxWidth, FREE } = this;
    let w = limit(width, maxHeight)(size.width);
    let h = limit(height, maxWidth)(size.height);

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
      width: FREE ? size.width : w,
      height: FREE ? size.height : h
    };
  }

  limitPosition(rect: { x: number; y: number }) {
    const { width, height, x, y, FREE } = this;
    if (FREE) return rect;
    if (this.isLimitInRect) {
      return {
        x: limit(x - (this.model.width - width), x)(rect.x),
        y: limit(y - (this.model.height - height), y)(rect.y)
      };
    } else {
      return {
        x: limit(x, width - this.window.width + x)(rect.x),
        y: limit(y, height - this.window.height + y)(rect.y)
      };
    }
  }

  // 抽象的限制坐标方法
  // 给定指定的坐标，给定一个
  // rect
  // 如果rect在限制器内部，则x,y的范围必须在rect内部
  // 如果rect包裹限制器，则x,y的范围不可低于
  limit(rect: Rect) {
    let result: { x: number; y: number; width: number; height: number };
    if (this.isLimitInRect) {
      let x = limit(this.x - rect.width - this.width, this.x)(rect.x);
      let y = limit(this.y - rect.height - this.height, this.y)(rect.y);
      let width = limit(this.width, this.maxWidth)(rect.width);
      let height = limit(this.height, this.maxHeight)(rect.height);
      result = { x, y, width, height };
    } else {
      let x = limit(this.x, this.width - rect.width)(rect.x);
      let y = limit(this.y, this.height - rect.height)(rect.y);
      let width = limit(0, this.right - x)(rect.width);
      let height = limit(0, this.bottom - y)(rect.height);
      result = { x, y, width, height };
    }

    if (this.keepRatio) {
      const ratio = +(rect.width / rect.height).toFixed(4);
      const imgRatio = +(result.width / result.height).toFixed(4);
      if (ratio !== imgRatio) {
        if (ratio > imgRatio) {
          result.width = result.height * ratio;
        } else {
          result.height = result.width / ratio;
        }
      }
    }
    return result;
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
