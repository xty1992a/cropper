window.requestAnimationFrame =
  window.requestAnimationFrame || (fn => setTimeout(fn, 16));

export const isMobile = (() => {
  var userAgentInfo = navigator.userAgent;
  var Agents = [
    "Android",
    "iPhone",
    "SymbianOS",
    "Windows Phone",
    "iPad",
    "iPod"
  ];
  var flag = true;
  for (var v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      break;
    }
  }
  return !flag;
})();
export const order = ([min, max]) => (min > max ? [max, min] : [min, max]);
export const limit = (min, max) => val => {
  [min, max] = order([min, max]);
  return Math.min(Math.max(val, min), max);
};
export const listenWheel = (el, callback) => {
  ["mousewheel", "wheel", "DOMMouseScroll"].forEach(event =>
    listen(el, event, callback)
  );
};
export const isHit = ({ x, y }, { left, top, right, bottom }) =>
  !(x < left || x > right || y < top || y > bottom);
export const renderBg = el => {
  el.style.cssText += `background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC");`;
};

export const debounce = (fn, time = 100) => {
  let timer = null;
  return function() {
    const context = this;
    let args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, time);
  };
};

export class EmitAble {
  constructor() {
    this._task = {};
  }

  on(event, callback) {
    this._task[event] = callback;
  }

  fire(event, payload) {
    this._task[event] && this._task[event](payload);
  }
}

export const listen = (el, event, callback, flag = false) =>
  el.addEventListener(event, callback, flag);
