declare module 'node-vibrant' {
  interface Swatch {
    hex: string;
    rgb: [number, number, number];
    population: number;
  }

  interface Palette {
    Vibrant?: Swatch;
    Muted?: Swatch;
    DarkVibrant?: Swatch;
    DarkMuted?: Swatch;
    LightVibrant?: Swatch;
    LightMuted?: Swatch;
  }

  export default class Vibrant {
    constructor(src: string);
    getPalette(): Promise<Palette>;
  }
} 