// Add helper functions here as needed
export function hexToRgb(hex: string): [number, number, number] {
    const cleanHex = hex.charAt(0) === "#" ? hex.substring(1, 7) : hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
}