interface listener<K extends keyof HTMLElementEventMap> {
  (this: HTMLElement, ev: HTMLElementEventMap[K]): any;
}

export const isMobile: boolean = (() =>
  /(android)|(iphone)|(symbianos)|(windows phone)|(ipad)|(ipod)/i.test(
    navigator.userAgent
  ))();
// 保证输出为[小,大]
export const order = ([min, max]: number[]) =>
  min > max ? [max, min] : [min, max];

// 返回一个函数,用于将输入限制在预先存入的值之间
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

export const copy = (o: any) => JSON.parse(JSON.stringify(o));

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

// 检查point是否在rect内部
export const isHit = (
  { x, y }: point,
  { left, top, right, bottom }: rect
): boolean => !(x < left || x > right || y < top || y > bottom);

// 画个格子背景
export const renderBg = (el: HTMLElement): void => {
  el.style.cssText += `background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC");`;
};

// 防抖
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

export interface EventListener {
  (payload?: any): any;
}

// 一个简单的事件订阅基类
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

  off(event: string, callback: EventListener) {
    const task = this._task[event] || [];
    this._task[event] = task.filter(cb => cb !== callback);
  }

  clear(event: string) {
    this._task[event] = null;
  }
}

export const listen = <K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  callback: listener<K>,
  flag?: boolean | AddEventListenerOptions
) => el.addEventListener(event, callback, flag);

// 将base64格式图片转为blob
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

type Point = {
  x: number;
  y: number;
};

// 计算两坐标的距离
export const getDistanceBetween = (A: Point, B: Point): number =>
  Math.sqrt((A.x - B.x) ** 2 + (A.y - B.y) ** 2);
// 计算两坐标连线中点坐标
export const getCenterBetween = (A: Point, B: Point): Point => ({
  x: A.x + (B.x - A.x) / 2,
  y: A.y + (B.y - A.y) / 2
});

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
