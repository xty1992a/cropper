import {
  debounce,
  EmitAble,
  isHit,
  limit,
  listen,
  listenWheel,
  renderBg,
  dataURLtoBlob
} from "./utils";

const dftOptions = {
  url: "", // 截图链接
  width: 600, // 容器尺寸
  height: 375, // 容器尺寸
  window: null, // 截图框的rect对象截图框被限制在容器内设置超出部分无效
  wheelSpeed: 0.05, // 放大步长
  maxRate: 10, // 图片最大放大倍数
  minRate: 0.5, // 图片最小缩小倍数
  cropMode: "cover", //  截图模式,cover表示不留白边拖动时也无法拖出
  maskColor: "rgba(0,0,0,0.6)", // 蒙层颜色
  windowResizable: true,
  windowMoveable: true,
  devicePixelRatio: window.devicePixelRatio || 1 // dpr
};

const outputOptions = {
  mime: "image/png",
  type: "base64",
  quality: 1,
  success: () => {},
  fail: () => {}
};

/*
 * cropMode将有以下类型
 * cover, 容器即截图框,图片只能在容器内部移动,图片最小只能缩小到容器的最长边.
 * contain, 容器即截图框,图片移动,缩放不限制
 * window, 显示截图框,截图框的移动限制在图片内(图片的缩放移动也受截图框的限制)
 * free-window,显示截图框,截图框的移动不受限制
 * */
/*
 * 具体实现
 * 首先明确几个角色 ---- window是截图框,limiter是限制器
 * window可在容器内移动,缩放,在特定模式下,它将与限制器保持同步.
 * limiter用于限制图片的缩放移动,图片在任何情况下,都无法超过限制器.它的值允许更改
 * 模式分析
 * cover模式实际上就是设置了一个尺寸与容器一致的限制器,window;window不可移动
 * -----contain模式是一个始终跟随图片的限制器,它的尺寸始终比图片大一倍,window尺寸与容器一致,不可移动
 * window是一个限制器与截图框保持同步联动的策略.移动,缩放window,将同步修改limiter.
 * free-window即在contain的基础上,添加了一个window.
 * */

