const dftOptions = {
  width: 600,
  height: 375,
  devicePixelRatio: window.devicePixelRatio,
  url: ''
};

export default class Cropper {
  constructor(el, opt = {}) {
	if (!(el instanceof Element)) {
	  el = document.querySelector(el);
	}
	if (!el instanceof Element) throw new Error('el not exist!');
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
	await this.createModel();
	this.render();
  }

  initCanvas() {
	const {width, height, devicePixelRatio} = this.$options;
	const canvas = this.$canvas = document.createElement('canvas');
	const ctx = this.ctx = canvas.getContext('2d');
	canvas.width = width * devicePixelRatio;
	canvas.height = height * devicePixelRatio;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
	this.$el.appendChild(canvas);
  }

  async createModel() {
	const {width, height} = this.$canvas;
	this.image = new ImageModel({
	  width, height, x: 0, y: 0
	});
	const img = await ImageModel.loadImage(this.$options.url);
	if (!img) return;
	console.log('done');
	this.image.putImage(img);
  }

  listenEvents() {
	const el = this.$el;
	listenWheel(el, this.mouseWheel);
	el.addEventListener('mousedown', this.down);
	el.addEventListener('mousemove', this.move);
	el.addEventListener('mouseup', this.up);
	el.addEventListener('mouseleave', this.up);
  }

  down = e => {
	this.isDown = true;
	const point = (e.touches ? e.touches[0] : e);
	this.position.startX = point.clientX;
	this.position.startY = point.clientY;
	this.position.endX = this.image.x;
	this.position.endY = this.image.y;
  };

  move = e => {
	if (!this.isDown) return;
	const point = (e.touches ? e.touches[0] : e);

	this.image.move({
	  x: this.position.endX + point.clientX - this.position.startX,
	  y: this.position.endY + point.clientY - this.position.startY
	});
	this.render();
  };

  up = e => {
	if (!this.isDown) return;
	this.isDown = false;
  };

  mouseWheel = e => {
	e.preventDefault();
	clearTimeout(this.positionTimer);

	const value = e.wheelDelta || -e.deltaY || -e.detail;
	const delta = Math.max(-1, Math.min(1, value));
	const {clientX, clientY} = e;
	if (!this.wrapPosition) {
	  const rect = this.$el.getBoundingClientRect();
	  this.wrapPosition = {
		x: rect.left,
		y: rect.top
	  };
	}
	const position = this.wrapPosition;
	const x = clientX - position.x;
	const y = clientY - position.y;
	this.zoom({x, y}, delta);
	// 节流会导致重排的操作
	this.positionTimer = setTimeout(() => {
	  this.wrapPosition = null;
	}, 200);
  };

  zoom(position, delta) {
	console.log('[mouse zoom on] ', position, delta);
	this.image.zoom(position, delta / 10);
	this.render();
  }

  render() {
	const {x, y, width, height, img} = this.image;
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

class ImageModel {
  constructor(props = {}) {
	const options = {...imgOptions, ...props};
	this.initialOptions = {...options};
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

  move(position) {
	this.x = position.x;
	this.y = position.y;
  }

  zoom(position, step) {
	this.scale += step;
	const {x, y} = this.origin;
	this.origin.x = position.x - this.x;
	this.origin.y = position.y - this.y;
	const {width, height} = this.initialOptions;
	const newWidth = width * this.scale;
	const newHeight = height * this.scale;

	const deltaX = this.origin.x - (this.origin.x / this.width * newWidth);
	const deltaY = this.origin.y - (this.origin.y / this.height * newHeight);

	this.x = this.x + deltaX;
	this.y = this.y + deltaY;

	this.width = newWidth;
	this.height = newHeight;
  }

  putImage(img) {
	this.img = img;
  }

  static loadImage(url) {
	return new Promise(resolve => {
	  const img = new Image();
	  img.addEventListener('load', () => resolve(img));
	  img.addEventListener('error', () => resolve(null));
	  img.src = url;
	});
  }

}

const listenWheel = (el, callback) => {
  if (document.addEventListener) {
	el.addEventListener('mousewheel', callback);
	el.addEventListener('wheel', callback);
	el.addEventListener('DOMMouseScroll', callback);
  }
  else {
	el.attachEvent('onmousewheel', callback); //IE 6/7/8
  }
};
