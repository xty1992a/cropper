// @ts-ignore-next-line
window.requestAnimationFrame =
  window.requestAnimationFrame || (fn => setTimeout(fn, 16));

interface listener<K extends keyof HTMLElementEventMap> {
  (this: HTMLElement, ev: HTMLElementEventMap[K]): any;
}

export const isMobile: boolean = (() => {
  const userAgentInfo = navigator.userAgent;
  const Agents = [
    "Android",
    "iPhone",
    "SymbianOS",
    "Windows Phone",
    "iPad",
    "iPod"
  ];
  let flag = true;
  for (let v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      break;
    }
  }
  return !flag;
})();
export const order = ([min, max]: number[]) =>
  min > max ? [max, min] : [min, max];
export const limit = (min: number, max: number) => (val: number) => {
  [min, max] = order([min, max]);
  return Math.min(Math.max(val, min), max);
};
export const listenWheel = <K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  callback: listener<K>
) => {
  ["mousewheel", "wheel", "DOMMouseScroll"].forEach((event: K) =>
    listen(el, event, callback)
  );
};

type point = {
  x: number;
  y: number;
  [prop: string]: any;
};

type rect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  [prop: string]: any;
};

export const isHit = (
  { x, y }: point,
  { left, top, right, bottom }: rect
): boolean => !(x < left || x > right || y < top || y > bottom);
export const renderBg = (el: HTMLElement): void => {
  el.style.cssText += `background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC");`;
};

export const debounce = (fn: Function, time: number = 100) => {
  let timer: number = 0;
  return function() {
    const context = this;
    let args = arguments;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(context, args);
    }, time);
  };
};

type TaskContainer = {
  [prop: string]: task;
};

type task = EventListener[];

interface EventListener {
  (payload?: any): any;
}

export class EmitAble {
  protected _task: TaskContainer;

  constructor() {
    this._task = {};
  }

  on(event: string, callback: EventListener) {
    this._task[event] = this._task[event] || [];
    this._task[event].push(callback);
  }

  fire(event: string, payload?: any) {
    const task = this._task[event] || [];
    task.forEach(callback => callback(payload));
  }
}

export const listen = <K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  callback: listener<K>,
  flag?: boolean | AddEventListenerOptions
) => el.addEventListener(event, callback, flag);

export function dataURLtoBlob(dataUrl: string) {
  let arr = dataUrl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bStr = atob(arr[1]),
    n = bStr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bStr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

type RectProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
};

export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;

  constructor(props: RectProps) {
    Object.assign(this, props);
  }

  get top() {
    return this.y;
  }

  get left() {
    return this.x;
  }

  get bottom() {
    return this.y + this.height;
  }

  get right() {
    return this.x + this.width;
  }
}
