import IRect from "./IRect";

export default interface IModel {
  rect: IRect;
  x: number;
  y: number;
  width: number;
  height: number;
  moveable: boolean;
  resizeable: boolean;

  start: () => void;
  commit: () => void;
  move: (point: { x: number; y: number }) => void;
  moveTo: (point: { x: number; y: number }) => void;
  getOffsetBy: (
    model: IModel
  ) => { x: number; y: number; width: number; height: number };
}
