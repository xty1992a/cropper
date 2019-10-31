import { renderBg, limit, order, isHit, listenWheel, isMobile } from "./utils";

const dftOptions = {
  width: 600,
  height: 375,
  devicePixelRatio: window.devicePixelRatio || 1,
  url: "",
  wheelSpeed: 0.05,
  maxRate: 10,
  minRate: 0.5,
  limitRect: null,
  cropMode: "cover" // 截图模式,cover表示不留白边,拖动时,也无法拖出
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
    this.createLimiter();
    await this.createModel(this.$options.url);
    this.render();
  }

  initCanvas() {
    const { width, height, devicePixelRatio } = this.$options;
    const canvas = (this.$canvas = document.createElement("canvas"));
    const ctx = (this.ctx = canvas.getContext("2d"));
    this.WIDTH = canvas.width = width * devicePixelRatio;
    this.HEIGHT = canvas.height = height * devicePixelRatio;
    console.log(this.WIDTH, this.HEIGHT);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.mozImageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = true;
    this.$el.appendChild(canvas);
    renderBg(canvas);
  }

  async createModel(url) {
    const img = await ImageModel.loadImage(url);
    if (!img) throw new Error("image load failed! url %s is invalid!", url);
    this.model = new ImageModel({
      ...this.computeModelOptions(img),
      limiter: this.limiter,
      parent: this
    });
    this.model.putImage(img);
  }

  createLimiter() {
    const {
      $options: { maxRate, limitRect, width, height, devicePixelRatio }
    } = this;

    if (limitRect) {
      limitRect.x = limit(0, width)(limitRect.x);
      limitRect.y = limit(0, height)(limitRect.y);
      limitRect.width = limit(0, width - limitRect.x)(limitRect.width);
      limitRect.height = limit(0, height - limitRect.y)(limitRect.height);
    }

    const options = {
      x: 0,
      y: 0,
      width,
      height,
      devicePixelRatio,
      ...(limitRect || {})
    };

    options.maxWidth = maxRate * options.width;
    options.maxHeight = maxRate * options.height;

    this.limiter = new Limiter(options);
  }

  // 计算图片初始位置
  computeModelOptions({ width, height }) {
    const { WIDTH, HEIGHT } = this;
    const imgRatio = width / height;
    const RATIO = WIDTH / HEIGHT;
    let result;
    // 当图片比例与容器不一致时，按照合适的方式布局图片
    if (RATIO === imgRatio) {
      result = { x: 0, y: 0, width: WIDTH, height: HEIGHT };
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

  // region DOM事件
  down = e => {
    this.isDown = true;
    const point = e.touches ? e.touches[0] : e;

    const { x, y } = this.getEventPoint(point);
    this.isHitLimiter = isHit({ x, y }, this.limiter.rect);
    this.position.startX = point.clientX;
    this.position.startY = point.clientY;

    let model = this.model;

    if (this.isHitLimiter) {
      model = this.limiter;
    }
    this.position.endX = model.x;
    this.position.endY = model.y;
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

    let model = this.model;

    if (this.isHitLimiter) {
      model = this.limiter;
    }

    model.move({
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
    const delta = limit(-1, 1)(e.wheelDelta || -e.deltaY || -e.detail);
    const { x, y } = this.getEventPoint(e);
    this.zoom({ x, y }, delta);
  };
  // endregion

  // 将鼠标落点转换为canvas坐标
  getEventPoint({ clientX, clientY }) {
    // 节流慢操作
    clearTimeout(this.positionTimer);
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
    this.positionTimer = setTimeout(() => {
      this.wrapPosition = null;
    }, 200);
    return { x, y };
  }

  // 以一个坐标为中心,缩放图像
  zoom(point, delta) {
    const limitFn = limit(0.5, 10);
    const step = this.$options.wheelSpeed * -delta;
    const scale = +limitFn(this.model.scale + step).toFixed(2);
    // console.log("[mouse zoom on] ", position, scale, delta);
    this.model.zoom(point, scale);
    console.log(
      "scale [%s], width [%s], height [%s], x [%s], y [%s]",
      scale,
      this.model.width,
      this.model.height,
      this.model.x,
      this.model.y
    );
    this.render();
  }

  render() {
    // requestAnimationFrame可以将回调放到浏览器渲染帧(相对空闲)时调用
    requestAnimationFrame(() => {
      const { ctx, WIDTH, HEIGHT } = this;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // 方案1.先绘制图像,绘制蒙层,抠出限制器,再次绘制图像
      // this.renderModel();
      // this.renderLimiter();

      // 方案2.先绘制抠除窗口的蒙层,再将图像绘制到蒙层底部
      // 如果合成操作性能消耗不大的话,理论上性能应该更优
      ctx.save();
      this.renderWindow();
      ctx.globalCompositeOperation = "destination-over";
      this.renderModel();
      ctx.restore();
    });
  }

  // 绘制图像
  // 在此前需要更新model的属性
  renderModel() {
    const { x, y, width, height, img } = this.model;
    if (!img) return;
    const { ctx } = this;
    ctx.drawImage(img, x, y, width, height);
  }

  // 绘制截图框
  // 截图框即限制器
  // 这里的方案是多次绘制
  // 在此前已经绘制了图像,
  // 再次绘制一个覆盖整个canvas的蒙层,
  // 然后将限制器的轮廓抠出,
  // 再次绘制图像,只有被抠出的图像会被绘制.
  // 则形成了截图框内清晰,截图框外蒙层的效果
  // 可以看出,这种方式绘制了两次图像,性能上是有问题的.
  renderLimiter() {
    const {
      ctx,
      limiter: { x, y, height, width },
      WIDTH,
      HEIGHT
    } = this;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.rect(x, y, width, height);
    ctx.clip();
    this.renderModel();

    ctx.restore();
  }

  // 绘制一个空心的蒙层
  renderWindow() {
    const {
      ctx,
      limiter: { x, y, height, width },
      WIDTH,
      HEIGHT
    } = this;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, width, height);
    ctx.restore();
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

  // 移动到指定位置
  move(position) {
    position = this.limiter.limitPosition({
      ...position,
      width: this.width,
      height: this.height
    });
    this.x = position.x;
    this.y = position.y;
  }

  // 以一个坐标为中心点，缩放至指定倍数
  zoom({ x, y }, scale) {
    // region 计算新坐标
    // 计算缩放之后的新尺寸
    const { width, height } = this.initialOptions;

    // 用限制器重新计算受限尺寸
    const { width: newWidth, height: newHeight } = this.limiter.limitSize({
      width: width * scale,
      height: height * scale
    });

    // 将外部坐标转换为内部坐标
    const origin = { x: x - this.x, y: y - this.y };

    // 计算新坐标的偏移量
    // 以放大为例，原点距左侧，距顶部的距离增加，
    // 横轴增加量为（新尺寸下，原点距左侧的距离）-（旧尺寸下，原点距左侧的距离--即缩放前的原点x）
    // 纵轴增加量为（新尺寸下，原点距顶部的距离）-（缩放前的原点y)
    // 缩小同理
    const deltaX = origin.x - (origin.x / this.width) * newWidth;
    const deltaY = origin.y - (origin.y / this.height) * newHeight;
    // endregion
    const position = this.limiter.limitPosition({
      x: this.x + deltaX,
      y: this.y + deltaY,
      width: newWidth,
      height: newHeight
    });

    // 尺寸被限制之后,与入参scale脱钩,这里重新计算scale
    this.scale = newHeight / height;
    this.origin = origin;
    this.width = newWidth;
    this.height = newHeight;
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
  }

  // 动态BoundingRect
  get rect() {
    const { x, y, width, height } = this;
    return {
      top: y,
      left: x,
      right: x + width,
      bottom: y + height
    };
  }

  move({ x, y }) {
    this.x = x;
    this.y = y;
  }

  limitPosition(rect) {
    const { width, height, x, y } = this;
    return {
      x: limit(width - rect.width + x, x)(rect.x),
      y: limit(y - rect.height + height, y)(rect.y)
    };
  }

  limitSize(size) {
    const ratio = (size.width / size.height).toFixed(4);
    const { width, height, maxHeight, maxWidth } = this;
    let w = limit(width, maxWidth)(size.width);
    let h = limit(height, maxHeight)(size.height);
    // 进入受限范围,按比例重新计算尺寸
    if (ratio !== (w / h).toFixed(4)) {
      w = h * ratio;
    }
    return {
      width: w,
      height: h
    };
  }
}
