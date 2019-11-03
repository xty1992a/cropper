import { limit, Rect } from "../packages/utils";
import store from "./store";
import Store from "../helpers/store";

type Props = {
  free: boolean;
  isLimitInRect: boolean;
  keepRatio: boolean;
  maxHeight: number;
  maxWidth: number;
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

  constructor(props: Props) {
    this.$store = store;
    this.mapStore();
    this.FREE = props.free;
    this.keepRatio = props.keepRatio;
    this.maxWidth = props.maxWidth;
    this.maxHeight = props.maxHeight;
    this.isLimitInRect = props.isLimitInRect;
  }

  limitSize(
    size: { x: number; y: number; width: number; height: number },
    keepRatio: boolean = true
  ) {
    const { width, height, maxHeight, maxWidth, FREE } = this;
    let w = limit(width, maxHeight)(size.width);
    let h = limit(height, maxWidth)(size.height);

    if (keepRatio) {
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
    return {
      x: FREE ? rect.x : limit(width - this.modelWidth + x, x)(rect.x),
      y: FREE ? rect.y : limit(y - this.modelHeight + height, y)(rect.y)
    };
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
        $options: "options"
      })
      .call(this);
  }
}