export default class Cropper extends EmitAble {
  constructor(el, opt = {}) {
    super();
    if (!(el instanceof Element)) {
      el = document.querySelector(el);
    }
    if (!el instanceof Element) throw new Error("el not exist!");
    this.$el = el;
    this.$options = { ...dftOptions, ...opt };
    this.MODE = this.$options.cropMode;
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

  init() {
    this.initCanvas();
    this.listenEvents();
    this.createModel(this.$options.url, () => {
      this.createLimiter();
      this.model.limiter = this.limiter;
      this.render();
      console.log("fire ready");
      setTimeout(() => {
        this.fire("ready");
      }, 20);
    });
  }

  initCanvas() {
    const { width, height, devicePixelRatio } = this.$options;
    const canvas = (this.$canvas = document.createElement("canvas"));
    const ctx = (this.ctx = canvas.getContext("2d"));
    this.WIDTH = canvas.width = width * devicePixelRatio;
    this.HEIGHT = canvas.height = height * devicePixelRatio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    this.$el.appendChild(canvas);
    renderBg(canvas);
  }

  createModel(url, cb) {
    ImageModel.loadImage(url, img => {
      if (!img) throw new Error("image load failed! url %s is invalid!", url);
      this.model = new ImageModel({
        ...this.computeModelOptions(img),
        parent: this
      });
      this.model.putImage(img);
      cb && cb();
    });
  }

  fmtWindow() {
    const {
      WIDTH,
      HEIGHT,
      MODE,
      $options: { maxRate, width, height, devicePixelRatio }
    } = this;
    let window = this.$options.window;
    if (window) {
      window.x = limit(0, width)(window.x || 0);
      window.y = limit(0, height)(window.y || 0);
      window.width = limit(0, width - window.x)(window.width);
      window.height = limit(0, height - window.y)(window.height);
    } else {
      window = {
        x: 0,
        y: 0,
        width,
        height
      };
    }

    return {
      ...window,
      maxRate,
      WIDTH,
      HEIGHT,
      devicePixelRatio
    };
  }

  /*
    * cover模式实际上就是设置了一个尺寸与容器一致的限制器,window;window不可移动
	------* contain模式是一个始终跟随图片的限制器,它的尺寸始终比图片大一倍,window尺寸与容器一致,不可移动
	* window是一个限制器与截图框保持同步联动的策略.移动,缩放window,将同步修改limiter.
	* free-window即在contain的基础上,添加了一个window.
 */
  createLimiter() {
    const {
      MODE,
      $options: { width, height }
    } = this;
    const windowOptions = this.fmtWindow();
    this.windowMoveable = windowOptions.moveable =
      ["window", "free-window"].includes(MODE) && this.$options.windowMoveable;
    this.windowResizable = windowOptions.resizable =
      ["window", "free-window"].includes(MODE) && this.$options.windowResizable;
    const limiterOptions = { ...windowOptions };
    switch (MODE) {
      case "cover":
        windowOptions.x = windowOptions.y = limiterOptions.x = limiterOptions.y = 0;
        windowOptions.width = limiterOptions.width = width;
        windowOptions.height = limiterOptions.height = height;
        break;
      case "contain":
        windowOptions.x = windowOptions.y = 0;
        windowOptions.width = width;
        windowOptions.height = height;
        limiterOptions.free = true;
        break;
      case "window":
        break;
      case "free-window":
        limiterOptions.x = limiterOptions.y = 0;
        limiterOptions.width = width;
        limiterOptions.height = height;
        limiterOptions.free = true;
        windowOptions.free = true;
        break;
    }
    this.limiter = new Limiter(limiterOptions);
    this.window = new Limiter(windowOptions);

    this.window.modelX = this.limiter.modelX = this.model.x;
    this.window.modelY = this.limiter.modelY = this.model.y;
    this.window.modelWidth = this.limiter.modelWidth = this.model.width;
    this.window.modelHeight = this.limiter.modelHeight = this.model.height;

    console.log(this.window);
    if (MODE === "contain") {
      this.model.on("change", model => {
        this.limiter.x = model.x;
        this.limiter.y = model.y;
        this.limiter.width = model.width;
        this.limiter.height = model.height;
      });
    }
    // window模式,限制框与截图框同步
    if (MODE === "window") {
      this.window.on("change", changes => {
        Object.keys(changes).forEach(key => (this.limiter[key] = changes[key]));
      });
    }
  }

  // 计算图片初始位置
  computeModelOptions({ width, height }) {
    const { WIDTH, HEIGHT, MODE } = this;
    // js计算有误差,简单取整
    const imgRatio = (width / height).toFixed(4);
    const RATIO = (WIDTH / HEIGHT).toFixed(4);
    // 占满容器
    let result = { x: 0, y: 0, width: WIDTH, height: HEIGHT };

    // 高度与容器相等
    const fill_height = {
      width: HEIGHT * imgRatio,
      height: HEIGHT,
      x: (WIDTH - HEIGHT * imgRatio) / 2
    };

    // 宽度与容器相等
    const fill_width = {
      width: WIDTH,
      height: WIDTH / imgRatio,
      y: (HEIGHT - WIDTH / imgRatio) / 2
    };

    // 当图片比例与容器不一致时，按照合适的方式布局图片
    if (RATIO !== imgRatio) {
      // 容器宽度不足,顶住高度
      if (RATIO < imgRatio) {
        result = fill_height;
      }
      // 容器高度不足,顶住宽度
      else {
        result = fill_width;
      }
    }

    // contain模式应该顶住短边,正好反转
    if (["contain"].includes(MODE)) {
      result =
        result === fill_height
          ? fill_width
          : result === fill_width
          ? fill_height
          : result;
    }
    return result;
  }

  listenEvents() {
    const el = this.$canvas;
    listenWheel(el, this.mouseWheel);
    listen(el, "mousedown", this.down);
    listen(el, "mousemove", this.move);
    listen(el, "mouseup", this.up);
    listen(el, "mouseleave", this.up);
  }

  hitResizeRect(point) {
    if (!this.windowResizable) return null;
    const { resizeRect } = this.window;
    return resizeRect.find(it => isHit(point, it)) || null;
  }

  // region DOM事件
  down = e => {
    if (!this.model) return;
    this.isDown = true;
    const point = e.touches ? e.touches[0] : e;

    const { x, y } = this.getEventPoint(point);
    this.isHitWindow = isHit({ x, y }, this.window.rect);
    this.position.startX = point.clientX;
    this.position.startY = point.clientY;
    const resizeRect = (this.resizeRect = this.hitResizeRect({ x, y }));

    if (resizeRect) {
      this.position.endX = resizeRect.x + resizeRect.size / 2;
      this.position.endY = resizeRect.y + resizeRect.size / 2;
      return;
    }
    let model = this.model;

    if (this.isHitWindow && this.window.moveable) {
      model = this.window;
    }
    this.position.endX = model.x;
    this.position.endY = model.y;
  };

  move = e => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    const resizeRect =
      this.hitResizeRect(this.getEventPoint({ clientX, clientY })) ||
      this.resizeRect;
    this.$canvas.style.cursor = resizeRect ? resizeRect.cursor : "";
    if (!this.model) return;
    if (!this.isDown) return;
    const {
      position: { startX, startY, endX, endY },
      $options: { devicePixelRatio: dpr }
    } = this;
    const deltaX = (clientX - startX) * dpr;
    const deltaY = (clientY - startY) * dpr;

    let model = this.model;
    this.window.modelX = this.limiter.modelX = this.model.x;
    this.window.modelY = this.limiter.modelY = this.model.y;
    if (!this.resizeRect) {
      if (this.isHitWindow && this.window.moveable) {
        model = this.window;
      }

      model.move({
        x: endX + deltaX,
        y: endY + deltaY
      });
    } else {
      this.window.resize(
        {
          x: endX + deltaX,
          y: endY + deltaY
        },
        this.resizeRect
      );
    }

    this.render();
  };

