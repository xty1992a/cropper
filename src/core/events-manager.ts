import {
  EmitAble,
  isMobile,
  getDistanceBetween,
  getCenterBetween,
  limit,
  listenWheel
} from "../helpers/utils";
import IEventsManger, { EventsManagerProps } from "../types/events-manager";
import Store from "../helpers/store";

type Events = {
  [prop: string]: keyof GlobalEventHandlersEventMap;
};

const dftOptions = {
  el: document.body,
  touchable: true
};

const EVENTS: Events = {
  down: isMobile ? "touchstart" : "mousedown",
  move: isMobile ? "touchmove" : "mousemove",
  up: isMobile ? "touchend" : "mouseup"
};

export default class EventsManager extends EmitAble implements IEventsManger {
  protected $props: EventsManagerProps;
  protected $store: Store;
  protected positionTimer: number;
  protected isDown: boolean;
  protected isMove: boolean;
  protected isUp: boolean;
  protected __db_check_timer__: number;
  protected wrapBoundingRect: { x: number; y: number };
  protected state: {
    startX: number;
    startY: number;
    startDistance: number;
    origin: { x: number; y: number };
  };

  constructor(props: EventsManagerProps) {
    super();
    this.$props = { ...dftOptions, ...(props || {}) };
    this.handlerEvents();
  }

  protected handlerEvents() {
    this.$props.el.addEventListener(EVENTS.down, this.onDown);
    this.$props.el.addEventListener(EVENTS.move, this.onMove);
    this.$props.el.addEventListener(EVENTS.up, this.onUp);
    listenWheel(this.$props.el, this.onMouseWheel);
  }

  protected restoreState() {
    this.state = {
      startDistance: 0,
      startX: 0,
      startY: 0,
      origin: {
        x: 0,
        y: 0
      }
    };
  }

  protected onDown = (e: MouseEvent & TouchEvent) => {
    e.preventDefault();
    this.isDown = true;
    this.isMove = false;
    this.restoreState();
    if (e.touches && e.touches.length > 1) {
      const A = this.getEventPoint(e.touches[0]);
      const B = this.getEventPoint(e.touches[1]);
      this.state.origin = getCenterBetween(A, B);
      this.state.startDistance = getDistanceBetween(A, B);
      return;
    }
    const point = e.touches ? e.touches[0] : e;
    const { x, y } = this.getEventPoint(point);
    this.state.startX = point.clientX;
    this.state.startY = point.clientY;
    this.fire("point-down", { x, y });
  };
  protected onMove = (e: MouseEvent & TouchEvent) => {
    const point = e.touches ? e.touches[0] : e;
    const { x, y } = this.getEventPoint(point);
    !this.isDown && this.fire("mouse-move", { x, y });
    if (!this.isDown) return;
    this.isMove = true;
    e.preventDefault();
    if (e.touches && e.touches.length > 1) {
      return this.onTouchZoom(e);
    }
    const {
      state: { startX, startY }
    } = this;
    const deltaX = point.clientX - startX;
    const deltaY = point.clientY - startY;
    this.fire("point-move", { deltaX, deltaY });
  };
  protected onUp = (e: MouseEvent & TouchEvent) => {
    this.isDown = false;
    e.preventDefault();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const { x, y } = this.getEventPoint(point);
    const fmt = (x: number) => Math.abs(x) / (x * -1);

    if (this.isUp) {
      this.fire("db-click", { x, y });
      this.isUp = false;
      clearTimeout(this.__db_check_timer__);
      return;
    }
    this.isUp = true;

    this.__db_check_timer__ = window.setTimeout(
      () => {
        this.isUp = false;
        this.fire("point-up", {
          x,
          y,
          directionX: fmt(x - this.state.startX),
          directionY: fmt(y - this.state.startY)
        });
      },
      this.isMove ? 0 : 300
    );
  };
  protected onMouseWheel = (e: MouseWheelEvent) => {
    e.preventDefault();
    const direction = limit(-1, 1)(e.deltaY || e.detail);
    const origin = this.getEventPoint(e);
    this.fire("zoom", { origin, direction });
  };
  protected onTouchZoom = (e: TouchEvent) => {
    const A = this.getEventPoint(e.touches[0]);
    const B = this.getEventPoint(e.touches[1]);
    const distance = getDistanceBetween(A, B);
    const deltaDistance = distance - this.state.startDistance;
    const direction = limit(-1, 1)(deltaDistance);
    this.fire("zoom", { origin: this.state.origin, direction });
  };

  // 将鼠标/触摸点坐标转换为canvas内部坐标
  protected getEventPoint({
    clientX,
    clientY
  }: {
    clientX: number;
    clientY: number;
  }) {
    // 节流慢操作
    clearTimeout(this.positionTimer);
    if (!this.wrapBoundingRect) {
      const rect = this.$props.el.getBoundingClientRect();
      this.wrapBoundingRect = {
        x: rect.left,
        y: rect.top
      };
    }
    const position = this.wrapBoundingRect;
    const x = clientX - position.x;
    const y = clientY - position.y;
    this.positionTimer = window.setTimeout(() => {
      this.wrapBoundingRect = null;
    }, 200);
    return { x, y };
  }
}
