import './index.less'
import {isMobile} from './dom.js'

// 允许类绑定回调
class EmitAble {
  task = {};

  on(event, callback) {
	this.task[event] = callback
  }

  fire(event, payload) {
	this.task[event] && this.task[event](payload)
  }
}

const defaultOptions = {};

// region helper
const createImage = (url, opt) => new Promise(resolve => {
  let img = document.createElement('img');
  img.src = url;
  img.addEventListener('load', function () {
	resolve(img);
  });
  img.addEventListener('error', function () {
	resolve(null);
  });
});

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

const removeWheel = (el, callback) => {
  if (el.addEventListener) {
	el.removeEventListener('mousewheel', callback);
	el.removeEventListener('wheel', callback);
	el.removeEventListener('DOMMouseScroll', callback);
  }
  else {
	el.detachEvent('onmousewheel', callback);
  }
};
// endregion

export default class Cropper extends EmitAble {
  $el = null; // 容器
  imageOptions = {
	scale: 1,
	origin: {
	  x: 0, y: 0,
	},
	oldOrigin: {
	  x: 0, y: 0,
	},
	left: 0,
	top: 0,
  };

  constructor(el, opt) {

	super();
	this.$el = el;
	el.classList.add('cropper-bg');
	this.$options = {...defaultOptions, ...opt};
	this._mount();
	this._initManager();
  }

  async _mount() {
	let {height, width} = this.$options;
	if (!height || !width) {
	  this.$options.height = height = this.$el.clientHeight;
	  this.$options.width = width = this.$el.clientWidth;
	}

	let cvs = this.$canvas = document.createElement('canvas');
	this.imageOptions.height = cvs.height = height;
	this.imageOptions.width = cvs.width = width;
	// this.imageOptions.left = width / 2;
	// this.imageOptions.top = height / 2;
	this.$el.appendChild(cvs);
  }

  _initManager() {
	this.$imageManager = new ImageManager(this);
	if (isMobile) {
	  this.$eventManager = new TouchManager(this);
	}
	else {
	  this.$eventManager = new MouseManager(this);
	}

	this.$eventManager.on('move', this.move);
	this.$eventManager.on('scale', this.scale)
  }

  move = pos => {
	this.imageOptions.left = pos.x;
	this.imageOptions.top = pos.y;
	// this.imageOptions.origin.x = pos.x;
	// this.imageOptions.origin.y = pos.y;
	// this.imageOptions.origin = null;
	// this.$imageManager.setOrigin(pos);
	this.$imageManager.drawImage();
  };

  scale = payload => {
	let {scale, x, y} = payload;
	this.imageOptions.origin = {x, y};
	this.imageOptions.scale = scale;
	// this.imageOptions.oldOrigin = {x, y};

	this.$imageManager.drawImage();
  };

}

class ImageManager extends EmitAble {
  constructor(parent) {
	super();
	this.$parent = parent;
	this.cvs = parent.$canvas;
	this.ctx = this.cvs.getContext('2d');
	this.createImage();
  }

  async createImage() {
	this.img = await createImage(this.$parent.$options.url);
	// this.ctx.translate(this.cvs.width / 2, this.cvs.height / 2);
	this.drawImage();
  }

  drawImage() {
	let {ctx, cvs} = this;
	let {width: pWidth, height: pHeight} = cvs;
	let {width, height, left, top, scale, origin} = this.$parent.imageOptions;

	ctx.clearRect(0, 0, pWidth, pHeight);
	ctx.fillStyle = 'rgba(0,0,0,0.4)';
	ctx.fillRect(0, 0, pWidth, pHeight);

	ctx.save();
	ctx.translate(left, top);
	ctx.drawImage(this.img, 0, 0, width * scale, height * scale);
	ctx.restore();
  }

}

class TouchManager extends EmitAble {
  constructor(opt) {
	super()
  }
}

class MouseManager extends EmitAble {
  scale = 1;
  endX = 0;
  endY = 0;

  constructor(parent) {
	super();
	this.$parent = parent;
	this.$el = parent.$el;
	this.bindListen();
  }

  bindListen() {
	this.$el.addEventListener('mousedown', this.down);
	this.$el.addEventListener('mousemove', this.move);
	this.$el.addEventListener('mouseup', this.up);
	this.$el.addEventListener('mouseleave', this.up);

	listenWheel(this.$el, this.mouseWheel)
  }

  unBindListen() {
	this.$el.removeEventListener('mousedown', this.down);
	this.$el.removeEventListener('mousemove', this.move);
	this.$el.removeEventListener('mouseup', this.up);
	this.$el.removeEventListener('mouseleave', this.up);
  }

  down = e => {
	this.isDown = true;
	this.startX = e.clientX;
	this.startY = e.clientY;
  };

  move = e => {
	if (!this.isDown) return;
	let deltaX = e.clientX - this.startX;
	let deltaY = e.clientY - this.startY;
	this.nowX = this.endX + deltaX;
	this.nowY = this.endY + deltaY;
	this.fire('move', {
	  x: this.nowX,
	  y: this.nowY,
	});
  };

  up = e => {
	this.isDown = false;
	this.endX = this.nowX;
	this.endY = this.nowY;
  };

  mouseWheel = e => {
	e.preventDefault();
	let value = e.wheelDelta || -e.deltaY || -e.detail,
		delta = Math.max(-1, Math.min(1, value));
	let scale = this.scale;
	if (delta < 0) {
	  scale = Math.max(scale - .1, 0.1);
	}
	else {
	  scale = Math.min(scale + .1, 10);
	}
	this.scale = scale = parseFloat(scale.toFixed(2));
	let {clientX, clientY} = e;
	let rect = this.$parent.$el.getBoundingClientRect();

	this.fire('scale', {
	  scale,
	  x: clientX - rect.left,
	  y: clientY - rect.top,
	});
  }

}