  up = () => {
    if (!this.model) return;
    if (!this.isDown) return;
    this.resizeRect = null;
    this.isDown = false;
  };

  mouseWheel = e => {
    e.preventDefault();
    const delta = limit(-1, 1)(e.wheelDelta || -e.deltaY || -e.detail);
    const { x, y } = this.getEventPoint(e);
    this.window.modelWidth = this.limiter.modelWidth = this.model.width;
    this.window.modelHeight = this.limiter.modelHeight = this.model.height;
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
    const limitFn = limit(this.$options.minRate, this.$options.maxRate);
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

  // region 绘制
  render() {
    // requestAnimationFrame可以将回调放到浏览器渲染帧(相对空闲)时调用
    requestAnimationFrame(() => {
      const { ctx, WIDTH, HEIGHT } = this;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // 先绘制抠除窗口的蒙层,再将图像绘制到蒙层底部
      ctx.save();
      this.renderWindow();
      ctx.globalCompositeOperation = "destination-over";
      this.renderModel();
      ctx.restore();
      setTimeout(() => {
        // 派发事件到外部,数据是model的尺寸以及与相对于截图框的位移
        this.fire("change", {
          x: (this.model.x - this.window.x) / this.$options.devicePixelRatio,
          y: (this.model.y - this.window.y) / this.$options.devicePixelRatio,
          height: this.model.height / this.$options.devicePixelRatio,
          width: this.model.width / this.$options.devicePixelRatio
        });
      });
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

  // 绘制一个空心的蒙层
  renderWindow() {
    const {
      ctx,
      WIDTH,
      HEIGHT,
      $options: { maskColor },
      window: { x, y, height, width, resizable, resizeRect, rect, splitLine }
    } = this;

    // console.log(' window : %s %s \n limiter: %s %s', this.window.x, this.window.y, this.limiter.x, this.limiter.y);
    ctx.save();
    ctx.fillStyle = maskColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, width, height);
    ctx.restore();
    if (resizable) {
      ctx.save();
      ctx.fillStyle = "#39f";
      ctx.lineWidth = 1 * this.$options.devicePixelRatio;
      ctx.strokeStyle = "#39f";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(rect.right, y);
      ctx.lineTo(rect.right, rect.bottom);
      ctx.lineTo(rect.left, rect.bottom);
      ctx.closePath();
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = "#fff";

      splitLine.forEach(list => {
        ctx.beginPath();
        ctx.moveTo(list[0].x, list[0].y);
        ctx.lineTo(list[1].x, list[1].y);
        ctx.stroke();
      });
      ctx.restore();
      resizeRect.forEach(rect => {
        ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      });
      ctx.restore();
    }
  }

  // endregion

  getCropImage = ({ mime, quality }) => {
    const {
      model,
      window: { x, y, width, height }
    } = this;
    const canvas =
      this.outputCanvas ||
      (this.outputCanvas = document.createElement("canvas"));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      model.img,
      model.x - x,
      model.y - y,
      model.width,
      model.height
    );
    return canvas.toDataURL(mime, quality);
  };

  // 库本身不打包Promise
  output = options => {
    return new window.Promise((resolve, reject) => {
      try {
        options = { ...outputOptions, ...options };
        let data = this.getCropImage(options);
        if (options.type === "blob") {
          data = dataURLtoBlob(data);
        }
        options.success(data);
        resolve(data);
      } catch (e) {
        options.fail(e);
        reject(e);
      }
    });
  };
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
class ImageModel extends EmitAble {
  constructor(props = {}) {
    super();
    const options = { ...imgOptions, ...props };
    this.initialOptions = { ...options };
    this.limiter = options.limiter;
    this.x = options.x;
    this.y = options.y;
    this.scale = options.scale;
    this.width = options.width;
    this.height = options.height;
  }

  static loadImage(url, cb) {
    const img = new Image();
    listen(img, "load", () => cb(img));
    listen(img, "error", () => cb(null));
    img.src = url;
  }

  // 移动到指定位置
  move(position) {
    position = this.limiter.limitPosition(position);
    this.x = position.x;
    this.y = position.y;
    this.fire("change", {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });
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
    // console.log(newWidth, width * scale, width);

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
    this.width = newWidth;
    this.height = newHeight;
    this.x = position.x;
    this.y = position.y;
    this.fire("change", {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });
  }

  putImage(img) {
    this.img = img;
  }
}

// 限制器，用于限制model的坐标，尺寸
class Limiter extends EmitAble {
  constructor(props) {
    super();
    const dpr = (this.dpr = props.devicePixelRatio);
    this.FREE = Boolean(props.free);
    this.moveable = props.moveable;
    this.resizable = props.resizable;
    this.WIDTH = props.WIDTH;
    this.HEIGHT = props.HEIGHT;
    this.x = props.x * dpr;
    this.y = props.y * dpr;
    this.width = props.width * dpr;
    this.height = props.height * dpr;
    this.resizeSize = (props.resizeSize || 5) * dpr;
    this.resizeColor = props.resizeColor || "#39f";
    // console.log(props.width, props.devicePixelRatio);
  }

  get maxWidth() {
    return this.width * this.dpr;
  }

  get maxHeight() {
    return this.height * this.dpr;
  }

  // 动态BoundingRect
  get rect() {
    return computeRect(this);
  }

  get resizeRect() {
    const {
      rect: { top, left, right, bottom },
      resizeSize,
      x,
      y
    } = this;
    const size = resizeSize / 2;
    const m_w = left + this.width / 2;
    const m_h = top + this.height / 2;
    /*
     * [0]--[1]--[2]
     * |				  |
     * [7]			 [3]
     * |				  |
     * [6]--[5]--[4]
     *
     * */
    return [
      { cursor: "nwse", x: left - size, y: top - size },
      { cursor: "ns", x: m_w - size, y: top - size },
      { cursor: "nesw", x: right - size, y: top - size },
      { cursor: "ew", x: right - size, y: m_h - size },
      { cursor: "nwse", x: right - size, y: bottom - size },
      { cursor: "ns", x: m_w - size, y: bottom - size },
      { cursor: "nesw", x: left - size, y: bottom - size },
      { cursor: "ew", x: left - size, y: m_h - size }
    ].map((it, index) => ({
      parentX: x,
      parentY: y,
      ...it,
      index,
      size: resizeSize,
      cursor: it.cursor + "-resize",
      ...computeRect({ ...it, width: resizeSize, height: resizeSize })
    }));
  }

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

  get minX() {
    const { WIDTH, HEIGHT, FREE, moveable } = this;
  }

  move({ x, y }) {
    const {
      WIDTH,
      HEIGHT,
      FREE,
      moveable,
      modelX,
      modelY,
      modelWidth,
      modelHeight
    } = this;
    // console.log(width, modelWidth);
    if (!moveable) return;
    const minX = FREE ? 0 : Math.max(0, modelX);
    const minY = FREE ? 0 : Math.max(0, modelY);
    const maxX = FREE
      ? WIDTH - this.width
      : Math.min(WIDTH - this.width, modelWidth + modelX - this.width);
    const maxY = FREE
      ? HEIGHT - this.height
      : Math.min(HEIGHT - this.height, modelHeight + modelY - this.height);
    this.x = limit(minX, maxX)(x);
    this.y = limit(minY, maxY)(y);

    this.fire("change", { x: this.x, y: this.y });
  }

  resize({ x, y }, rect) {
    const deltaH = y - this.y;
    const deltaW = x - this.x;

    switch (rect.index) {
      case 0:
        this.height -= deltaH;
        this.y = y;
        this.width -= deltaW;
        this.x = x;
        break;
      case 1:
        this.height -= deltaH;
        this.y = y;
        break;
      case 2:
        this.y = y;
        this.height -= deltaH;
        this.width += x - this.rect.right;
        break;
      case 3:
        this.width += x - this.rect.right;
        break;
      case 4:
        this.width += x - this.rect.right;
        this.height += y - this.rect.bottom;
        break;
      case 5:
        this.height += y - this.rect.bottom;
        break;
      case 6:
        this.height += y - this.rect.bottom;
        this.width -= deltaW;
        this.x = x;
        break;
      case 7:
        this.width -= deltaW;
        this.x = x;
        break;
    }
    this.fire("change", {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });
  }

  limitPosition(rect) {
    const { width, height, x, y, FREE } = this;
    return {
      x: FREE ? rect.x : limit(width - rect.width + x, x)(rect.x),
      y: FREE ? rect.y : limit(y - rect.height + height, y)(rect.y)
    };
  }

  limitSize(size) {
    const ratio = (size.width / size.height).toFixed(4);
    const { width, height, maxHeight, maxWidth, FREE } = this;
    let w = limit(width, maxWidth)(size.width);
    let h = limit(height, maxHeight)(size.height);

    // console.log(size.width, w, width, height, maxWidth);
    // 进入受限范围,按比例重新计算尺寸
    const imgRatio = (w / h).toFixed(4);
    if (ratio !== (w / h).toFixed(4)) {
      if (ratio > imgRatio) {
        console.log("larger then image");
        w = h * ratio;
      } else {
        h = w / ratio;
      }
    }
    return {
      width: FREE ? size.width : w,
      height: FREE ? size.height : h
    };
  }
}

const computeRect = ({ x, y, width, height }) => ({
  top: y,
  left: x,
  right: x + width,
  bottom: y + height
});
