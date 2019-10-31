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
  if (document.addEventListener) {
    el.addEventListener("mousewheel", callback);
    el.addEventListener("wheel", callback);
    el.addEventListener("DOMMouseScroll", callback);
  } else {
    el.attachEvent("onmousewheel", callback); //IE 6/7/8
  }
};
export const isHit = ({ x, y }, { left, top, right, bottom }) =>
  !(x < left || x > right || y < top || y > bottom);
export const renderBg = el => {
  el.style.cssText = `background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC");`;
};

window.requestAnimationFrame =
  window.requestAnimationFrame || (fn => setTimeout(fn, 16));
