import Phaser from 'phaser';
import { getRandomSymbol } from '../utils/utils';
import { symbolConfig } from '../config/assets';
import { ROW_COUNT, SYMBOL_SIZE } from '../config/constants';
import { SoundManager } from '../game-engine/SoundManager';

/**
 * Reel Component - Manages individual reel animations, physics and symbol rendering
 */
export class Reel {
  private scene: Phaser.Scene;
  private symbols: Phaser.GameObjects.Sprite[] = [];
  private reelIndex: number;
  private isSpinning: boolean = false;
  private initialPositions: { x: number; y: number }[] = [];
  private highlightBoxes: Phaser.GameObjects.Graphics[] = [];
  private soundManager: SoundManager;

  constructor(
    scene: Phaser.Scene,
    reelIndex: number,
    startX: number,
    startY: number,
    container: Phaser.GameObjects.Container,
    initialSymbols?: string[]
  ) {
    this.scene = scene;
    this.reelIndex = reelIndex;
    this.soundManager = SoundManager.getInstance();
    this.initializeReel(startX, startY, container, initialSymbols);
  }

  /**
   * Initialize reel with symbols
   */
  private initializeReel(
    startX: number,
    startY: number,
    container: Phaser.GameObjects.Container,
    initialSymbols?: string[]
  ): void {
    const spacingY = 320;
    const usedSymbols: string[] = [];

    for (let j = 0; j < ROW_COUNT; j++) {
      const symbolName =
        initialSymbols && initialSymbols[j]
          ? initialSymbols[j]
          : getRandomSymbol(Object.keys(symbolConfig), usedSymbols);
      usedSymbols.push(symbolName);

      const x = startX;
      const y = startY + j * spacingY;

      const symbol = this.scene.add.sprite(x, y, symbolName);
      symbol.setDisplaySize(SYMBOL_SIZE, SYMBOL_SIZE);
      symbol.setAlpha(1);
      symbol.setDepth(1);

      // Add blur post/preFX if supported
      try {
        const blurEffect = symbol.preFX?.addBlur(2, 0, 0, 0);
        symbol.setData('blurEffect', blurEffect);
      } catch {
        // Fallback for environments without preFX
      }

      this.initialPositions.push({ x, y });
      container.add(symbol);
      this.symbols.push(symbol);

      // Create golden highlight box for win effects
      const box = this.scene.add.graphics();
      box.lineStyle(4, 0xffd700, 1);
      box.strokeRoundedRect(x - SYMBOL_SIZE / 2 - 2, y - SYMBOL_SIZE / 2 - 2, SYMBOL_SIZE + 4, SYMBOL_SIZE + 4, 14);
      box.setVisible(false);
      box.setDepth(5);
      container.add(box);
      this.highlightBoxes.push(box);
    }
  }

  /**
   * Spin the reel with animation
   * @param targetSymbols - Specific symbols to land on [top, mid, bot]
   * @param onComplete - Callback when spin completes
   * @param isTurbo - Quick spin mode
   */
  public spin(
    targetSymbols: string[] | undefined,
    onComplete: () => void,
    isTurbo: boolean = false
  ): void {
    if (this.isSpinning) return;
    this.isSpinning = true;

    // Hide any lingering highlight boxes
    this.highlightBoxes.forEach((box) => box.setVisible(false));

    this.spinSymbols(targetSymbols, onComplete, isTurbo);
  }

  /**
   * Execute spinning animation for all symbols in reel
   */
  private spinSymbols(
    targetSymbols: string[] | undefined,
    onComplete: () => void,
    isTurbo: boolean
  ): void {
    const symbolsToShow = isTurbo ? 14 : 24;
    const spinDelay = isTurbo ? 18 : 26;
    const finalSymbols: string[] = targetSymbols || this.generateFinalSymbols();

    let completedCount = 0;

    this.symbols.forEach((symbol, index) => {
      this.startSymbolSpin(
        symbol,
        index,
        symbolsToShow,
        spinDelay,
        finalSymbols[index],
        isTurbo,
        () => {
          completedCount++;
          if (completedCount === ROW_COUNT) {
            this.isSpinning = false;
            this.soundManager.playReelStop(this.reelIndex);
            onComplete();
          }
        }
      );
    });
  }

  /**
   * Generate final symbols for this reel fallback
   */
  private generateFinalSymbols(): string[] {
    const usedSymbols: string[] = [];
    const finalSymbols: string[] = [];

    for (let i = 0; i < ROW_COUNT; i++) {
      const finalSymbol = getRandomSymbol(
        Object.keys(symbolConfig),
        usedSymbols
      );
      finalSymbols.push(finalSymbol);
      usedSymbols.push(finalSymbol);
    }

    return finalSymbols;
  }

