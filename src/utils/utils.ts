/**
 * Utility functions for the Slot Frontend Engine
 */

/**
 * Get a random symbol from the available pool
 * Optionally exclude already used symbols
 * @param symbols - Array of available symbol names
 * @param usedSymbols - Array of symbols to exclude from selection
 * @returns A random symbol name
 */
export function getRandomSymbol(
  symbols: string[],
  usedSymbols: string[] = []
): string {
  const availableSymbols = symbols.filter(
    (symbol) => !usedSymbols.includes(symbol)
  );
  
  if (availableSymbols.length === 0) {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }
  
  const randomIndex = Math.floor(Math.random() * availableSymbols.length);
  return availableSymbols[randomIndex];
}

/**
 * Delay execution of a function
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
