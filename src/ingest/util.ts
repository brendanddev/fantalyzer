// Sleeper splits points into whole and hundredths parts (595 + 68 = 595.68).
export function combinePoints(whole: number, decimal: number): number {
    return decimal / 100 + whole;
}
