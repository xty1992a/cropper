const dftOptions = {
  width: 600,
  height: 375,
  devicePixelRatio: window.devicePixelRatio,
  url: "",
  wheelSpeed: 0.05,
  cropMode: "cover" // 截图模式,cover表示不留白边,拖动时,也无法拖出
};

const limit = (min, max) => val => Math.min(Math.max(val, min), max);
const listenWheel = (el, callback) => {
  if (document.addEventListener) {
    el.addEventListener("mousewheel", callback);
    el.addEventListener("wheel", callback);
    el.addEventListener("DOMMouseScroll", callback);
  } else {
    el.attachEvent("onmousewheel", callback); //IE 6/7/8
  }
};

export default class Cropper {
  constructor(el, opt = {}) {
    if (!(el instanceof Element)) {
      el = document.querySelector(el);
    }
    if (!el instanceof Element) throw new Error("el not exist!");
    this.$el = el;
    this.$options = { ...dftOptions, ...opt };
    this.position = {
      x: 0,
      y: 0,
      startX: 0,
      endX: 0,
      startY: 0,
      endY: 0
    };
    this.init();
  }

  async init() {
    this.initCanvas();
    this.listenEvents();
    await this.createModel(this.$options.url);
    this.render();
  }

  initCanvas() {
    const { width, height, devicePixelRatio } = this.$options;
    const canvas = (this.$canvas = document.createElement("canvas"));
    const ctx = (this.ctx = canvas.getContext("2d"));
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.mozImageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = true;
    this.$el.appendChild(canvas);
  }

  async createModel(url) {
    const img = await ImageModel.loadImage(url);
    if (!img) return;
    this.model = new ImageModel({
      ...this.computeModelOptions(img),
      parent: this
    });
    this.model.putImage(img);
  }

  computeModelOptions({ width, height }) {
    const { width: WIDTH, height: HEIGHT } = this.$canvas;
    const imgRatio = width / height;
    const RATIO = WIDTH / HEIGHT;
    if (RATIO === imgRatio) return { x: 0, y: 0, width: WIDTH, height: HEIGHT };
    console.log(RATIO, imgRatio);
    if (RATIO < imgRatio) {
      console.log("宽超出");
      return {
        width: HEIGHT * imgRatio,
        height: HEIGHT,
        x: (WIDTH - HEIGHT * imgRatio) / 2
      };
    }
    console.log("高超出");
    return {
      width: WIDTH,
      height: WIDTH / imgRatio,
      y: (HEIGHT - WIDTH / imgRatio) / 2
    };
  }

  listenEvents() {
    const el = this.$canvas;
    listenWheel(el, this.mouseWheel);
    el.addEventListener("mousedown", this.down);
    el.addEventListener("mousemove", this.move);
    el.addEventListener("mouseup", this.up);
    el.addEventListener("mouseleave", this.up);
  }

  down = e => {
    this.isDown = true;
    const point = e.touches ? e.touches[0] : e;
    this.position.startX = point.clientX;
    this.position.startY = point.clientY;
    this.position.endX = this.model.x;
    this.position.endY = this.model.y;
  };

  move = e => {
    if (!this.isDown) return;
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    const {
      position: { startX, startY, endX, endY },
      $options: { devicePixelRatio: dpr }
    } = this;
    const deltaX = (clientX - startX) * dpr;
    const deltaY = (clientY - startY) * dpr;

    this.model.move({
      x: endX + deltaX,
      y: endY + deltaY
    });
    this.render();
  };

  up = () => {
    if (!this.isDown) return;
    this.isDown = false;
  };

  mouseWheel = e => {
    e.preventDefault();
    clearTimeout(this.positionTimer);
    const value = e.wheelDelta || -e.deltaY || -e.detail;
    const delta = limit(-1, 1)(value);
    const { clientX, clientY } = e;
    if (!this.wrapPosition) {
      const rect = this.$canvas.getBoundingClientRect();
      this.wrapPosition = {
        x: rect.left,
        y: rect.top
      };
    }
    const position = this.wrapPosition;
    const x = (clientX - position.x) * this.$options.devicePixelRatio;
    const y = (clientY - position.y) * this.$options.devicePixelRatio;
    this.zoom({ x, y }, delta);
    // 节流会导致重排的操作
    this.positionTimer = setTimeout(() => {
      this.wrapPosition = null;
    }, 200);
  };

