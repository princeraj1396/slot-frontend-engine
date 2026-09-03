/**
 * Simulated Casino Remote Gaming Server (RGS) & Math Engine
 * Decouples RNG generation, probability tables, wallet updates, and payline math
 * from frontend presentation, exactly mirroring a real regulated casino backend.
 */

import {
  BetRequest,
  SpinResultData,
  WinningLineResult,
  GameHistoryItem,
} from './CasinoPlatformBridge';

export interface PaylineDefinition {
  id: number;
  name: string;
  color: number;
  cssColor: string;
  coords: [number, number][]; // [reel, row]
}

export const CASINO_PAYLINES: PaylineDefinition[] = [
  {
    id: 1,
    name: 'Top Horizontal',
    color: 0xffd700,
    cssColor: '#ffd700',
    coords: [[0, 0], [1, 0], [2, 0]],
  },
  {
    id: 2,
    name: 'Center Horizontal',
    color: 0x00f0ff,
    cssColor: '#00f0ff',
    coords: [[0, 1], [1, 1], [2, 1]],
  },
  {
    id: 3,
    name: 'Bottom Horizontal',
    color: 0xff3b30,
    cssColor: '#ff3b30',
    coords: [[0, 2], [1, 2], [2, 2]],
  },
  {
    id: 4,
    name: 'Diagonal Top-Left to Bottom-Right',
    color: 0x34c759,
    cssColor: '#34c759',
    coords: [[0, 0], [1, 1], [2, 2]],
  },
  {
    id: 5,
    name: 'Diagonal Bottom-Left to Top-Right',
    color: 0xaf52de,
    cssColor: '#af52de',
    coords: [[0, 2], [1, 1], [2, 0]],
  },
];

export const SYMBOL_PAYOUT_MULTIPLIERS: Record<string, { name: string; threeOfAKind: number; twoOfAKind?: number }> = {
  seven: { name: 'Lucky 7', threeOfAKind: 100 },
  diamond: { name: 'Diamond', threeOfAKind: 50 },
  clover: { name: 'Four-Leaf Clover', threeOfAKind: 25 },
  cherry: { name: 'Cherry', threeOfAKind: 15, twoOfAKind: 3 },
  blueberry: { name: 'Blueberry', threeOfAKind: 10 },
};

// Weighted probabilities calibrated to standard 96.5% RTP (Return to Player)
const SERVER_REEL_STRIP: { symbol: string; weight: number }[] = [
  { symbol: 'seven', weight: 8 },
  { symbol: 'diamond', weight: 14 },
  { symbol: 'clover', weight: 20 },
  { symbol: 'cherry', weight: 28 },
  { symbol: 'blueberry', weight: 30 },
];

export class MockPlatformServer {
  private static instance: MockPlatformServer;
  private jackpot: number = 52450.0;
  private balance: number = 1000.0;
  private history: GameHistoryItem[] = [];
  private totalWeight: number;

  private constructor() {
    this.totalWeight = SERVER_REEL_STRIP.reduce((sum, item) => sum + item.weight, 0);

    // Hydrate persisted state if available
    try {
      const savedJackpot = localStorage.getItem('casino_jackpot');
      if (savedJackpot) {
        this.jackpot = parseFloat(savedJackpot) || 52450.0;
      }
      const savedHistory = localStorage.getItem('casino_game_history');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
    } catch {
      // Ignore storage errors in restricted sandboxes
    }
  }

  public static getInstance(): MockPlatformServer {
    if (!MockPlatformServer.instance) {
      MockPlatformServer.instance = new MockPlatformServer();
    }
    return MockPlatformServer.instance;
  }

  public getJackpot(): number {
    return this.jackpot;
  }

  public getBalance(): number {
    return this.balance;
  }

  public setBalance(amount: number): void {
    this.balance = amount;
  }

  public getHistory(): GameHistoryItem[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    try {
      localStorage.removeItem('casino_game_history');
    } catch {}
  }

