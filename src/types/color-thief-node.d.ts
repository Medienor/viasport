declare module 'color-thief-node' {
  export function getColorFromURL(imageUrl: string): Promise<[number, number, number]>;
  export function getPaletteFromURL(imageUrl: string, colorCount?: number): Promise<[number, number, number][]>;
} 