import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  REEL_COUNT,
  ROW_COUNT,
} from '../config/constants';
import { symbolConfig, backgroundImage, confetti, coinImage } from '../config/assets';
import { Reel } from '../components/Reel';
import { WinDisplay } from '../components/WinDisplay';
import { CasinoConsole } from '../components/CasinoConsole';
import { PaytableModal } from '../components/PaytableModal';
import { GameHistoryModal } from '../components/GameHistoryModal';
import { SettingsModal, CasinoSettings } from '../components/SettingsModal';
import { FrameData } from '../types/types';
import { SlotGameEngine } from '../game-engine/SlotGameEngine';
import { SoundManager } from '../game-engine/SoundManager';
import { MockPlatformServer, CASINO_PAYLINES } from '../api/MockPlatformServer';
import { SpinResultData, WinningLineResult } from '../api/CasinoPlatformBridge';
import WebFont from 'webfontloader';

/**
 * SlotMachineScene (Royal Fortune 777)
 * High-end, compact mobile-first UI for 3x3 slot game.
 * Features luxury purple velvet & dark wood background, 3D metallic-styled symbols on deep black reels,
 * ornate gold frame with illuminated payline tags, progressive jackpot banner,
 * and unified textured wood & gold-trimmed console deck at the bottom.
 */
export default class SlotMachineScene extends Phaser.Scene {
  public reels: Reel[] = [];
  public winDisplay!: WinDisplay;
  private consoleDeck!: CasinoConsole;
  private paytableModal!: PaytableModal;
  private historyModal!: GameHistoryModal;
  private settingsModal!: SettingsModal;
  private audio!: SoundManager;
  private gameEngine!: SlotGameEngine;
  private platformServer!: MockPlatformServer;

  private isSpinning: boolean = false;
  private currentResult: SpinResultData | null = null;

  // Casino Settings state
  private settings: CasinoSettings = {
    soundEnabled: true,
    volume: 0.5,
    turboEnabled: false,
    spacebarEnabled: true,
    stopOnWin: false,
  };

  // Visual Elements
  private chaseBulbs: Phaser.GameObjects.Graphics[] = [];
  private chaseTimer: Phaser.Time.TimerEvent | null = null;
  private activePaylineGraphics: Phaser.GameObjects.Graphics | null = null;
  private jackpotText!: Phaser.GameObjects.Text;
  private statusTickerText!: Phaser.GameObjects.Text;
  private reelFrameData!: FrameData;

  // Loading Screen Elements
  private loadingContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'SlotMachineScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.load.image('jillu_logo', '/JILLU-LOGO.png');
    this.load.image('jillu_icon', '/JILLU-ICON.png');

    // Load symbols
    Object.entries(symbolConfig).forEach(([symbolName, path]) => {
      this.load.image(symbolName, path);
    });

    this.load.image('background', backgroundImage);
    this.load.image('coin', coinImage);

    this.load.spritesheet('confetti', confetti, {
      frameWidth: 16,
      frameHeight: 16,
    });

