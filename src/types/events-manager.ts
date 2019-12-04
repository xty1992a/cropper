import { AnyObj } from "./index";
import Store from "../helpers/store";
import { EventListener, EmitAble } from "../helpers/utils";

export default interface IEventsManger extends EmitAble {}

export interface EventsManagerProps {
  el: HTMLElement;
  touchable?: boolean;
}
