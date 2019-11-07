export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  top: number;
  left: number;
}

export interface ICropper {
  // 截图输出API
  getCropImage(options: { mime: string; quality: number }): string;

  // 对上面的包装
  output(options: OutputType): string | Blob | Error;

  // 移动到指定位置，可能受截图模式限制
  moveTo(x: number, y: number): void;

  // 以某个坐标为中心，基于现有比例进行缩放，可能受缩放限制以及截图模式限制
  zoom(origin: { x: number; y: number }, direction: number): void;
}

export type OutputType = {
  mime?: string;
  type?: string;
  quality?: number;
};
