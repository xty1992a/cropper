import { EmitAble } from "../helpers/utils";
import Limiter from "./limiter";
import store from "./store";
import Store from "../helpers/store";

type Props = {};

/*type Rect = {
  x: number
  y: number
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
  maxWidth?: number
  maxHeight?: number
}*/

export class Model extends EmitAble {
  x: number;
  y: number;
  height: number;
  width: number;
  resizeable: boolean;
  moveable: boolean;
  limiter: Limiter;
  originWidth: number;
  originHeight: number;
  $store: Store;

  get rect() {
    const { x, y, height, width } = this;
    return {
      x,
      y,
      height,
      width,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height
    };
  }

  constructor(props: Props) {
    super();
    this.$store = store;
    this.mapStore();
  }

  move(point: { x: number; y: number }) {
    if (!this.moveable) return;
    point = this.limiter.limitPosition(point);
    this.x = point.x;
    this.y = point.y;
  }

  // 抽象的调整model尺寸的方法
  // 给定一个原点，给定需要增长的尺寸，
  // 根据限制器，重设model的x,y,width,height
  resize(
    origin: { x: number; y: number },
    target: { width: number; height: number }
  ) {
    if (!this.resizeable) return;

    /*    const rect = new Rect({
          x: this.x,
          y: this.y,
          width: target.width,
          height: target.height
        });
        const {width: newWidth, height: newHeight} = this.limiter.limit(rect, limiter, flags);
        origin = {x: origin.x - this.x, y: origin.y-this.y}
        const deltaX = origin.x - (origin.x / this.width) * newWidth;
        const deltaY = origin.y - (origin.y / this.height) * newHeight;*/
  }

  getRectBy(model: any) {}

  mapStore() {
    this.$store.mapGetters(["HEIGHT", "WIDTH", "dpr"]).call(this);
    this.$store.mapState(["options"]).call(this);
    this.$store
      .mapState({
        $options: "options"
      })
      .call(this);
  }
}
