/**
 * SlotGameEngine - Formal Casino Frontend Integration Façade
 * Provides standardized life-cycle methods:
 *   - GameEngine.initialize(config)
 *   - GameEngine.start()
 *   - GameEngine.receiveResult(result)
 *   - GameEngine.playAnimation(reelIndex, targetSymbols, isTurbo, onComplete)
 *   - GameEngine.showWin(winData, onComplete)
 *   - GameEngine.reset()
 */

import { SpinResultData, CasinoPlatformBridge } from '../api/CasinoPlatformBridge';
import { MockPlatformServer } from '../api/MockPlatformServer';
import { SoundManager } from './SoundManager';

export interface SlotEngineConfig {
  parentElement?: string | HTMLElement;
  width?: number;
  height?: number;
  isDemo?: boolean;
  initialBalance?: number;
  rgsEndpoint?: string;
}

export type SlotEngineState = 'IDLE' | 'SPINNING' | 'EVALUATING' | 'WIN_CELEBRATION' | 'ERROR';

export class SlotGameEngine {
  private static instance: SlotGameEngine;
  private state: SlotEngineState = 'IDLE';
  private bridge: CasinoPlatformBridge;
  private server: MockPlatformServer;
  private audio: SoundManager;
  private activeScene: any = null; // Reference to Phaser scene
  private currentResult: SpinResultData | null = null;

  private constructor() {
    this.bridge = CasinoPlatformBridge.getInstance();
    this.server = MockPlatformServer.getInstance();
    this.audio = SoundManager.getInstance();
  }

  public static getInstance(): SlotGameEngine {
    if (!SlotGameEngine.instance) {
      SlotGameEngine.instance = new SlotGameEngine();
    }
    return SlotGameEngine.instance;
  }

  public registerScene(scene: any): void {
    this.activeScene = scene;
  }

  public getState(): SlotEngineState {
    return this.state;
  }

  public getCurrentResult(): SpinResultData | null {
    return this.currentResult;
  }

  public getAudio(): SoundManager {
    return this.audio;
  }

  /**
   * Phase 04 Required Hook: GameEngine.initialize(config)
   */
  public initialize(config: SlotEngineConfig = {}): void {
    if (config.initialBalance !== undefined) {
      this.server.setBalance(config.initialBalance);
      this.bridge.updateBalance(config.initialBalance);
    }
    this.state = 'IDLE';
    this.bridge.emit('GAME_READY', { config });
  }

  /**
   * Phase 04 Required Hook: GameEngine.start()
   */
  public start(): void {
    this.state = 'IDLE';
    if (this.activeScene && typeof this.activeScene.resetBoard === 'function') {
      this.activeScene.resetBoard();
    }
  }

  /**
   * Phase 04 Required Hook: GameEngine.receiveResult(result)
   */
  public receiveResult(result: SpinResultData): void {
    this.currentResult = result;
    this.state = 'SPINNING';
  }

  /**
   * Phase 04 Required Hook: GameEngine.playAnimation(reelIndex, targetSymbols, isTurbo, onComplete)
   */
  public playAnimation(
    reelIndex: number,
    targetSymbols: string[],
    isTurbo: boolean,
    onComplete: () => void
  ): void {
    if (this.activeScene && this.activeScene.reels && this.activeScene.reels[reelIndex]) {
      this.activeScene.reels[reelIndex].spin(targetSymbols, () => {
        this.bridge.emit('REEL_STOPPED', { reelIndex });
        onComplete();
      }, isTurbo);
    } else {
      // Fallback
      setTimeout(onComplete, isTurbo ? 200 : 500);
    }
  }

  /**
   * Checks if the win exceeds the threshold for a Big Win celebration
   */
  public checkBigWinThreshold(winData: SpinResultData): boolean {
    return winData.winTier === 'big' || winData.winTier === 'mega' || winData.winTier === 'jackpot';
  }

  /**
   * Phase 04 Required Hook: GameEngine.showWin(winData, onComplete)
   */
  public showWin(winData: SpinResultData, onComplete: () => void): void {
    this.state = 'WIN_CELEBRATION';
    this.bridge.emit('WIN_CELEBRATION_START', winData);

    const isBigWin = this.checkBigWinThreshold(winData);

    if (this.activeScene && this.activeScene.winDisplay && isBigWin) {
      this.activeScene.winDisplay.show(
        winData.totalWin, 
        winData.winTier, 
        winData.comboMultiplier || 1, 
        () => {
          this.state = 'IDLE';
          this.bridge.emit('WIN_CELEBRATION_END', winData);
          onComplete();
      });
    } else {
      setTimeout(() => {
        this.state = 'IDLE';
        this.bridge.emit('WIN_CELEBRATION_END', winData);
        onComplete();
      }, 1500);
    }
  }

  /**
   * Phase 04 Required Hook: GameEngine.reset()
   */
  public reset(): void {
    this.state = 'IDLE';
    this.currentResult = null;
    if (this.activeScene && typeof this.activeScene.clearWinningHighlights === 'function') {
      this.activeScene.clearWinningHighlights();
    }
  }

  /**
   * Request a bet and spin from the authoritative backend/server
   */
  public async requestSpin(betAmount: number): Promise<SpinResultData> {
    this.state = 'SPINNING';
    const roundId = 'RND_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900);
    this.bridge.emit('BET_PLACED', { roundId, betAmount });

    const result = await this.server.executeSpin({
      roundId,
      betAmount,
      activeLines: 5,
      timestamp: Date.now(),
    });

    this.receiveResult(result);
    this.bridge.emit('SPIN_STARTED', { roundId, result });
    return result;
  }
}

// Global export for standard platform aggregator hooks
if (typeof window !== 'undefined') {
  (window as any).SlotGameEngine = SlotGameEngine.getInstance();
}
