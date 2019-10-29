import './index.less'
import {isMobile} from './dom.js'
// region helper
const createImage = (url, opt = {}) => new Promise(resolve => {
  let img = document.createElement('img');
  img.src = url;
  if (opt.width && opt.height) {
	img.style.width = opt.width + 'px';
	img.style.height = opt.height + 'px';
  }
  img.addEventListener('load', function () {
	resolve(img);
  });
  img.addEventListener('error', function () {
	resolve(null);
  });
});
const ranger = (val, min, max) => Math.min(Math.max(min, val), max);
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
// 事件基类
class EmitAble {
  constructor() {
	this.task = {};
  }

  on(event, callback) {
	this.task[event] = callback;
  }

  fire(event, payload) {
	this.task[event] && this.task[event](payload);
  }

  off(event) {
	this.task[event] = null;
  }
}

const defaultOptions = {
  ratioRanger: '1,20',
  url: '',
};

export default class Cropper extends EmitAble {
  ratio = 1;
  scale = 1;
  width = 0;
  height = 0;
  point = {
	x: 0,
	y: 0,
  };

  get showStyle() {
	let {x, y} = this.offset;
	let width = this.width / this.ratio;
	let height = this.height / this.ratio;
	let oX = x / this.width * width;
	let oY = y / this.height * height;
	/*	return {
		  width: this.width + 'px',
		  height: this.height + 'px',
		  backgroundImage: `url(${this.$options.url})`,
		  backgroundPosition: `-${oX}px -${oY}px`,
		  backgroundSize: `${width}px ${height}px`,
		  transform: `scale(${this.scale})`,
		}*/

	return `
		width: ${this.width}px;
		height: ${this.height}px;
		background-image: url(${this.$options.url});
		background-position: -${oX}px -${oY}px;
		background-size: ${width}px ${height}px;
		background-repeat: no-repeat;
		transform: scale(${this.scale});
	`
  }

  get offset() {
	let {x, y} = this.point;
	let {height, width} = this.halfCell;
	// 使鼠标居于黄色窗口正中
	x -= width;
	y -= height;
	x = ranger(x, 0, this.width * (1 - this.ratio));
	y = ranger(y, 0, this.height * (1 - this.ratio));
	return {x, y}
  }

  get halfCell() {
	let width = this.width * this.ratio * 0.5;
	let height = this.height * this.ratio * 0.5;
	return {width, height}
  }

  constructor(el, opt) {
	super();
	this.$el = el;
	el.classList.add('cropper-bg');
	this.$options = {...defaultOptions, ...opt};
	this.width = el.clientWidth;
	this.height = el.clientHeight;

	this._mount();
	this._listen();

	this.cvs.style.cssText = this.showStyle;

  }

  _mount() {
	let cvs = this.cvs = document.createElement('canvas');
	this.ctx = cvs.getContext('2d');
	cvs.width = this.width;
	cvs.height = this.height;
	cvs.style.width = '100%';
	cvs.style.height = '100%';
	this.$el.appendChild(cvs)
  }

  _listen() {
	this.$el.addEventListener('mousedown', this.down);
	this.$el.addEventListener('mousemove', this.move);
	this.$el.addEventListener('mouseup', this.up);
	this.$el.addEventListener('mousewheel', this.wheelHandler);
	this.$el.addEventListener('DOMMouseScroll', this.wheelHandler);
  }

  down = e => {
	this.isDown = true;
  };
  move = e => {
	// if (!this.isDown) return;
	this.point = {
	  x: e.offsetX,
	  y: e.offsetY,
	};
	this.cvs.style.cssText = this.showStyle;
  };
  up = e => {
	if (!this.isDown) return;
	this.isDown = false;
  };

  wheelHandler = e => {
	e.preventDefault();
	// firefox使用detail:下3上-3,其他浏览器使用wheelDelta:下-120上120//下滚
	let delta = -e.wheelDelta || e.detail;
	let [min, max] = this.$options.ratioRanger.split(',');
	min = Math.max(0.1, min / 10);
	max = Math.min(1, max / 10);
	let ratio = this.ratio;
	if (delta > 0) {
	  ratio += 0.1;
	}
	if (delta < 0) {
	  ratio -= 0.1;
	}
	this.ratio = +ranger(ratio, min, max).toFixed(2); //Math.min(Math.max(0.1, ratio), 0.9)

	this.cvs.style.cssText = this.showStyle;
  }
}
