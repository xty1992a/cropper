const dftOptions = {
  width: 600,
  height: 375,
  devicePixelRatio: window.devicePixelRatio,
  url: "",
  wheelSpeed: 0.05,
  maxRate: 10,
  minRate: 0.5,
  limitRect: null,
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
    this.$options = {...dftOptions, ...opt};
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
    const {width, height, devicePixelRatio} = this.$options;
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
    this.createLimiter();
    this.model = new ImageModel({
      ...this.computeModelOptions(img),
      limiter: this.limiter,
      parent: this
    });
    this.model.putImage(img);
  }

  createLimiter() {
    const {
      $options: {maxRate, limitRect, width, height, devicePixelRatio},
    } = this;

    if (limitRect) {
      limitRect.x = limit(0, width)(limitRect.x);
      limitRect.y = limit(0, height)(limitRect.y);
      limitRect.width = limit(0, limitRect.width - limitRect.x)(limitRect.width);
      limitRect.height = limit(0, limitRect.height - limitRect.y)(limitRect.width);
    }

    const options = {
      x: 0, y: 0,
      width,
      height,
      devicePixelRatio,
      ...(limitRect || {})
    };

    options.maxWidth = maxRate * options.width;
    options.maxHeight = maxRate * options.height;

    this.limiter = new Limiter(options);
  }

  computeModelOptions({width, height}) {
    const {width: WIDTH, height: HEIGHT} = this.$canvas;
    const imgRatio = width / height;
    const RATIO = WIDTH / HEIGHT;
    let result;
    console.log(RATIO, imgRatio);
    // 当图片比例与容器不一致时，按照合适的方式布局图片
    if (RATIO === imgRatio) {
      result = {x: 0, y: 0, width: WIDTH, height: HEIGHT};
    } else if (RATIO < imgRatio) {
      console.log("宽超出");
      result = {
        width: HEIGHT * imgRatio,
        height: HEIGHT,
        x: (WIDTH - HEIGHT * imgRatio) / 2
      };
    } else {
      console.log("高超出");
      result = {
        width: WIDTH,
        height: WIDTH / imgRatio,
        y: (HEIGHT - WIDTH / imgRatio) / 2
      };
    }
    return result;

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
    const {clientX, clientY} = e.touches ? e.touches[0] : e;
    const {
      position: {startX, startY, endX, endY},
      $options: {devicePixelRatio: dpr}
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
    const {clientX, clientY} = e;
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
    this.zoom({x, y}, delta);
    // 节流会导致重排的操作
    this.positionTimer = setTimeout(() => {
      this.wrapPosition = null;
    }, 200);
  };

  zoom(position, delta) {
    const limitFn = limit(1, 10);

    const step = this.$options.wheelSpeed * -delta;
    const scale = +limitFn(this.model.scale + step).toFixed(2);
    // console.log("[mouse zoom on] ", position, scale, delta);
    this.model.zoom(position, scale);
    console.log("scale [%s], width [%s], height [%s], x [%s], y [%s]", scale, this.model.width, this.model.height, this.model.x, this.model.y);
    this.render();
  }

  render() {
    const {x, y, width, height, img} = this.model;
    if (!img) return;
    const {ctx} = this;
    const {width: WIDTH, height: HEIGHT} = this.$canvas;
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
    const options = {...imgOptions, ...props};
    this.initialOptions = {...options};
    this.limiter = options.limiter;
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
    return this.limiter.limitPosition({...position, width: this.width, height: this.height});
    /*  const {
        $canvas: {width, height}
      } = this.initialOptions.parent;
      return {
        x: limit(width - this.width, 0)(position.x),
        y: limit(height - this.height, 0)(position.y)
      };*/
  };

  limitSize = size => {
    return this.limiter.limitSize(size);
    /*const {width, height} = this.limiter;
    return {
      width: limit(width, width * 10)(size.width),
      height: limit(height, height * 10)(size.height)
    };*/
  };

  // 移动到指定位置
  move(position) {
    position = this.limitPosition(position);
    this.x = position.x;
    this.y = position.y;
  }

  // 以一个坐标为中心点，缩放至指定倍数
  zoom({x, y}, scale) {
    this.scale = scale;
    // region 计算新坐标
    // 计算缩放之后的新尺寸
    const {width, height} = this.initialOptions;

    const {width: newWidth, height: newHeight} = this.limitSize({
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
    const position = this.limitPosition({
      x: this.x + deltaX,
      y: this.y + deltaY
    });
    this.x = position.x;
    this.y = position.y;
  }

  putImage(img) {
    this.img = img;
  }
}

// 限制器，用于限制model的坐标，尺寸
class Limiter {
  constructor(props) {
    this.maxWidth = props.maxWidth * props.devicePixelRatio;
    this.maxHeight = props.maxHeight * props.devicePixelRatio;
    this.x = props.x * props.devicePixelRatio;
    this.y = props.y * props.devicePixelRatio;
    this.width = props.width * props.devicePixelRatio;
    this.height = props.height * props.devicePixelRatio;

    console.log(props);
  }

  limitPosition(rect) {
    const {width, height, x, y} = this;

    return {
      x: limit(width - rect.width + x, x)(rect.x),
      y: limit(y - height, y)(rect.y)
    };
  }

  limitSize(size) {
    const ratio = (size.width / size.height).toFixed(4);
    const {width, height, maxHeight, maxWidth} = this;
    let w = limit(width, maxWidth)(size.width);
    let h = limit(height, maxHeight)(size.height);
    if (ratio !== (w / h).toFixed(4)) {
      w = h * ratio;
    }
    return {
      width: w,
      height: h
    };
  }
}

const order = ([min, max]) => min > max ? [max, min] : [min, max];