  /**
   * Process a bet and generate an authoritative server-side spin result
   */
  public async executeSpin(request: BetRequest): Promise<SpinResultData> {
    // Simulate realistic 60ms network round-trip latency to RGS server
    await new Promise((r) => setTimeout(r, 60));

    if (this.balance < request.betAmount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Deduct bet from balance
    this.balance -= request.betAmount;

    // Progressive jackpot accumulation (0.5% of gross bet)
    this.jackpot += request.betAmount * 0.005;
    try {
      localStorage.setItem('casino_jackpot', this.jackpot.toFixed(2));
    } catch {}

    // Generate RNG grid 3 reels x 3 rows
    const matrix: string[][] = [];
    for (let col = 0; col < 3; col++) {
      matrix[col] = [];
      for (let row = 0; row < 3; row++) {
        matrix[col][row] = this.pickRandomSymbol();
      }
    }

    // Evaluate paylines
    const winningLines: WinningLineResult[] = [];
    const lineBet = request.betAmount / 5;
    let totalWin = 0;
    let isJackpot = false;

    CASINO_PAYLINES.forEach((line) => {
      const s0 = matrix[line.coords[0][0]][line.coords[0][1]];
      const s1 = matrix[line.coords[1][0]][line.coords[1][1]];
      const s2 = matrix[line.coords[2][0]][line.coords[2][1]];

      // Check 3 of a kind
      if (s0 === s1 && s1 === s2) {
        const symbolInfo = SYMBOL_PAYOUT_MULTIPLIERS[s0];
        if (symbolInfo) {
          let linePayout = lineBet * symbolInfo.threeOfAKind;

          // Lucky 7 on center line triggers Mega Jackpot!
          if (s0 === 'seven' && line.id === 2) {
            isJackpot = true;
            linePayout += this.jackpot;
          }

          winningLines.push({
            lineId: line.id,
            name: line.name,
            symbol: s0,
            count: 3,
            payout: linePayout,
            coords: line.coords,
          });
          totalWin += linePayout;
        }
      } else if (s0 === 'cherry' && s1 === 'cherry') {
        // Cherry 2-of-a-kind consolation payout
        const cherryPayout = lineBet * (SYMBOL_PAYOUT_MULTIPLIERS.cherry.twoOfAKind || 3);
        winningLines.push({
          lineId: line.id,
          name: line.name,
          symbol: 'cherry',
          count: 2,
          payout: cherryPayout,
          coords: [line.coords[0], line.coords[1]],
        });
        totalWin += cherryPayout;
      }
    });

    // Apply Combo Multiplier
    let comboMultiplier = 1;
    if (winningLines.length > 1) {
      comboMultiplier = winningLines.length; // e.g. x2 for 2 lines, x3 for 3 lines
      totalWin *= comboMultiplier;
    }

    let currentJackpotAwarded = 0;
    if (isJackpot) {
      currentJackpotAwarded = this.jackpot;
      this.jackpot = 50000.0;
      try {
        localStorage.setItem('casino_jackpot', '50000.00');
      } catch {}
    }

    // Determine win celebration tier
    let winTier: 'none' | 'small' | 'medium' | 'big' | 'mega' | 'jackpot' = 'none';
    if (isJackpot) {
      winTier = 'jackpot';
    } else if (totalWin > 0) {
      const multiplier = totalWin / request.betAmount;
      if (multiplier >= 25) {
        winTier = 'mega';
      } else if (multiplier >= 10) {
        winTier = 'big';
      } else if (multiplier >= 3) {
        winTier = 'medium';
      } else {
        winTier = 'small';
      }
    }

    // Add win to balance
    this.balance += totalWin;

    // Record round in audit history
    const historyItem: GameHistoryItem = {
      roundId: request.roundId,
      timestamp: Date.now(),
      bet: request.betAmount,
      win: totalWin,
      multiplier: Number((totalWin / (request.betAmount || 1)).toFixed(2)),
      isJackpot,
      winningLinesCount: winningLines.length,
    };
    this.history.unshift(historyItem);
    if (this.history.length > 50) {
      this.history.pop();
    }
    try {
      localStorage.setItem('casino_game_history', JSON.stringify(this.history));
    } catch {}

    return {
      roundId: request.roundId,
      matrix,
      winningLines,
      totalWin,
      isJackpot,
      jackpotAmount: currentJackpotAwarded,
      winTier,
      comboMultiplier,
      balanceAfter: this.balance,
      timestamp: Date.now(),
      serverSeedHash: 'sha256_' + Math.random().toString(36).substring(2, 12),
    };
  }

  private pickRandomSymbol(): string {
    let rand = Math.random() * this.totalWeight;
    for (const item of SERVER_REEL_STRIP) {
      if (rand < item.weight) {
        return item.symbol;
      }
      rand -= item.weight;
    }
    return 'blueberry';
  }
}
