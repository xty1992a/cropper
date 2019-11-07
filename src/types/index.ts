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
  getCropImage(options: { mime: string; quality: number }): string;

  output(options: OutputType): Promise<string | Blob | Error | undefined>;
}

export type OutputType = {
  mime?: string;
  type?: string;
  quality?: number;
  success?: Function;
  fail?: Function;
};
