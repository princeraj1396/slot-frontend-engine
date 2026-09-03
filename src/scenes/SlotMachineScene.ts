import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  REEL_COUNT,
  ROW_COUNT,
  SYMBOL_SIZE,
  SPIN_DELAY_BETWEEN_REELS,
} from '../config/constants';
import { symbolConfig, backgroundImage, confetti } from '../config/assets';
import { SpinButton } from '../components/SpinButton';
import { Reel } from '../components/Reel';
import { WinDisplay } from '../components/WinDisplay';
import { FrameData } from '../types/types';
import WebFont from 'webfontloader';

/**
 * SlotMachineScene - Main game scene
 * Manages the frontend presentation layer of the slot machine
 *
 * ARCHITECTURE NOTE:
 * This scene handles ONLY frontend rendering and animations.
 * Game logic decisions (results, wins, amounts) must come from backend.
 * See README for backend integration points.
 */
export default class SlotMachineScene extends Phaser.Scene {
  private reels: Reel[] = [];
  private spinButton!: SpinButton;
  private winDisplay!: WinDisplay;
  private isSpinning: boolean = false;
  private fontLoaded: boolean = false;

  constructor() {
    super({ key: 'SlotMachineScene' });
  }

  /**
   * Preload assets
   */
  preload(): void {
    // Load symbol images
    Object.entries(symbolConfig).forEach(([symbolName, path]) => {
      this.load.image(symbolName, path);
    });

    // Load background
    this.load.image('background', backgroundImage);

    // Load confetti spritesheet
    this.load.spritesheet('confetti', confetti, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Load fonts
    this.loadFont();
  }

  /**
   * Load web fonts
   */
  private loadFont(): void {
    WebFont.load({
      google: { families: ['Space Grotesk:700'] },
      active: () => {
        this.fontLoaded = true;
      },
    });
  }

  /**
   * Create scene
   */
  create(): void {
    // Wait for font to load
    if (!this.fontLoaded) {
      this.time.addEvent({
        delay: 100,
        callback: () => this.create(),
        callbackScope: this,
      });
      return;
    }

    this.createBackground();
    const frameData = this.createReelFrame();
    this.createReels(frameData);
    this.createSpinButton();
    this.createTitle();
    this.winDisplay = new WinDisplay(this);
  }

  /**
   * Create background with gradient overlay
   */
  private createBackground(): void {
    const background = this.add.sprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      'background'
    );
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x110024, 0x1a0008, 0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  /**
   * Create reel frame with border and grid
   */
  private createReelFrame(): FrameData {
    const frameX =
      GAME_WIDTH / 2 -
      (REEL_COUNT * SYMBOL_SIZE + (REEL_COUNT - 1) * 20) / 2 -
      10;
    const frameY =
      GAME_HEIGHT / 2 -
      (ROW_COUNT * SYMBOL_SIZE + (ROW_COUNT - 1) * 20) / 2 -
      50;
    const frameWidth = REEL_COUNT * SYMBOL_SIZE + (REEL_COUNT - 1) * 20 + 40;
    const frameHeight = ROW_COUNT * SYMBOL_SIZE + (ROW_COUNT - 1) * 20 + 40;

    const container = this.add.container(0, 0);
    container.setDepth(2);
    this.createFrameBackground(frameX, frameY, frameWidth, frameHeight);
    this.createGridLines(frameX, frameY, frameWidth, frameHeight);
    this.createMask(frameX, frameY, frameWidth, frameHeight, container);

    return { frameX, frameY, frameWidth, frameHeight, container };
  }

  /**
   * Create frame background with rounded corners
   */
  private createFrameBackground(
    frameX: number,
    frameY: number,
    frameWidth: number,
    frameHeight: number
  ): void {
    const frame = this.add.graphics();
    frame.lineStyle(2, 0xffffff, 1);
    frame.fillStyle(0x000000, 0.5);
    frame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 16);
    frame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 16);
  }

  /**
   * Create grid lines to separate symbols
   */
  private createGridLines(
    frameX: number,
    frameY: number,
    frameWidth: number,
    frameHeight: number
  ): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.15);

    // Vertical lines
    for (let i = 1; i < REEL_COUNT; i++) {
      const x = frameX + (frameWidth / REEL_COUNT) * i;
      grid.lineBetween(x, frameY + 10, x, frameY + frameHeight - 10);
    }

    // Horizontal lines
    for (let i = 1; i < ROW_COUNT; i++) {
      const y = frameY + (frameHeight / ROW_COUNT) * i;
      grid.lineBetween(frameX + 10, y, frameX + frameWidth - 10, y);
    }
  }

  /**
   * Create mask for reel container
   */
  private createMask(
    frameX: number,
    frameY: number,
    frameWidth: number,
    frameHeight: number,
    container: Phaser.GameObjects.Container
  ): void {
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0x000000);
    maskGraphics.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 16);
    container.setMask(
      new Phaser.Display.Masks.GeometryMask(this, maskGraphics)
    );
  }

  /**
   * Create all reels
   */
  private createReels(frameData: FrameData): void {
    const symbolSpacing =
      (frameData.frameWidth - 60 - REEL_COUNT * SYMBOL_SIZE) / (REEL_COUNT - 1);
    const offsetX = 115;
    const offsetY = 130;
    for (let i = 0; i < REEL_COUNT; i++) {
      const startX = frameData.frameX + offsetX + i * symbolSpacing;
      const startY = frameData.frameY + offsetY;
      this.reels[i] = new Reel(this, i, startX, startY, frameData.container);
    }
  }

  /**
   * Create spin button
   */
  private createSpinButton(): void {
    const buttonX = GAME_WIDTH / 2;
    const buttonY = GAME_HEIGHT - 140;
    this.spinButton = new SpinButton(this, buttonX, buttonY, () => this.spin());
  }

  /**
   * Create title text
   */
  private createTitle(): void {
    const titleConfig: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Space Grotesk',
      fontStyle: 'bold',
      align: 'center',
    };

    this.add
      .text(GAME_WIDTH / 2, 100, 'Slot Machine', titleConfig)
      .setOrigin(0.45, 0.5)
      .setDepth(3);
  }

  /**
   * Initiate spin sequence
   */
  private spin(): void {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinButton.disable();

    for (let i = 0; i < REEL_COUNT; i++) {
      this.removeHighlightWinningSymbols(i);
      this.time.delayedCall(i * SPIN_DELAY_BETWEEN_REELS, () => {
        this.spinReel(i, i === REEL_COUNT - 1);
      });
    }
  }

  /**
   * Spin individual reel
   */
  private spinReel(reelIndex: number, isLastReel: boolean): void {
    this.reels[reelIndex].spin(() => {
      if (isLastReel) {
        this.onSpinComplete();
      }
    });
  }

  /**
   * Handle spin completion
   * TODO: Replace hardcoded win logic with backend call
   */
  private onSpinComplete(): void {
    this.isSpinning = false;

    if (this.checkForWin()) {
      this.triggerWin();
    } else {
      this.spinButton.enable();
    }
  }

  /**
   * Check if any row has matching symbols
   * NOTE: In production, backend should determine winners
   */
  private checkForWin(): boolean {
    for (let row = 0; row < ROW_COUNT; row++) {
      if (this.checkRowForWin(row)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if specific row is a winner
   */
  private checkRowForWin(row: number): boolean {
    const firstSymbolTexture = this.reels[0].getSymbols()[row].texture.key;

    for (let i = 1; i < REEL_COUNT; i++) {
      const currentSymbolTexture = this.reels[i].getSymbols()[row].texture.key;
      if (currentSymbolTexture !== firstSymbolTexture) {
        return false;
      }
    }

    this.highlightWinningSymbols(row);
    return true;
  }

  /**
   * Remove highlight from symbols
   */
  private removeHighlightWinningSymbols(row: number): void {
    for (let i = 0; i < REEL_COUNT; i++) {
      this.reels[i].setSymbolGlow(row, false);
    }
  }

  /**
   * Highlight winning symbols
   */
  private highlightWinningSymbols(row: number): void {
    for (let i = 0; i < REEL_COUNT; i++) {
      this.reels[i].setSymbolGlow(row, true);
    }
  }

  /**
   * Trigger win animation
   */
  private triggerWin(): void {
    this.winDisplay.show(() => {
      this.spinButton.enable();
    });
  }
}