    this.loadFont();
  }

  private createLoadingScreen(): void {
    this.loadingContainer = this.add.container(0, 0);
    this.loadingContainer.setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0514, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.loadingContainer.add(bg);

    // Provider Branding
        const providerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 'PROVIDED BY', {
        fontSize: '14px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#c5a059',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.loadingContainer.add(providerText);

    this.load.once('filecomplete-image-jillu_logo', () => {
      if (this.loadingContainer) {
        const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'jillu_logo');
        // scale logo appropriately
        const maxWidth = 200;
        const scale = maxWidth / logo.width;
        logo.setScale(scale); 
        this.loadingContainer.add(logo);
      }
    });

    // Title
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '★ ROYAL FORTUNE 777 ★', {
        fontSize: '44px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.loadingContainer.add(title);

    const subTitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'CONNECTING TO CASINO GAMING SERVER...', {
        fontSize: '15px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#c5a059',
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    this.loadingContainer.add(subTitle);

    // Progress Bar Track
    const barW = 440;
    const barH = 16;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = GAME_HEIGHT / 2 + 30;

    const track = this.add.graphics();
    track.fillStyle(0x1a1226, 1);
    track.fillRoundedRect(barX, barY, barW, barH, 8);
    track.lineStyle(1.5, 0xd4af37, 0.7);
    track.strokeRoundedRect(barX, barY, barW, barH, 8);
    this.loadingContainer.add(track);

    const fill = this.add.graphics();
    this.loadingContainer.add(fill);

    this.load.on('progress', (value: number) => {
      fill.clear();
      fill.fillStyle(0xffd700, 1);
      fill.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * value), barH - 4, 6);
    });

    this.load.on('complete', () => {
      subTitle.setText('RNG ENGINE INITIALIZED • LAUNCHING');
    });
  }

  private hideLoadingScreen(): void {
    if (this.loadingContainer) {
      this.tweens.add({
        targets: this.loadingContainer,
        alpha: 0,
        duration: 400,
        ease: 'Linear',
        onComplete: () => {
          this.loadingContainer?.destroy();
          this.loadingContainer = null;
        },
      });
    }
  }

  private loadFont(): void {
    WebFont.load({
      google: {
        families: ['Cinzel:700,900', 'Playfair Display:700', 'Space Grotesk:500,700'],
      },
    });
  }

  create(): void {
    this.audio = SoundManager.getInstance();
    this.platformServer = MockPlatformServer.getInstance();
    this.gameEngine = SlotGameEngine.getInstance();
    this.gameEngine.registerScene(this);

    // 1. Rich purple velvet & dark wood background
    this.createBackground();

    // 2. Top Royal Fortune 777 Logo & Crown & Progressive Jackpot Banner
    this.createTopMarquee();

    // 3. Central 3x3 Slot Frame with Ornate Gold Border & Payline Indicators
    this.reelFrameData = this.createReelFrame();

    // 4. Paylines Visual Overlay Graphics
    this.activePaylineGraphics = this.add.graphics();
    this.activePaylineGraphics.setDepth(15);

    // 5. Reels
    this.createReels();

    // 6. Interactive Casino Console Deck (Bottom Unified Panel)
    this.createCasinoConsole();

    // 7. Modals & Overlays
    this.winDisplay = new WinDisplay(this);
    this.paytableModal = new PaytableModal(this);
    this.historyModal = new GameHistoryModal(this);
    this.settingsModal = new SettingsModal(this, (newSettings) => {
      this.settings = newSettings;
    });

    // 8. Keyboard Controls
    this.setupKeyboardControls();

    // 9. Start ambient chase lights
    this.startChaseLights(false);

    // Hide preloader
    this.hideLoadingScreen();
  }

  private createBackground(): void {
    const background = this.add.sprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      'background'
    );
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Subtle atmospheric vignette overlay
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x06020a, 0x06020a, 0x14051a, 0x14051a, 0.45);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Elegant Chandelier Bokeh Effect in the upper background
    const bokehGfx = this.add.graphics();
    const bokehOrbs = [
      { x: 210, y: 130, r: 36, alpha: 0.18, color: 0xffd700 },
      { x: 380, y: 90, r: 24, alpha: 0.22, color: 0xffec99 },
      { x: 540, y: 150, r: 48, alpha: 0.16, color: 0xffe066 },
      { x: 700, y: 85, r: 28, alpha: 0.20, color: 0xffd700 },
      { x: 870, y: 140, r: 42, alpha: 0.17, color: 0xffe680 },
      { x: 310, y: 220, r: 20, alpha: 0.14, color: 0xfff0a6 },
      { x: 780, y: 210, r: 26, alpha: 0.15, color: 0xffe066 },
      { x: 470, y: 260, r: 32, alpha: 0.12, color: 0xffd700 },
      { x: 610, y: 250, r: 22, alpha: 0.14, color: 0xffec99 },
    ];

    bokehOrbs.forEach((orb) => {
      bokehGfx.fillStyle(orb.color, orb.alpha);
      bokehGfx.fillCircle(orb.x, orb.y, orb.r);
      bokehGfx.fillStyle(0xffffff, orb.alpha * 0.5);
      bokehGfx.fillCircle(orb.x, orb.y, orb.r * 0.4);
    });

    // Top-Left Corner: Circular Gold Medallion with "777"
    this.createTopLeftMedallion();
  }

  /**
   * Circular gold medallion with "777" in top-left corner
   */
  private createTopLeftMedallion(): void {
    const medallion = this.add.container(82, 82);
    medallion.setDepth(15);

    const gfx = this.add.graphics();
    const r = 38;

    // Outer shadow
    gfx.fillStyle(0x000000, 0.6);
    gfx.fillCircle(2, 4, r);

    // Beveled Gold Edge
    gfx.fillGradientStyle(0xffec99, 0xffd700, 0xb8860b, 0x8b6508, 1);
    gfx.fillCircle(0, 0, r);

    // Inner Deep Black-Gold Inset
    gfx.fillStyle(0x1a0d02, 1);
    gfx.fillCircle(0, 0, r - 5);

    // Concentric Fine Gold Rings
    gfx.lineStyle(2, 0xffd700, 0.95);
    gfx.strokeCircle(0, 0, r - 6);
    gfx.lineStyle(1, 0xffec99, 0.6);
    gfx.strokeCircle(0, 0, r - 11);

    // Embossed "777" text
    const text777 = this.add
      .text(0, 1, '777', {
        fontSize: '24px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#4a3205',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    medallion.add([gfx, text777]);

    // Subtle breathing gleam
    this.tweens.add({
      targets: medallion,
      scale: { from: 0.97, to: 1.03 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Top Center Logo and Progressive Jackpot Banner matching image_0.png
   */
  private createTopMarquee(): void {
    const titleContainer = this.add.container(GAME_WIDTH / 2, 0);

    // 1. Gold Crown Icon at the very top
    const crownY = 88;
    this.drawGoldCrown(titleContainer, 0, crownY);

    // 2. Ornate Gold Filigree Logo Plaque: ROYAL FORTUNE 777
    const logoY = crownY + 80;

    // Side ornamental flourishes
    const filigree = this.add.graphics();
    filigree.lineStyle(2, 0xd4af37, 0.9);
    // Left flourish
    filigree.strokeLineShape(new Phaser.Geom.Line(-330, logoY, -230, logoY));
    filigree.strokeCircle(-334, logoY, 4);
    // Right flourish
    filigree.strokeLineShape(new Phaser.Geom.Line(230, logoY, 330, logoY));
    filigree.strokeCircle(334, logoY, 4);
    titleContainer.add(filigree);

    // Main Ornate Polished Gold Logo Text: "Royal Fortune 777"
    const royalVegasText = this.add
      .text(0, logoY, 'ROYAL FORTUNE 777', {
        fontSize: '48px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffec99',
        stroke: '#573d09',
        strokeThickness: 5,
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    titleContainer.add(royalVegasText);

    // 4. PROGRESSIVE JACKPOT BANNER
    // Prominent, gold-framed banner clearly displaying: "5 PROGRESSIVE JACKPOT: $52,450.00"
    const jackpotY = 278;
    const bannerW = 860;
    const bannerH = 74;

    const bannerGfx = this.add.graphics();
    // Shadow
    bannerGfx.fillStyle(0x000000, 0.7);
    bannerGfx.fillRoundedRect(-bannerW / 2 + 4, jackpotY - bannerH / 2 + 5, bannerW, bannerH, 14);

    // Heavy Gold Beveled Rim
    bannerGfx.fillGradientStyle(0xffec99, 0xffd700, 0xb8860b, 0x805d09, 1);
    bannerGfx.fillRoundedRect(-bannerW / 2, jackpotY - bannerH / 2, bannerW, bannerH, 14);

    // Inner Deep Black/Purple Plate
    bannerGfx.fillStyle(0x0a0512, 0.96);
    bannerGfx.fillRoundedRect(-bannerW / 2 + 4, jackpotY - bannerH / 2 + 4, bannerW - 8, bannerH - 8, 10);

    // Inner Fine Gold Inset Trim
    bannerGfx.lineStyle(1.5, 0xd4af37, 0.8);
    bannerGfx.strokeRoundedRect(-bannerW / 2 + 7, jackpotY - bannerH / 2 + 7, bannerW - 14, bannerH - 14, 8);

    titleContainer.add(bannerGfx);

    const currentJackpot = this.platformServer.getJackpot();
    this.jackpotText = this.add
      .text(
        0,
        jackpotY,
        `5 PROGRESSIVE JACKPOT: $${currentJackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        {
          fontSize: '28px',
          fontFamily: 'Cinzel, serif',
          fontStyle: 'bold',
          color: '#ffd700',
          stroke: '#281704',
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5);
    titleContainer.add(this.jackpotText);

    // Subtle breathing pulse for jackpot
    this.tweens.add({
      targets: this.jackpotText,
      scale: { from: 0.98, to: 1.02 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 5. Text line directly below banner: "★ 5 ACTIVE PAYLINES - MATCH SYMBOLS TO WIN ★"
    this.statusTickerText = this.add
      .text(
        0,
        352,
        '★ 5 ACTIVE PAYLINES - MATCH SYMBOLS TO WIN ★',
        {
          fontSize: '17px',
          fontFamily: 'Cinzel, serif',
          fontStyle: 'bold',
          color: '#c5a059',
          letterSpacing: 1.5,
        }
      )
      .setOrigin(0.5);
    titleContainer.add(this.statusTickerText);
  }

  /**
   * Draw small golden crown icon at top
   */
  private drawGoldCrown(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const crown = this.add.graphics();
    // Shadow
    crown.fillStyle(0x000000, 0.6);
    crown.fillCircle(x, y + 2, 22);

    // Base band
    crown.fillGradientStyle(0xffec99, 0xffd700, 0xb8860b, 0x8b6508, 1);
    crown.fillRoundedRect(x - 22, y + 6, 44, 8, 3);

    // Crown peaks
    crown.beginPath();
    crown.moveTo(x - 22, y + 6);
    crown.lineTo(x - 24, y - 10);
    crown.lineTo(x - 12, y);
    crown.lineTo(x, y - 16);
    crown.lineTo(x + 12, y);
    crown.lineTo(x + 24, y - 10);
    crown.lineTo(x + 22, y + 6);
    crown.closePath();
    crown.fillPath();

    // Little jewel spheres on the peaks
    crown.fillStyle(0xff3b30, 1); // Ruby
    crown.fillCircle(x - 24, y - 11, 3.5);
    crown.fillStyle(0x38bdf8, 1); // Diamond
    crown.fillCircle(x, y - 17, 4.5);
    crown.fillStyle(0xff3b30, 1); // Ruby
    crown.fillCircle(x + 24, y - 11, 3.5);

    // Gem in center band
    crown.fillStyle(0x22c55e, 1); // Emerald
    crown.fillCircle(x, y + 10, 3);

    container.add(crown);
  }

  /**
   * Main 3x3 slot reel grid frame centrally positioned and larger,
   * filling the optimal space on a deep black background for contrast.
   */
  private createReelFrame(): FrameData {
    const frameWidth = 920;
    const frameHeight = 1040;
    const frameX = (GAME_WIDTH - frameWidth) / 2;
    const frameY = 410;

    // 1. Ornate Gold Grid Frame
    const cabinet = this.add.graphics();

    // Outer Drop Shadow
    cabinet.fillStyle(0x000000, 0.8);
    cabinet.fillRoundedRect(frameX - 16, frameY - 14, frameWidth + 32, frameHeight + 28, 24);

    // Heavy Double Bevel Gold Border
    cabinet.fillGradientStyle(0xffec99, 0xd4af37, 0x946907, 0xd4af37, 1);
    cabinet.fillRoundedRect(frameX - 12, frameY - 10, frameWidth + 24, frameHeight + 20, 20);

    // Deep Pitch-Black Inner Cavity for maximum contrast
    cabinet.fillStyle(0x000000, 1);
    cabinet.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 14);

    // Inner Golden Inset Wire
    cabinet.lineStyle(2, 0xd4af37, 0.85);
    cabinet.strokeRoundedRect(frameX + 4, frameY + 4, frameWidth - 8, frameHeight - 8, 12);

    // Thin vertical reel dividers
    cabinet.lineStyle(1.5, 0x221a30, 0.9);
    cabinet.lineBetween(frameX + 306, frameY + 8, frameX + 306, frameY + frameHeight - 8);
    cabinet.lineBetween(frameX + 613, frameY + 8, frameX + 613, frameY + frameHeight - 8);

    // 2. Chase Lights (LED bulbs around the ornate frame)
    this.createChaseBulbs(frameX - 6, frameY - 4, frameWidth + 12, frameHeight + 8);

    // 3. Side Payline Indicator Badges (matching image_0.png)
    this.createPaylineSideTags(frameX, frameWidth);

    // Container with Mask for Reels
    const container = this.add.container(0, 0);
    container.setDepth(2);

    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0x000000);
    maskGraphics.fillRoundedRect(frameX + 6, frameY + 6, frameWidth - 12, frameHeight - 12, 10);
    container.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics));

    return { frameX, frameY, frameWidth, frameHeight, container };
  }

  private createChaseBulbs(x: number, y: number, w: number, h: number): void {
    const spacing = 38;
    const bulbPositions: { x: number; y: number }[] = [];

    // Top edge
    for (let bx = x + 16; bx < x + w - 16; bx += spacing) {
      bulbPositions.push({ x: bx, y: y });
    }
    // Right edge
    for (let by = y + 16; by < y + h - 16; by += spacing) {
      bulbPositions.push({ x: x + w, y: by });
    }
    // Bottom edge
    for (let bx = x + w - 16; bx > x + 16; bx -= spacing) {
      bulbPositions.push({ x: bx, y: y + h });
    }
    // Left edge
    for (let by = y + h - 16; by > y + 16; by -= spacing) {
      bulbPositions.push({ x: x, y: by });
    }

    bulbPositions.forEach((pos) => {
      const bulb = this.add.graphics();
      bulb.fillStyle(0xffd700, 0.4);
      bulb.fillCircle(pos.x, pos.y, 4);
      bulb.setDepth(10);
      this.chaseBulbs.push(bulb);
    });
  }

  private startChaseLights(isFast: boolean): void {
    if (this.chaseTimer) {
      this.chaseTimer.remove();
    }

    let step = 0;
    this.chaseTimer = this.time.addEvent({
      delay: isFast ? 50 : 160,
      loop: true,
      callback: () => {
        step = (step + 1) % this.chaseBulbs.length;
        this.chaseBulbs.forEach((bulb, idx) => {
          bulb.clear();
          const dist = (idx - step + this.chaseBulbs.length) % this.chaseBulbs.length;
          const isActive = dist < 4;
          if (isActive) {
            bulb.fillStyle(isFast ? 0x00f0ff : 0xffffff, 1);
            bulb.fillCircle(0, 0, 6);
          } else {
            bulb.fillStyle(0xd4af37, 0.35);
            bulb.fillCircle(0, 0, 3.5);
          }
        });
      },
    });
  }

  /**
   * Illuminated payline indicators on the left and right sides of the grid frame
   * exactly as seen in image_0.png:
   * Left: 1 (Green), 2 (Cyan), 0 (Purple)
   * Right: 1 (Purple), 2 (Cyan), 3 (Orange)
   */
  private createPaylineSideTags(frameX: number, frameW: number): void {
    const rowYPositions = [600, 920, 1240];

    // Left tags
    const leftTags = [
      { id: 1, label: '1', color: 0x22c55e, y: rowYPositions[0] }, // Green
      { id: 2, label: '2', color: 0x06b6d4, y: rowYPositions[1] }, // Cyan
      { id: 3, label: '3', color: 0xa855f7, y: rowYPositions[2] }, // Purple
    ];

    leftTags.forEach((tag) => {
      this.createSideTagPill(frameX - 42, tag.y, tag.id, tag.label, tag.color);
    });

    // Right tags
    const rightTags = [
      { id: 1, label: '1', color: 0x22c55e, y: rowYPositions[0] }, // Green
      { id: 2, label: '2', color: 0x06b6d4, y: rowYPositions[1] }, // Cyan
      { id: 3, label: '3', color: 0xf97316, y: rowYPositions[2] }, // Orange
    ];

    rightTags.forEach((tag) => {
      this.createSideTagPill(frameX + frameW + 8, tag.y, tag.id, tag.label, tag.color);
    });
  }

  private createSideTagPill(x: number, y: number, lineId: number, label: string, color: number): void {
    const container = this.add.container(x, y);
    container.setDepth(12);

    const bg = this.add.graphics();
    // Pill shape
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(0, -18, 34, 36, 8);
    bg.lineStyle(1.5, 0xffffff, 0.9);
    bg.strokeRoundedRect(0, -18, 34, 36, 8);

    const txt = this.add
      .text(17, 0, label, {
        fontSize: '20px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(34, 36).setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      this.highlightSinglePayline(lineId);
    });
  }

  /**
   * Create 3 reels positioned centrally in the grid with exact initial symbol matrix:
   * Top Row (L-R): Green clover, Blue blueberry cluster, Blue blueberry cluster.
   * Middle Row (L-R): Blue blueberry cluster, Green clover, Blue diamond.
   * Bottom Row (L-R): Blue diamond, Red cherries, Red cherries.
   */
  private createReels(): void {
    const colXPositions = [240, 540, 840];
    const startY = 600;

    const initialColumns = [
      ['clover', 'blueberry', 'diamond'], // Col 0
      ['blueberry', 'clover', 'cherry'],  // Col 1
      ['blueberry', 'diamond', 'cherry'], // Col 2
    ];

    for (let i = 0; i < REEL_COUNT; i++) {
      this.reels[i] = new Reel(
        this,
        i,
        colXPositions[i],
        startY,
        this.reelFrameData.container,
        initialColumns[i]
      );
    }
  }

  /**
   * Unified Control Deck (The Compact Fix)
   * All controls unified in a single, elegant, textured wooden and gold-trim console panel
   * at the bottom of the screen.
   */
  private createCasinoConsole(): void {
    const consoleY = 1460;
    const initialBalance = this.platformServer.getBalance();

    this.consoleDeck = new CasinoConsole(this, consoleY, initialBalance, {
      onSpin: () => this.handleSpinRequest(),
      onBetChange: (newBet) => {
        this.statusTickerText.setText(`BET SET TO $${newBet.toFixed(2)} • 5 ACTIVE PAYLINES`);
      },
      onAutoSpinChange: (count) => {
        if (count > 0) {
          this.statusTickerText.setText(`AUTO-SPIN ARMED (${count} SPINS)`);
          if (!this.isSpinning) {
            this.handleSpinRequest();
          }
        } else {
          this.statusTickerText.setText('AUTO-SPIN DISABLED');
        }
      },
      onTurboToggle: (isTurbo) => {
        this.settings.turboEnabled = isTurbo;
        this.statusTickerText.setText(isTurbo ? 'TURBO SPEED ACTIVATED ⚡' : 'STANDARD SPIN SPEED');
      },
      onOpenPaytable: () => {
        this.paytableModal.show();
      },
      onOpenHistory: () => {
        this.historyModal.show();
      },
      onOpenSettings: () => {
        this.settingsModal.show();
      },
      onRefillBalance: () => {
        const current = this.platformServer.getBalance();
        const updated = current + 500;
        this.platformServer.setBalance(updated);
        this.consoleDeck.setBalance(updated);
        this.statusTickerText.setText('DEMO BANKROLL RELOADED (+$500.00)! GOOD LUCK!');
      },
    });
  }

  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.settings.spacebarEnabled) return;
      if (this.paytableModal.isOpen()) {
        this.paytableModal.hide();
        return;
      }
      if (this.historyModal.isOpen()) {
        this.historyModal.hide();
        return;
      }
      if (this.settingsModal.isOpen()) {
        this.settingsModal.hide();
        return;
      }
      this.handleSpinRequest();
    });

    this.input.keyboard.on('keydown-A', () => {
      const current = this.consoleDeck.getAutoSpinCount();
      const next = current === 0 ? 10 : 0;
      this.consoleDeck['autoSpinCount'] = next;
      this.consoleDeck['updateAutoButtonUI']();
      if (next > 0 && !this.isSpinning) {
        this.handleSpinRequest();
      }
    });

    this.input.keyboard.on('keydown-I', () => {
      if (this.paytableModal.isOpen()) {
        this.paytableModal.hide();
      } else {
        this.paytableModal.show();
      }
    });

    this.input.keyboard.on('keydown-H', () => {
      if (this.historyModal.isOpen()) {
        this.historyModal.hide();
      } else {
        this.historyModal.show();
      }
    });
  }

  /**
   * Main spin initiator - Delegates RNG and financial logic to Server / Engine
   */
  private async handleSpinRequest(): Promise<void> {
    if (this.isSpinning) return;

    const totalBet = this.consoleDeck.getBet();
    const balance = this.consoleDeck.getBalance();

    // Balance check
    if (balance < totalBet) {
      this.audio.playClick();
      this.consoleDeck.stopAutoSpin();
      this.statusTickerText.setText('INSUFFICIENT BALANCE! TAP BALANCE TO RELOAD');
      this.statusTickerText.setColor('#ff3b30');

      this.tweens.add({
        targets: this.statusTickerText,
        scale: { from: 1.15, to: 1 },
        duration: 300,
        onComplete: () => {
          this.statusTickerText.setColor('#c5a059');
        },
      });
      return;
    }

    this.isSpinning = true;
    this.consoleDeck.setSpinning(true);
    this.clearWinningHighlights();
    this.startChaseLights(true);

    this.audio.playSpin();
    this.statusTickerText.setText('REELS ROLLING... GOOD LUCK!');

    try {
      // Execute Authoritative Server Spin Request (RGS Integration)
      this.currentResult = await this.gameEngine.requestSpin(totalBet);

      // Update UI balance to reflect deduction
      this.consoleDeck.setBalance(this.platformServer.getBalance());

      // Update progressive jackpot display
      const newJackpot = this.platformServer.getJackpot();
      this.jackpotText.setText(
        `PROGRESSIVE JACKPOT: $${newJackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );

      const isTurbo = this.settings.turboEnabled || this.consoleDeck.isTurboMode();
      const delayBetweenReels = isTurbo ? 130 : 250;

      for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex++) {
        const targetSymbols = this.currentResult.matrix[reelIndex];
        const delay = reelIndex * delayBetweenReels;

        this.time.delayedCall(delay, () => {
          this.gameEngine.playAnimation(
            reelIndex,
            targetSymbols,
            isTurbo,
            () => {
              if (reelIndex === REEL_COUNT - 1) {
                this.onSpinComplete();
              }
            }
          );
        });
      }
    } catch (err: any) {
      console.error('[SlotMachineScene] Spin error:', err);
      this.isSpinning = false;
      this.consoleDeck.setSpinning(false);
      this.statusTickerText.setText('ERROR OCCURRED DURING SPIN. PLEASE RETRY.');
    }
  }

  private onSpinComplete(): void {
    this.isSpinning = false;
    this.startChaseLights(false);

    if (!this.currentResult) {
      this.consoleDeck.setSpinning(false);
      return;
    }

    const { totalWin, winningLines, isJackpot, balanceAfter } = this.currentResult;

    // Synchronize balance from authoritative server response
    this.consoleDeck.setBalance(balanceAfter);

    if (totalWin > 0) {
      // 1. Highlight symbols and draw laser paylines
      this.highlightWinningCombinations(winningLines);

      // 2. Update win meter
      this.consoleDeck.setLastWin(totalWin);

      // 3. Status text
      const winMessage = isJackpot
        ? `★ JACKPOT HIT! WON $${totalWin.toLocaleString()}! ★`
        : `WINNER! Payout: $${totalWin.toFixed(2)} (${winningLines.length} line${winningLines.length > 1 ? 's' : ''})`;
      this.statusTickerText.setText(winMessage);
      this.statusTickerText.setColor('#ffd700');

      // 4. Trigger Win Celebration Display via Engine hook
      this.gameEngine.showWin(this.currentResult, () => {
        this.consoleDeck.setSpinning(false);
        this.statusTickerText.setColor('#c5a059');

        // Check if Stop-on-Win is enabled in settings
        if (this.settings.stopOnWin && this.consoleDeck.getAutoSpinCount() > 0) {
          this.consoleDeck.stopAutoSpin();
          this.statusTickerText.setText('AUTO-PLAY STOPPED (WIN OCCURRED)');
        } else {
          this.handlePostSpinAutoCheck();
        }
      });
    } else {
      this.consoleDeck.setSpinning(false);
      this.statusTickerText.setText('NO WIN THIS TIME. SPIN AGAIN!');
      this.handlePostSpinAutoCheck();
    }
  }

  private handlePostSpinAutoCheck(): void {
    if (this.consoleDeck.getAutoSpinCount() > 0) {
      this.consoleDeck.decrementAutoSpin();
      this.time.delayedCall(550, () => {
        if (this.consoleDeck.getAutoSpinCount() > 0) {
          this.handleSpinRequest();
        }
      });
    }
  }

  private highlightWinningCombinations(winningLines: WinningLineResult[]): void {
    if (!this.activePaylineGraphics) return;
    this.activePaylineGraphics.clear();

    const colXPositions = [240, 540, 840];
    const rowYPositions = [600, 920, 1240];

    winningLines.forEach((wLine) => {
      // Glow individual winning symbols
      wLine.coords.forEach(([col, row]) => {
        this.reels[col]?.setSymbolGlow(row, true);
      });

      // Find payline color definition
      const pDef = CASINO_PAYLINES.find((p) => p.id === wLine.lineId);
      const lineColor = pDef ? pDef.color : 0xffd700;

      // Draw glowing laser line across winning positions
      this.activePaylineGraphics!.lineStyle(6, lineColor, 0.95);
      this.activePaylineGraphics!.beginPath();

      wLine.coords.forEach(([col, row], idx) => {
        const x = colXPositions[col];
        const y = rowYPositions[row];
        if (idx === 0) {
          this.activePaylineGraphics!.moveTo(x, y);
        } else {
          this.activePaylineGraphics!.lineTo(x, y);
        }
      });
      this.activePaylineGraphics!.strokePath();
    });

    // Pulsing line tween
    this.tweens.add({
      targets: this.activePaylineGraphics,
      alpha: { from: 0.45, to: 1 },
      duration: 300,
      yoyo: true,
      repeat: 6,
    });
  }

  private highlightSinglePayline(lineId: number): void {
    if (this.isSpinning) return;
    const line = CASINO_PAYLINES.find((p) => p.id === lineId);
    if (!line || !this.activePaylineGraphics) return;

    this.activePaylineGraphics.clear();
    const colXPositions = [240, 540, 840];
    const rowYPositions = [600, 920, 1240];

    this.activePaylineGraphics.lineStyle(5, line.color, 0.9);
    this.activePaylineGraphics.beginPath();

    line.coords.forEach(([col, row], idx) => {
      const x = colXPositions[col];
      const y = rowYPositions[row];
      if (idx === 0) {
        this.activePaylineGraphics!.moveTo(x, y);
      } else {
        this.activePaylineGraphics!.lineTo(x, y);
      }
    });
    this.activePaylineGraphics!.strokePath();

    this.statusTickerText.setText(`PAYLINE ${line.id}: ${line.name.toUpperCase()}`);

    this.time.delayedCall(2400, () => {
      this.activePaylineGraphics?.clear();
    });
  }

  public clearWinningHighlights(): void {
    this.activePaylineGraphics?.clear();
    for (let col = 0; col < REEL_COUNT; col++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        this.reels[col]?.setSymbolGlow(row, false);
      }
    }
  }

  public resetBoard(): void {
    this.clearWinningHighlights();
    this.statusTickerText.setText('READY TO PLAY • 5 ACTIVE PAYLINES');
  }
}
