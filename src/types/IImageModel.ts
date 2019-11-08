import IModel from "./IModel";

interface ImgLoadCb {
  (img: HTMLImageElement | null): void;
}

export default interface IImageModel extends IModel {
  $props: { width: number; height: number };
  zoom: (point: { x: number; y: number }, scale: number) => void;
}
// static loadImage: (url: string, cb: ImgLoadCb) => void
