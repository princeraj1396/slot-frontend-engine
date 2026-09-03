/**
 * Casino Engine - Math, Paylines, RNG & Payout Rules
 * Evaluates real slot machine odds, 5 classic paylines, and progressive jackpot
 */

export interface PaylineDef {
  id: number;
  name: string;
  color: number; // Hex color for line rendering
  cssColor: string;
  // [reelIndex, rowIndex] for each step
  coords: [number, number][];
}

export const PAYLINES: PaylineDef[] = [
  {
    id: 1,
    name: 'Top Row',
    color: 0xffd700, // Gold
    cssColor: '#ffd700',
    coords: [[0, 0], [1, 0], [2, 0]],
  },
  {
    id: 2,
    name: 'Center Row',
    color: 0x00f0ff, // Neon Cyan
    cssColor: '#00f0ff',
    coords: [[0, 1], [1, 1], [2, 1]],
  },
  {
    id: 3,
    name: 'Bottom Row',
    color: 0xff3b30, // Coral Red
    cssColor: '#ff3b30',
    coords: [[0, 2], [1, 2], [2, 2]],
  },
  {
    id: 4,
    name: 'Top-Left to Bottom-Right',
    color: 0x34c759, // Emerald Green
    cssColor: '#34c759',
    coords: [[0, 0], [1, 1], [2, 2]],
  },
  {
    id: 5,
    name: 'Bottom-Left to Top-Right',
    color: 0xaf52de, // Royal Purple
    cssColor: '#af52de',
    coords: [[0, 2], [1, 1], [2, 0]],
  },
];

export interface SymbolPayout {
  name: string;
  threeOfAKind: number; // Multiplier of line bet
  twoOfAKind?: number;  // Multiplier of line bet (e.g. cherry)
}

export const SYMBOL_PAYOUTS: Record<string, SymbolPayout> = {
  seven: { name: 'Lucky 7', threeOfAKind: 100 },
  diamond: { name: 'Diamond', threeOfAKind: 50 },
  clover: { name: 'Four-Leaf Clover', threeOfAKind: 25 },
  cherry: { name: 'Cherry', threeOfAKind: 15, twoOfAKind: 3 },
  blueberry: { name: 'Blueberry', threeOfAKind: 10 },
};

// Weighted probabilities for realistic casino hit rate
export const REEL_STRIP: { symbol: string; weight: number }[] = [
  { symbol: 'seven', weight: 8 },
  { symbol: 'diamond', weight: 14 },
  { symbol: 'clover', weight: 20 },
  { symbol: 'cherry', weight: 28 },
  { symbol: 'blueberry', weight: 30 },
];

export interface WinningLine {
  lineDef: PaylineDef;
  symbol: string;
  count: number;
  payout: number;
  coords: [number, number][];
}

export interface SpinEvaluation {
  matrix: string[][]; // [reel][row]
  winningLines: WinningLine[];
  totalWin: number;
  isJackpot: boolean;
  jackpotAmount: number;
  winTier: 'none' | 'small' | 'medium' | 'big' | 'mega' | 'jackpot';
}

export class CasinoEngine {
  private static instance: CasinoEngine;
  private jackpot: number = 52450.0;
  private readonly totalWeight: number;

  private constructor() {
    const savedJackpot = localStorage.getItem('casino_jackpot');
    if (savedJackpot) {
      this.jackpot = parseFloat(savedJackpot) || 52450.0;
    }
    this.totalWeight = REEL_STRIP.reduce((acc, item) => acc + item.weight, 0);
  }

  public static getInstance(): CasinoEngine {
    if (!CasinoEngine.instance) {
      CasinoEngine.instance = new CasinoEngine();
    }
    return CasinoEngine.instance;
  }

  public getJackpot(): number {
    return this.jackpot;
  }

  public addJackpotContribution(totalBet: number): number {
    // 0.5% of each bet contributes to the progressive jackpot
    this.jackpot += totalBet * 0.005;
    localStorage.setItem('casino_jackpot', this.jackpot.toFixed(2));
    return this.jackpot;
  }

  public resetJackpot(): void {
    this.jackpot = 50000.0;
    localStorage.setItem('casino_jackpot', this.jackpot.toFixed(2));
  }

  /**
   * Pick random symbol using casino reel strip weights
   */
  public getRandomWeightedSymbol(): string {
    let rnd = Math.random() * this.totalWeight;
    for (const item of REEL_STRIP) {
      if (rnd < item.weight) {
        return item.symbol;
      }
      rnd -= item.weight;
    }
    return 'blueberry';
  }

  /**
   * Generate an outcome matrix of 3 reels x 3 rows
   */
  public generateSpinOutcome(totalBet: number): SpinEvaluation {
    const matrix: string[][] = [];
    for (let reel = 0; reel < 3; reel++) {
      matrix[reel] = [];
      for (let row = 0; row < 3; row++) {
        matrix[reel][row] = this.getRandomWeightedSymbol();
      }
    }

    return this.evaluateMatrix(matrix, totalBet);
  }

  /**
   * Evaluate a given 3x3 matrix against all 5 paylines
   */
  public evaluateMatrix(matrix: string[][], totalBet: number): SpinEvaluation {
    const lineBet = Math.max(1, Math.floor(totalBet / PAYLINES.length));
    const winningLines: WinningLine[] = [];
    let totalWin = 0;
    let isJackpot = false;

    PAYLINES.forEach((line) => {
      const [r0, row0] = line.coords[0];
      const [r1, row1] = line.coords[1];
      const [r2, row2] = line.coords[2];

      const sym0 = matrix[r0][row0];
      const sym1 = matrix[r1][row1];
      const sym2 = matrix[r2][row2];

      const payoutRules = SYMBOL_PAYOUTS[sym0];

      if (sym0 === sym1 && sym1 === sym2) {
        // 3 of a kind!
        const multiplier = payoutRules.threeOfAKind;
        const lineWin = lineBet * multiplier;
        totalWin += lineWin;

        // Check if lucky 7 jackpot hit on line 2 (center) or any line!
        if (sym0 === 'seven' && line.id === 2) {
          isJackpot = true;
        }

        winningLines.push({
          lineDef: line,
          symbol: sym0,
          count: 3,
          payout: lineWin,
          coords: line.coords,
        });
      } else if (sym0 === 'cherry' && sym1 === 'cherry') {
        // 2 of a kind for cherry
        const lineWin = lineBet * (SYMBOL_PAYOUTS.cherry.twoOfAKind || 3);
        totalWin += lineWin;
        winningLines.push({
          lineDef: line,
          symbol: 'cherry',
          count: 2,
          payout: lineWin,
          coords: [line.coords[0], line.coords[1]],
        });
      }
    });

    let currentJackpotAmount = 0;
    if (isJackpot) {
      currentJackpotAmount = this.jackpot;
      totalWin += currentJackpotAmount;
      this.resetJackpot();
    }

    // Determine win tier based on multiplier of total bet
    let winTier: SpinEvaluation['winTier'] = 'none';
    if (isJackpot) {
      winTier = 'jackpot';
    } else if (totalWin > 0) {
      const ratio = totalWin / totalBet;
      if (ratio >= 40) {
        winTier = 'mega';
      } else if (ratio >= 15) {
        winTier = 'big';
      } else if (ratio >= 5) {
        winTier = 'medium';
      } else {
        winTier = 'small';
      }
    }

    return {
      matrix,
      winningLines,
      totalWin,
      isJackpot,
      jackpotAmount: currentJackpotAmount,
      winTier,
    };
  }
}
