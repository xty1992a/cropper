declare class Cropper {
  WIDTH: number;
  HEIGHT: number;
  MODE: string;
  $options: Props;
}

type Props = {
  url: string;
  width: number;
  height: number;
  window?: object;
  wheelSpeed?: number;
  maxRate?: number;
  minRate?: number;
  cropMode?: string;
  maskColor?: string;
  windowResizable?: true;
  windowMoveable?: true;
  devicePixelRatio?: number;
};