  /**
   * Start symbol spin animation with bounce
   */
  private startSymbolSpin(
    symbol: Phaser.GameObjects.Sprite,
    symbolIndex: number,
    totalSpins: number,
    spinDelay: number,
    finalSymbol: string,
    isTurbo: boolean,
    onComplete: () => void
  ): void {
    const initialY = this.initialPositions[symbolIndex].y;
    const windUpOffset = isTurbo ? 20 : 35;
    const windUpDuration = isTurbo ? 60 : 100;

    this.scene.tweens.add({
      targets: symbol,
      y: initialY - windUpOffset,
      duration: windUpDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.startSpinningLoop(
          symbol,
          symbolIndex,
          totalSpins,
          spinDelay,
          finalSymbol,
          initialY,
          isTurbo,
          onComplete
        );
      },
    });
  }

  /**
   * Main spinning loop
   */
  private startSpinningLoop(
    symbol: Phaser.GameObjects.Sprite,
    symbolIndex: number,
    totalSpins: number,
    spinDelay: number,
    finalSymbol: string,
    initialY: number,
    isTurbo: boolean,
    onComplete: () => void
  ): void {
    let currentSpinCount = 0;

    const blurEffect = symbol.getData('blurEffect');
    if (blurEffect) {
      this.scene.tweens.add({
        targets: blurEffect,
        strength: 2,
        duration: 100,
        ease: 'Linear',
      });
    }

    const spinInterval = this.scene.time.addEvent({
      delay: spinDelay,
      repeat: totalSpins - 4,
      callback: () => {
        this.updateSymbolDuringSpinning(
          symbol,
          symbolIndex,
          currentSpinCount,
          totalSpins,
          spinDelay,
          finalSymbol,
          initialY,
          isTurbo,
          onComplete,
          spinInterval
        );
        currentSpinCount++;
      },
    });
  }

  /**
   * Update symbol during spinning
   */
  private updateSymbolDuringSpinning(
    symbol: Phaser.GameObjects.Sprite,
    symbolIndex: number,
    currentSpinCount: number,
    totalSpins: number,
    spinDelay: number,
    finalSymbol: string,
    initialY: number,
    isTurbo: boolean,
    onComplete: () => void,
    spinInterval: Phaser.Time.TimerEvent
  ): void {
    symbol.setAlpha(0.85);

    // Audio tick on every passing symbol
    if (symbolIndex === 1) {
      this.soundManager.playReelTick();
    }

    this.scene.tweens.add({
      targets: symbol,
      y: `+=${SYMBOL_SIZE / 2}`,
      duration: spinDelay,
      ease: 'Linear',
      onComplete: () => {
        if (symbol.y >= initialY + SYMBOL_SIZE) {
          symbol.y = initialY - SYMBOL_SIZE / 2;
        }

        if (currentSpinCount < totalSpins - 4) {
          const randomSymbol = getRandomSymbol(Object.keys(symbolConfig));
          symbol.setTexture(randomSymbol);
        }

        if (currentSpinCount === totalSpins - 4) {
          this.finalizeSymbolSpin(
            symbol,
            finalSymbol,
            initialY,
            isTurbo,
            spinInterval,
            onComplete
          );
        }
      },
    });
  }

  /**
   * Finalize symbol spin with landing animation
   */
  private finalizeSymbolSpin(
    symbol: Phaser.GameObjects.Sprite,
    finalSymbol: string,
    initialY: number,
    isTurbo: boolean,
    spinInterval: Phaser.Time.TimerEvent,
    onComplete: () => void
  ): void {
    symbol.setTexture(finalSymbol);
    spinInterval.remove();

    const blurEffect = symbol.getData('blurEffect');
    if (blurEffect) {
      this.scene.tweens.add({
        targets: blurEffect,
        strength: 0,
        duration: 80,
        ease: 'Linear',
      });
    }

    this.scene.tweens.add({
      targets: symbol,
      y: initialY,
      alpha: 1,
      duration: isTurbo ? 180 : 320,
      ease: 'Back.easeOut',
      onComplete: onComplete,
    });
  }

  /**
   * Get current symbols on this reel
   */
  public getSymbols(): Phaser.GameObjects.Sprite[] {
    return this.symbols;
  }

  /**
   * Set glow and border effect on symbol for win highlighting
   */
  public setSymbolGlow(rowIndex: number, enabled: boolean): void {
    const symbol = this.symbols[rowIndex];
    const box = this.highlightBoxes[rowIndex];
    if (!symbol) return;

    if (enabled) {
      if (box) {
        box.setVisible(true);
        box.setAlpha(1);
        this.scene.tweens.add({
          targets: box,
          alpha: { from: 0.4, to: 1 },
          scaleX: { from: 0.98, to: 1.04 },
          scaleY: { from: 0.98, to: 1.04 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      this.scene.tweens.add({
        targets: symbol,
        scale: { from: 1, to: 1.1 },
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      if (box) {
        this.scene.tweens.killTweensOf(box);
        box.setVisible(false);
        box.setScale(1);
      }
      this.scene.tweens.killTweensOf(symbol);
      symbol.setScale(1);
      symbol.setDisplaySize(SYMBOL_SIZE, SYMBOL_SIZE);
    }
  }

  /**
   * Get current symbol names
   */
  public getCurrentSymbols(): string[] {
    return this.symbols.map((symbol) => symbol.texture.key);
  }
}
