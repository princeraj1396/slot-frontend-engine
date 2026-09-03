/**
 * Casino Platform Bridge & Aggregator Integration Interface
 * Standardized interface for integrating the slot game into external Remote Gaming Servers (RGS),
 * online casino operator platforms, wallets, and aggregators (EveryMatrix, SoftSwiss, BetConstruct, etc.).
 */

export interface WalletSession {
  playerId: string;
  currency: string;
  currencySymbol: string;
  balance: number;
  sessionToken: string;
  operatorId?: string;
  isDemoMode: boolean;
}

export interface BetRequest {
  roundId: string;
  betAmount: number;
  activeLines: number;
  clientSeed?: string;
  timestamp: number;
}

export interface WinningLineResult {
  lineId: number;
  name: string;
  symbol: string;
  count: number;
  payout: number;
  coords: [number, number][]; // [reel, row]
}

export interface SpinResultData {
  roundId: string;
  matrix: string[][]; // [reel 0..2][row 0..2]
  winningLines: WinningLineResult[];
  totalWin: number;
  isJackpot: boolean;
  jackpotAmount: number;
  winTier: 'none' | 'small' | 'medium' | 'big' | 'mega' | 'jackpot';
  comboMultiplier?: number;
  balanceAfter: number;
  timestamp: number;
  serverSeedHash?: string;
}

export interface GameHistoryItem {
  roundId: string;
  timestamp: number;
  bet: number;
  win: number;
  multiplier: number;
  isJackpot: boolean;
  winningLinesCount: number;
}

export type PlatformEventType =
  | 'GAME_READY'
  | 'BET_PLACED'
  | 'SPIN_STARTED'
  | 'REEL_STOPPED'
  | 'ROUND_FINISHED'
  | 'WIN_CELEBRATION_START'
  | 'WIN_CELEBRATION_END'
  | 'BALANCE_UPDATED'
  | 'JACKPOT_UPDATED'
  | 'ERROR';

export type PlatformEventListener = (eventType: PlatformEventType, data?: unknown) => void;

/**
 * CasinoPlatformBridge - Event-driven communication conduit between game client and casino backend
 */
export class CasinoPlatformBridge {
  private static instance: CasinoPlatformBridge;
  private listeners: Map<PlatformEventType, PlatformEventListener[]> = new Map();
  private session: WalletSession;

  private constructor() {
    this.session = {
      playerId: 'PLAYER_' + Math.floor(1000 + Math.random() * 9000),
      currency: 'USD',
      currencySymbol: '$',
      balance: 1000.0,
      sessionToken: 'tok_' + Math.random().toString(36).substring(2, 15),
      isDemoMode: true,
    };
  }

  public static getInstance(): CasinoPlatformBridge {
    if (!CasinoPlatformBridge.instance) {
      CasinoPlatformBridge.instance = new CasinoPlatformBridge();
    }
    return CasinoPlatformBridge.instance;
  }

  public getSession(): WalletSession {
    return { ...this.session };
  }

  public setSession(session: Partial<WalletSession>): void {
    this.session = { ...this.session, ...session };
    this.emit('BALANCE_UPDATED', { balance: this.session.balance });
  }

  public updateBalance(newBalance: number): void {
    this.session.balance = newBalance;
    this.emit('BALANCE_UPDATED', { balance: this.session.balance });
  }

  public on(eventType: PlatformEventType, listener: PlatformEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
    return () => {
      const arr = this.listeners.get(eventType);
      if (arr) {
        this.listeners.set(
          eventType,
          arr.filter((l) => l !== listener)
        );
      }
    };
  }

  public emit(eventType: PlatformEventType, data?: unknown): void {
    const list = this.listeners.get(eventType);
    if (list) {
      list.forEach((fn) => {
        try {
          fn(eventType, data);
        } catch (e) {
          console.error(`[CasinoPlatformBridge] Error in listener for ${eventType}:`, e);
        }
      });
    }

    // Also dispatch as window message if inside an operator iframe
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          {
            source: 'CASINO_SLOT_GAME',
            type: eventType,
            payload: data,
          },
          '*'
        );
      } catch {
        // Ignore cross-origin postMessage errors in sandbox
      }
    }
  }
}