  zoom(position, delta) {
    const limitFn = limit(1, 10);

    const step =
      delta < 0 ? this.$options.wheelSpeed : -this.$options.wheelSpeed;

    const scale = +limitFn(this.model.scale + step).toFixed(2);
    // console.log("[mouse zoom on] ", position, scale, delta);
    this.model.zoom(position, scale);
    console.log(scale, this.model.width, this.model.height, this.model);
    this.render();
  }

  render() {
    const { x, y, width, height, img } = this.model;
    if (!img) return;
    const { ctx } = this;
    const { width: WIDTH, height: HEIGHT } = this.$canvas;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(img, x, y, width, height);
  }
}

const imgOptions = {
  x: 0,
  y: 0,
  width: 600,
  height: 375,
  scale: 1
};

// 该类描述了一个可移动的图像模型。
// 该类的x,y,width,height描述了它在外部环境中的位置，尺寸信息
// 它提供了一个zoom方法，可以以指定的位置（该位置必须在它的内部）为原点，对其尺寸进行缩放。
// 为了保持原点位置不变，会同步修改它在外部环境中的坐标，即其x,y属性
class ImageModel {
  constructor(props = {}) {
    const options = { ...imgOptions, ...props };
    this.initialOptions = { ...options };
    this.x = options.x;
    this.y = options.y;
    this.scale = options.scale;
    this.origin = {
      x: options.x,
      y: options.y
    };
    this.width = options.width;
    this.height = options.height;
  }

  static loadImage(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", () => resolve(null));
      img.src = url;
    });
  }

  limitPosition = position => {
    const {
      $canvas: { width, height }
    } = this.initialOptions.parent;
    this.x = limit(width - this.width, 0)(position.x);
    this.y = limit(height - this.height, 0)(position.y);
  };

  limitSize = size => {
    const { width, height } = this.initialOptions;
    return {
      width: limit(width, width * 10)(size.width),
      height: limit(height, height * 10)(size.height)
    };
  };

  // 移动到指定位置
  move(position) {
    // this.x = position.x;
    // this.y = position.y;
    this.limitPosition({
      x: position.x,
      y: position.y
    });
  }

  // 以一个坐标为中心点，缩放至指定倍数
  zoom({ x, y }, scale) {
    this.scale = scale;
    // region 计算新坐标
    // 计算缩放之后的新尺寸
    const { width, height } = this.initialOptions;

    const { width: newWidth, height: newHeight } = this.limitSize({
      width: width * this.scale,
      height: height * this.scale
    });

    // 将外部坐标转换为内部坐标
    this.origin.x = x - this.x;
    this.origin.y = y - this.y;
    // 计算新坐标的偏移量
    // 以放大为例，原点距左侧，距顶部的距离增加，
    // 横轴增加量为（新尺寸下，原点距左侧的距离）-（旧尺寸下，原点距左侧的距离--即缩放前的原点x）
    // 纵轴增加量为（新尺寸下，原点距顶部的距离）-（缩放前的原点y)
    // 缩小同理
    const deltaX = this.origin.x - (this.origin.x / this.width) * newWidth;
    const deltaY = this.origin.y - (this.origin.y / this.height) * newHeight;
    // endregion
    this.width = newWidth;
    this.height = newHeight;
    this.limitPosition({
      x: this.x + deltaX,
      y: this.y + deltaY
    });
    // this.x = this.x + deltaX;
    // this.y = this.y + deltaY;
  }

  putImage(img) {
    this.img = img;
  }
}

// 限制器，用于限制model的坐标，尺寸
class Limiter {
  constructor(props) {}

  limitPosition(position) {}

  limitSize(size) {}
}
