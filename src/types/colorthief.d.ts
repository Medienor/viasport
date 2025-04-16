declare module 'colorthief' {
  export default class ColorThief {
    getColor: (img: HTMLImageElement | null) => [number, number, number];
    getPalette: (img: HTMLImageElement | null, colorCount?: number) => [number, number, number][];
  }
} 