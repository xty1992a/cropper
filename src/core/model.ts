import Limiter from "./limiter";
import Store from "../helpers/store";

export type Props = {
  x: number;
  y: number;
  height: number;
  width: number;
  resizeable?: boolean;
  moveable?: boolean;
  store: Store;
};

export default class Model {
  x: number;
  y: number;
  height: number;
  width: number;
  endX: number;
  endY: number;
  resizeable: boolean;
  moveable: boolean;
  limiter: Limiter;
  $store: Store;
  MODE: string;
  WIDTH: number;
  HEIGHT: number;
  $options: { [prop: string]: any };
  window: { [prop: string]: any };
  model: { [prop: string]: any };
  scale: number;

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
    this.$store = props.store;
    this.mapStore();
    Object.assign(this, props);
    this.endX = props.x;
    this.endY = props.y;
  }

  start() {
    this.endX = this.x;
    this.endY = this.y;
  }

  commit() {}

  move(point: { x: number; y: number }) {
    if (!this.moveable) return;
    this.moveTo({
      x: point.x + this.endX,
      y: point.y + this.endY
    });
  }

  moveTo(position: { x: number; y: number }) {
    if (!this.moveable) return;
    position = this.limiter.limitPosition(position);
    this.x = position.x;
    this.y = position.y;
    this.commit();
  }

  getOffsetBy(model: Model) {
    return {
      x: this.x - model.x,
      y: this.y - model.y,
      width: this.width,
      height: this.height
    };
  }

  mapStore() {
    this.$store.mapGetters(["HEIGHT", "WIDTH", "dpr", "MODE"]).call(this);
    this.$store
      .mapState({
        $options: "options",
        window: "window",
        model: "model"
      })
      .call(this);
  }
}
