import Model from "./model";
import Limiter from "./limiter";
import { listen } from "../packages/utils";
import Store from "../helpers/store";

type ImageProps = {
  x: number;
  y: number;
  height: number;
  width: number;
  img: HTMLImageElement;
  scale?: number;
  resizeable?: boolean;
  moveable?: boolean;
  store: Store;
};

const dftOptions = {
  x: 0,
  y: 0,
  width: 600,
  height: 375,
  scale: 1,
  resizeable: true,
  moveable: true
};

export default class ImageModel extends Model {
  img: HTMLImageElement;
  scale: number;
  $props: ImageProps;

  constructor(props: ImageProps) {
    super(props);
    this.$props = { ...dftOptions, ...props };
    this.scale = 1;
    this.img = props.img;
    this.mapStates();
    this.commit();
    this.createLimiter();
  }

  commit() {
    this.$store.commit("SET_MODEL", {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rect: { ...this.rect }
    });
  }

  createLimiter() {
    const {
      MODE,
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
    switch (MODE) {
      case "cover":
        break;
      case "contain":
        options.free = true;
        break;
      case "window":
        options.x = this.window.x;
        options.y = this.window.y;
        options.width = this.window.width;
        options.height = this.window.height;
        break;
      case "free-window":
        options.free = true;
        break;
    }

    if (MODE === "window") {
      this.$store.on("mutation_window", () => {
        const { x, y, height, width } = this.window;
        this.limiter.width = width;
        this.limiter.height = height;
        this.limiter.x = x;
        this.limiter.y = y;
      });
    }

    this.limiter = new Limiter({
      ...options,
      store: this.$store,
      isLimitInRect: true,
      keepRatio: true,
      maxHeight: this.$props.height * Math.sqrt(this.$options.maxRate),
      maxWidth: this.$props.width * Math.sqrt(this.$options.maxRate),
      minWidth: this.$props.width * Math.sqrt(this.$options.minRate),
      minHeight: this.$props.height * Math.sqrt(this.$options.minRate)
    });
  }

  zoom(point: { x: number; y: number }, scale: number) {
    const {
      $props: { width, height }
    } = this;
    const { width: newWidth, height: newHeight } = this.limiter.limitSize({
      width: width * scale,
      height: height * scale
    });
    const origin = { x: point.x - this.x, y: point.y - this.y, height };
    // this.resize(origin, {width: newWidth, height: newHeight});
    const deltaX = origin.x - (origin.x / this.width) * newWidth;
    const deltaY = origin.y - (origin.y / this.height) * newHeight;
    // endregion
    this.width = newWidth;
    this.height = newHeight;
    this.commit();

    const position = this.limiter.limitPosition({
      x: this.x + deltaX,
      y: this.y + deltaY
    });
    this.scale = newHeight / height;
    this.x = position.x;
    this.y = position.y;
    this.commit();
  }

  mapStates() {
    this.$store.mapState({}).call(this);
  }

  static loadImage(url: string, cb: ImgLoadCb) {
    const img = new Image();
    listen(img, "load", () => cb(img));
    listen(img, "error", () => cb(null));
    img.crossOrigin = "";
    console.log(img.crossOrigin);
    img.src = url;
  }
}

interface ImgLoadCb {
  (img: HTMLImageElement | null): void;
}
