import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { SoundManager } from '../game-engine/SoundManager';

export interface CasinoConsoleCallbacks {
  onSpin: () => void;
  onBetChange: (newBet: number) => void;
  onAutoSpinChange: (count: number) => void;
  onTurboToggle: (isTurbo: boolean) => void;
  onOpenPaytable: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onRefillBalance: () => void;
}

/**
 * CasinoConsole Component
 * Structured faithfully according to the user's reference screenshot:
 * - Top Center: "WIN $0.00" display
 * - 5 Circular Buttons Row: [SET] [BET / COIN] [SPIN] [AUTO] [TURBO]
 * - Bottom Status Strip: Left [LV 0] badge, Right "BAL $..." + Sound Icon + Wifi/Signal Icon
 * All existing color palette, rich mahogany & gold casino themes, and audio features preserved.
 */
export class CasinoConsole {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private audio: SoundManager;

  // State
  private balance: number = 1000;
  private betIndex: number = 1; // $1.00 as in screenshot
  private readonly betSteps: number[] = [0.5, 1, 5, 10, 20, 50, 100, 200, 500, 1000];
  private lastWin: number = 0;
  private autoSpinCount: number = 0; // 0 = off, 10, 25, 50, 100
  private isTurbo: boolean = false;
  private isSpinning: boolean = false;

  // UI References
  private balanceText!: Phaser.GameObjects.Text;
  private betButtonText!: Phaser.GameObjects.Text;
  private winLabelText!: Phaser.GameObjects.Text;
  private winAmountText!: Phaser.GameObjects.Text;
  private autoBtnText!: Phaser.GameObjects.Text;
  private autoBtnBg!: Phaser.GameObjects.Graphics;
  private turboBtnBg!: Phaser.GameObjects.Graphics;
  private turboBtnIcon!: Phaser.GameObjects.Text;
  private spinButtonBg!: Phaser.GameObjects.Graphics;
  private spinButtonText!: Phaser.GameObjects.Text;
  private spinArrowIcon!: Phaser.GameObjects.Text;
  private spinRingGlow!: Phaser.GameObjects.Graphics;
  private spinBtnContainer!: Phaser.GameObjects.Container;
  private balLabel!: Phaser.GameObjects.Text;
  private soundGfx!: Phaser.GameObjects.Graphics;

  // Popups & Overlays
  private betModalContainer?: Phaser.GameObjects.Container;
  private betModalBackdrop?: Phaser.GameObjects.Zone;
  private setMenuContainer?: Phaser.GameObjects.Container;

  private callbacks: CasinoConsoleCallbacks;

  constructor(
    scene: Phaser.Scene,
    y: number,
    initialBalance: number,
    callbacks: CasinoConsoleCallbacks
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.balance = initialBalance;
    this.audio = SoundManager.getInstance();
    this.container = this.scene.add.container(0, y);
    this.container.setDepth(20);

    this.createDeck();
  }

  public getBet(): number {
    return this.betSteps[this.betIndex];
  }

  public getBalance(): number {
    return this.balance;
  }

  public isTurboMode(): boolean {
    return this.isTurbo;
  }

  public getAutoSpinCount(): number {
    return this.autoSpinCount;
  }

  public decrementAutoSpin(): void {
    if (this.autoSpinCount > 0) {
      this.autoSpinCount--;
      this.updateAutoButtonUI();
    }
  }

  public stopAutoSpin(): void {
    this.autoSpinCount = 0;
    this.updateAutoButtonUI();
  }

  public setBalance(newBalance: number): void {
    this.balance = newBalance;
    if (this.balanceText) {
      this.balanceText.setText(`$${this.balance.toFixed(2)}`);
      if (this.balLabel) {
        this.balLabel.setX(this.balanceText.x - this.balanceText.width - 12);
      }
    }
  }

  public setLastWin(win: number): void {
    this.lastWin = win;
    if (this.winAmountText) {
      this.winAmountText.setText(`$${this.lastWin.toFixed(2)}`);
      if (win > 0) {
        this.winAmountText.setColor('#ffd700');
        this.scene.tweens.add({
          targets: [this.winAmountText, this.winLabelText],
          scale: { from: 1.25, to: 1 },
          duration: 350,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  public setSpinning(spinning: boolean): void {
    this.isSpinning = spinning;
    if (spinning) {
      if (this.betModalContainer) {
        this.closeBetModal();
      }
      if (this.setMenuContainer) {
        this.setMenuContainer.destroy();
        this.setMenuContainer = undefined;
      }
      if (this.autoSpinCount > 0) {
        this.spinButtonText.setText(`AUTO\n${this.autoSpinCount}`);
        this.spinButtonText.setFontSize('22px');
        this.spinArrowIcon.setVisible(false);
      } else {
        this.spinButtonText.setText('STOP');
        this.spinButtonText.setFontSize('28px');
        this.spinArrowIcon.setVisible(false);
      }
      this.spinBtnContainer.setAlpha(0.92);
    } else {
      this.spinButtonText.setText('SPIN');
      this.spinButtonText.setFontSize('26px');
      this.spinArrowIcon.setVisible(true);
      this.spinBtnContainer.setAlpha(1);
    }
  }

  private createDeck(): void {
    const deckHeight = GAME_HEIGHT - this.container.y;

    // 1. Console Deck Base Graphics
    const bg = this.scene.add.graphics();

    // Backdrop shadow behind console
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, -6, GAME_WIDTH, deckHeight + 12);

    // Deep rich polished mahogany wood texture gradient
    bg.fillGradientStyle(0x231109, 0x231109, 0x120703, 0x120703, 1);
    bg.fillRect(0, 0, GAME_WIDTH, deckHeight);

    // Subtle dark woodgrain texture bands
    for (let i = 12; i < deckHeight; i += 24) {
      bg.fillStyle(0x0b0402, 0.35);
      bg.fillRect(0, i, GAME_WIDTH, 8);
    }

    // Top Dual Gold Beveled Rail Trim
    bg.lineStyle(4, 0xd4af37, 1);
    bg.lineBetween(0, 0, GAME_WIDTH, 0);

    bg.lineStyle(2, 0xffea88, 0.85);
    bg.lineBetween(0, 3, GAME_WIDTH, 3);

    bg.lineStyle(1.5, 0x6e4a0d, 0.9);
    bg.lineBetween(0, 5, GAME_WIDTH, 5);

    // Circular Gold Collar for the Center Spin Button
    const spinCenterY = 158;
    bg.fillStyle(0x180c06, 1);
    bg.fillCircle(GAME_WIDTH / 2, spinCenterY, 82);
    bg.lineStyle(3, 0xd4af37, 0.9);
    bg.strokeCircle(GAME_WIDTH / 2, spinCenterY, 82);
    bg.lineStyle(1.5, 0xffea88, 0.6);
    bg.strokeCircle(GAME_WIDTH / 2, spinCenterY, 79);

    this.container.add(bg);

    // 2. TOP CENTER: "WIN $0.00" Display (Directly above the buttons row)
    this.createTopWinDisplay(GAME_WIDTH / 2, 42);

    // 3. THE 5 CIRCULAR BUTTONS ROW:
    // [SET] [BET] [SPIN] [AUTO] [TURBO]
    const buttonRowY = spinCenterY;
    const xPositions = {
      set: 175,
      bet: 350,
      spin: 540,
      auto: 730,
      turbo: 905,
    };

    // Button 1: SET (Gear icon + "SET" label)
    this.createSetButton(xPositions.set, buttonRowY);

    // Button 2: BET / COIN (Coins icon + Bet value, green accent ring)
    this.createBetButton(xPositions.bet, buttonRowY);

    // Button 3: HERO SPIN (Large gold circular button with arrow + "SPIN")
    this.createHeroSpinButton(xPositions.spin, buttonRowY);

    // Button 4: AUTO (Loop arrow + "AUTO" label)
    this.createAutoButton(xPositions.auto, buttonRowY);

    // Button 5: TURBO (Lightning bolt + "TURBO" label)
    this.createTurboButton(xPositions.turbo, buttonRowY);

    // 4. BOTTOM STATUS STRIP:
    // Left: [LV 0] badge | Right: "BAL $..." + Sound Icon + Wifi Icon
    this.createBottomStatusStrip(deckHeight);
  }

  /**
   * Top Center WIN display as seen in the reference screenshot:
   * "WIN Tk 0.00" -> rendered as "WIN $0.00" in glowing gold and white.
   */
  private createTopWinDisplay(x: number, y: number): void {
    const winContainer = this.scene.add.container(x, y);

    this.winLabelText = this.scene.add
      .text(-6, 0, 'WIN ', {
        fontSize: '28px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#f59e0b',
        letterSpacing: 2,
      })
      .setOrigin(1, 0.5);

    this.winAmountText = this.scene.add
      .text(0, 0, `$${this.lastWin.toFixed(2)}`, {
        fontSize: '32px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    winContainer.add([this.winLabelText, this.winAmountText]);
    this.container.add(winContainer);
  }

  /**
   * Button 1 (Far Left): SET Button
   * Dark circular button with gold border, gear icon, and "SET" text.
   */
  private createSetButton(x: number, y: number): void {
    const btn = this.scene.add.container(x, y);
    const radius = 44;

    const bg = this.scene.add.graphics();
    // Drop shadow
    bg.fillStyle(0x000000, 0.65);
    bg.fillCircle(2, 3, radius);

    // Dark sleek metallic face
    bg.fillGradientStyle(0x28323f, 0x28323f, 0x111720, 0x111720, 1);
    bg.fillCircle(0, 0, radius);

    // Metallic beveled border
    bg.lineStyle(2, 0x566b82, 0.85);
    bg.strokeCircle(0, 0, radius);
    bg.lineStyle(1.5, 0xd4af37, 0.4);
    bg.strokeCircle(0, 0, radius - 2);

    // Gear Icon (unicode symbol)
    const icon = this.scene.add
      .text(0, -11, '⚙', {
        fontSize: '32px',
        color: '#d1dbe6',
      })
      .setOrigin(0.5);

    // Label: "SET"
    const label = this.scene.add
      .text(0, 22, 'SET', {
        fontSize: '13px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#cbd5e1',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    btn.add([bg, icon, label]);
    btn.setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.audio.playClick();
      this.toggleSetMenu(x, y - 60);
    });

    

    

    this.applyButtonAnimations(btn);
    this.container.add(btn);
  }

  /**
   * Button 2 (Left-Center): BET Button
   * Styled with emerald green accent ring and coins icon, displaying current bet value.
   * Clicking steps the bet and displays the quick stepper popup!
   */
  private createBetButton(x: number, y: number): void {
    const btn = this.scene.add.container(x, y);
    const radius = 44;

    const bg = this.scene.add.graphics();
    // Drop shadow
    bg.fillStyle(0x000000, 0.65);
    bg.fillCircle(2, 3, radius);

    // Dark sleek background
    bg.fillGradientStyle(0x192823, 0x192823, 0x0c1613, 0x0c1613, 1);
    bg.fillCircle(0, 0, radius);

    // Distinct Emerald Green Ring (matches reference screenshot!)
    bg.lineStyle(2.5, 0x10b981, 0.95);
    bg.strokeCircle(0, 0, radius);
    bg.lineStyle(1.5, 0x059669, 0.7);
    bg.strokeCircle(0, 0, radius - 2);

    // Two overlapping coins graphics
    const coinsGfx = this.scene.add.graphics();
    // Back coin
    coinsGfx.fillStyle(0x10b981, 0.25);
    coinsGfx.fillCircle(6, -15, 10);
    coinsGfx.lineStyle(2, 0x34d399, 0.95);
    coinsGfx.strokeCircle(6, -15, 10);

    // Front coin
    coinsGfx.fillStyle(0x064e3b, 0.4);
    coinsGfx.fillCircle(-4, -9, 11);
    coinsGfx.lineStyle(2, 0x34d399, 1);
    coinsGfx.strokeCircle(-4, -9, 11);
    // Inner coin ridge
    coinsGfx.lineStyle(1, 0xa7f3d0, 0.7);
    coinsGfx.strokeCircle(-4, -9, 7);

    // Label: Current bet (e.g. "$5" or "Tk 1" style)
    this.betButtonText = this.scene.add
      .text(0, 22, `$${this.getBet()}`, {
        fontSize: '15px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#34d399',
      })
      .setOrigin(0.5);

    btn.add([bg, coinsGfx, this.betButtonText]);
    btn.setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      if (this.isSpinning) return;
      this.audio.playClick();
      this.toggleBetModal();
    });

    

    

    this.applyButtonAnimations(btn);
    this.container.add(btn);
  }

  /**
   * Button 3 (Center): HERO SPIN BUTTON
   * Prominent, radiant circular golden button with circular arrow icon and "SPIN" text.
   */
  private createHeroSpinButton(x: number, y: number): void {
    this.spinBtnContainer = this.scene.add.container(x, y);
    const radius = 68;

    // Glowing pulsating aura ring
    this.spinRingGlow = this.scene.add.graphics();
    this.spinRingGlow.lineStyle(7, 0xffd700, 0.7);
    this.spinRingGlow.strokeCircle(0, 0, radius + 9);
    this.spinRingGlow.lineStyle(3, 0xffffff, 0.85);
    this.spinRingGlow.strokeCircle(0, 0, radius + 5);

    this.scene.tweens.add({
      targets: this.spinRingGlow,
      alpha: { from: 0.35, to: 1 },
      scale: { from: 0.96, to: 1.05 },
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3D Layered Golden Disc Face
    this.spinButtonBg = this.scene.add.graphics();
    this.drawSpinButtonGraphics(false, radius);

    // Circular arrow icon ↻
    this.spinArrowIcon = this.scene.add
      .text(0, -18, '↻', {
        fontSize: '44px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#1a0c02',
      })
      .setOrigin(0.5);

    // Text: "SPIN"
    this.spinButtonText = this.scene.add
      .text(0, 22, 'SPIN', {
        fontSize: '26px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#1a0c02',
        stroke: '#ffd700',
        strokeThickness: 1,
        align: 'center',
      })
      .setOrigin(0.5);

    this.spinBtnContainer.add([
      this.spinRingGlow,
      this.spinButtonBg,
      this.spinArrowIcon,
      this.spinButtonText,
    ]);
    this.spinBtnContainer
      .setSize(radius * 2 + 16, radius * 2 + 16)
      .setInteractive({ useHandCursor: true });

    this.spinBtnContainer.on('pointerdown', () => {
      if (this.isSpinning) return;
      this.audio.playClick();
      this.drawSpinButtonGraphics(true, radius);
      this.callbacks.onSpin();
    });

    this.spinBtnContainer.on('pointerup', () => {
      this.drawSpinButtonGraphics(false, radius);
    });

    this.spinBtnContainer.on('pointerout', () => {
      this.drawSpinButtonGraphics(false, radius);
    });

    this.applyButtonAnimations(this.spinBtnContainer, 0.95, 1.08);
    this.container.add(this.spinBtnContainer);
  }

  private drawSpinButtonGraphics(isPressed: boolean, baseRadius: number): void {
    this.spinButtonBg.clear();
    const r = isPressed ? baseRadius - 3 : baseRadius;

    // Outer Dark Shadow
    this.spinButtonBg.fillStyle(0x000000, 0.7);
    this.spinButtonBg.fillCircle(2, 4, r);

    // Beveled Gold Outer Ring
    this.spinButtonBg.fillGradientStyle(0xffeb99, 0xffd700, 0xb8860b, 0x8b6508, 1);
    this.spinButtonBg.fillCircle(0, 0, r);

    // Concentric Inner Gold Sun Face
    this.spinButtonBg.fillGradientStyle(0xfffae0, 0xffe680, 0xd4a024, 0xb8860b, 1);
    this.spinButtonBg.fillCircle(0, 0, r - 7);

    // Inner Gloss Highlight Ring
    this.spinButtonBg.lineStyle(2.5, 0xffffff, 0.85);
    this.spinButtonBg.strokeCircle(0, 0, r - 8);

    // Recessed Lip
    this.spinButtonBg.lineStyle(1.5, 0x7c540a, 0.7);
    this.spinButtonBg.strokeCircle(0, 0, r - 12);
  }

  /**
   * Button 4 (Right-Center): AUTO Button
   * Circular button with loop arrow icon and "AUTO" text.
   */
  private createAutoButton(x: number, y: number): void {
    const btn = this.scene.add.container(x, y);
    const radius = 44;

    this.autoBtnBg = this.scene.add.graphics();
    this.drawAutoButtonGraphics(false);

    // Loop arrow icon ↺
    const icon = this.scene.add
      .text(0, -11, '↺', {
        fontSize: '34px',
        color: '#ffd700',
      })
      .setOrigin(0.5);

    // Text: "AUTO" (or 10x, 25x when active)
    this.autoBtnText = this.scene.add
      .text(0, 22, 'AUTO', {
        fontSize: '13px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    btn.add([this.autoBtnBg, icon, this.autoBtnText]);
    btn.setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.audio.playClick();
      const options = [0, 10, 25, 50, 100];
      const currentIdx = options.indexOf(this.autoSpinCount);
      const nextIdx = (currentIdx + 1) % options.length;
      this.autoSpinCount = options[nextIdx];
      this.updateAutoButtonUI();
      this.callbacks.onAutoSpinChange(this.autoSpinCount);
    });

    

    

    this.applyButtonAnimations(btn);
    this.container.add(btn);
  }

  private drawAutoButtonGraphics(isActive: boolean): void {
    this.autoBtnBg.clear();
    const radius = 44;

    // Drop shadow
    this.autoBtnBg.fillStyle(0x000000, 0.65);
    this.autoBtnBg.fillCircle(2, 3, radius);

    if (isActive) {
      // Highlighted glowing gold background when armed
      this.autoBtnBg.fillGradientStyle(0x4a2a0c, 0x4a2a0c, 0x241203, 0x241203, 1);
      this.autoBtnBg.fillCircle(0, 0, radius);
      this.autoBtnBg.lineStyle(2.5, 0xffd700, 1);
      this.autoBtnBg.strokeCircle(0, 0, radius);
      this.autoBtnBg.lineStyle(1.5, 0xffeb99, 0.8);
      this.autoBtnBg.strokeCircle(0, 0, radius - 2);
    } else {
      // Standard dark metallic face
      this.autoBtnBg.fillGradientStyle(0x28323f, 0x28323f, 0x111720, 0x111720, 1);
      this.autoBtnBg.fillCircle(0, 0, radius);
      this.autoBtnBg.lineStyle(2, 0x566b82, 0.85);
      this.autoBtnBg.strokeCircle(0, 0, radius);
      this.autoBtnBg.lineStyle(1.5, 0xd4af37, 0.4);
      this.autoBtnBg.strokeCircle(0, 0, radius - 2);
    }
  }

  public updateAutoButtonUI(): void {
    if (this.autoSpinCount > 0) {
      this.autoBtnText.setText(`${this.autoSpinCount}x`);
      this.autoBtnText.setColor('#ffd700');
      this.drawAutoButtonGraphics(true);
    } else {
      this.autoBtnText.setText('AUTO');
      this.autoBtnText.setColor('#ffd700');
      this.drawAutoButtonGraphics(false);
    }
  }

  /**
   * Button 5 (Far Right): TURBO Button
   * Circular button with lightning bolt icon ⚡ and "TURBO" text.
   */
  private createTurboButton(x: number, y: number): void {
    const btn = this.scene.add.container(x, y);
    const radius = 44;

    this.turboBtnBg = this.scene.add.graphics();
    this.drawTurboButtonGraphics(false);

    // Lightning bolt icon ⚡
    this.turboBtnIcon = this.scene.add
      .text(0, -11, '⚡', {
        fontSize: '34px',
        color: '#ffd700',
      })
      .setOrigin(0.5);

    // Label: "TURBO"
    const label = this.scene.add
      .text(0, 22, 'TURBO', {
        fontSize: '12px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    btn.add([this.turboBtnBg, this.turboBtnIcon, label]);
    btn.setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.audio.playClick();
      this.isTurbo = !this.isTurbo;
      this.drawTurboButtonGraphics(this.isTurbo);
      this.callbacks.onTurboToggle(this.isTurbo);
    });

    

    

    this.applyButtonAnimations(btn);
    this.container.add(btn);
  }

  private drawTurboButtonGraphics(isActive: boolean): void {
    this.turboBtnBg.clear();
    const radius = 44;

    // Drop shadow
    this.turboBtnBg.fillStyle(0x000000, 0.65);
    this.turboBtnBg.fillCircle(2, 3, radius);

    if (isActive) {
      // Radiant lightning electric gold background
      this.turboBtnBg.fillGradientStyle(0x4a3608, 0x4a3608, 0x291c02, 0x291c02, 1);
      this.turboBtnBg.fillCircle(0, 0, radius);
      this.turboBtnBg.lineStyle(2.5, 0xffd700, 1);
      this.turboBtnBg.strokeCircle(0, 0, radius);
      this.turboBtnBg.lineStyle(1.5, 0xffffff, 0.8);
      this.turboBtnBg.strokeCircle(0, 0, radius - 2);

      if (this.turboBtnIcon) {
        this.turboBtnIcon.setColor('#ffffff');
      }
    } else {
      // Standard dark metallic face
      this.turboBtnBg.fillGradientStyle(0x28323f, 0x28323f, 0x111720, 0x111720, 1);
      this.turboBtnBg.fillCircle(0, 0, radius);
      this.turboBtnBg.lineStyle(2, 0x566b82, 0.85);
      this.turboBtnBg.strokeCircle(0, 0, radius);
      this.turboBtnBg.lineStyle(1.5, 0xd4af37, 0.4);
      this.turboBtnBg.strokeCircle(0, 0, radius - 2);

      if (this.turboBtnIcon) {
        this.turboBtnIcon.setColor('#ffd700');
      }
    }
  }

  /**
   * Bottom Status Strip:
   * Left: [LV 0] badge
   * Right: "BAL $..." + Sound Icon + Wifi/Signal Icon
   */
  
  private applyButtonAnimations(btn: any, scaleDown: number = 0.94, scaleHover: number = 1.04): void {
    btn.on('pointerover', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: scaleHover,
        duration: 150,
        ease: 'Sine.easeOut',
      });
    });

    btn.on('pointerout', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: 1,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    });

    btn.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: scaleDown,
        duration: 100,
        ease: 'Sine.easeOut',
      });
    });

    btn.on('pointerup', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: scaleHover,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });
  }

  private createBottomStatusStrip(deckHeight: number): void {
    const stripY = 266;
    const stripHeight = deckHeight - stripY;

    // Dark sleek footer bar background
    const footerBg = this.scene.add.graphics();
    footerBg.fillStyle(0x0a0f16, 1);
    footerBg.fillRect(0, stripY, GAME_WIDTH, stripHeight);

    // Clean subtle gold divider rail
    footerBg.lineStyle(1.5, 0x1e293b, 1);
    footerBg.lineBetween(0, stripY, GAME_WIDTH, stripY);
    footerBg.lineStyle(1, 0xd4af37, 0.35);
    footerBg.lineBetween(0, stripY + 1, GAME_WIDTH, stripY + 1);
    this.container.add(footerBg);

    // Vertically centered in the bottom strip
    const contentY = stripY + stripHeight / 2;

    // 1. LEFT: [LV 0] Badge (Clean, prominent rounded badge as in reference screenshot)
    const lvBadge = this.scene.add.container(115, contentY);
    const lvBg = this.scene.add.graphics();
    const badgeW = 112;
    const badgeH = 50;

    lvBg.fillStyle(0x1e293b, 1);
    lvBg.fillRoundedRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 8);
    lvBg.lineStyle(1.8, 0x475569, 0.95);
    lvBg.strokeRoundedRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 8);

    const lvText = this.scene.add
      .text(0, 0, 'LV 0', {
        fontSize: '24px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#e2e8f0',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    lvBadge.add([lvBg, lvText]);
    this.container.add(lvBadge);

    // 2. RIGHT: "BAL $..." (Properly scaled, bold and clear)
    // Right anchor at X = 880 to guarantee no overlap with sound and wifi icons
    this.balanceText = this.scene.add
      .text(880, contentY, `$${this.balance.toFixed(2)}`, {
        fontSize: '32px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5);

    this.balLabel = this.scene.add
      .text(
        this.balanceText.x - this.balanceText.width - 12,
        contentY,
        'BAL',
        {
          fontSize: '28px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontStyle: 'bold',
          color: '#f59e0b',
          letterSpacing: 2,
        }
      )
      .setOrigin(1, 0.5);

    this.container.add([this.balLabel, this.balanceText]);

    // Click balance zone to refill bankroll
    const balHit = this.scene.add
      .zone(740, contentY, 280, 56)
      .setInteractive({ useHandCursor: true });
    balHit.on('pointerdown', () => {
      this.audio.playClick();
      this.callbacks.onRefillBalance();
    });
    this.applyButtonAnimations(balHit, 0.95, 1.05);
    this.container.add(balHit);

    // 3. SOUND / SPEAKER ICON (Golden vector speaker with acoustic arcs matching screenshot)
    const soundContainer = this.scene.add.container(945, contentY);
    this.soundGfx = this.scene.add.graphics();
    this.drawSoundIcon(this.audio.getMuted());

    soundContainer.add(this.soundGfx);
    soundContainer.setSize(54, 54).setInteractive({ useHandCursor: true });

    soundContainer.on('pointerdown', () => {
      const muted = this.audio.toggleMute();
      this.drawSoundIcon(muted);
      if (!muted) {
        this.audio.playClick();
      }
    });
    this.applyButtonAnimations(soundContainer, 0.9, 1.1);
    this.container.add(soundContainer);

    // 4. WIFI / SIGNAL ICON (Vivid emerald green 3-arc signal icon matching screenshot)
    const wifiContainer = this.scene.add.container(1018, contentY);
    const wifiGfx = this.scene.add.graphics();
    wifiGfx.lineStyle(3.5, 0x10b981, 1);

    // Outer wave
    wifiGfx.beginPath();
    wifiGfx.arc(0, 8, 22, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(320), false);
    wifiGfx.strokePath();

    // Middle wave
    wifiGfx.beginPath();
    wifiGfx.arc(0, 8, 14, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(320), false);
    wifiGfx.strokePath();

    // Inner dot
    wifiGfx.fillStyle(0x10b981, 1);
    wifiGfx.fillCircle(0, 8, 4);

    wifiContainer.add(wifiGfx);
    this.container.add(wifiContainer);
  }

  private drawSoundIcon(isMuted: boolean): void {
    this.soundGfx.clear();
    const color = isMuted ? 0x64748b : 0xf59e0b;
    this.soundGfx.fillStyle(color, 1);

    // Speaker body
    this.soundGfx.fillRect(-12, -7, 8, 14);

    // Cone flare
    this.soundGfx.beginPath();
    this.soundGfx.moveTo(-4, -7);
    this.soundGfx.lineTo(5, -14);
    this.soundGfx.lineTo(5, 14);
    this.soundGfx.lineTo(-4, 7);
    this.soundGfx.closePath();
    this.soundGfx.fillPath();

    if (!isMuted) {
      this.soundGfx.lineStyle(3, color, 1);
      // Inner wave
      this.soundGfx.beginPath();
      this.soundGfx.arc(
        3,
        0,
        11,
        -Phaser.Math.DegToRad(42),
        Phaser.Math.DegToRad(42),
        false
      );
      this.soundGfx.strokePath();

      // Outer wave
      this.soundGfx.beginPath();
      this.soundGfx.arc(
        3,
        0,
        18,
        -Phaser.Math.DegToRad(42),
        Phaser.Math.DegToRad(42),
        false
      );
      this.soundGfx.strokePath();
    } else {
      // Mute red diagonal slash
      this.soundGfx.lineStyle(3, 0xef4444, 1);
      this.soundGfx.lineBetween(-12, -12, 16, 12);
    }
  }

  /**
   * Bet Amount Dropdown Modal:
   * Opens when clicking the BET button, displaying a 2x5 grid of bet amounts:
   * [ 0.5 ]  [ 1 ]
   * [ 5 ]    [ 10 ]
   * [ 20 ]   [ 50 ]
   * [ 100 ]  [ 200 ]
   * [ 500 ]  [ 1000 ]
   * Matches the exact layout, colors, and active emerald green highlight from the reference screenshot.
   */
  public toggleBetModal(): void {
    if (this.betModalContainer) {
      this.closeBetModal();
    } else {
      this.openBetModal();
    }
  }

  public closeBetModal(): void {
    if (this.betModalBackdrop) {
      this.betModalBackdrop.destroy();
      this.betModalBackdrop = undefined;
    }
    this.container.setDepth(20);

    if (this.betModalContainer) {
      const container = this.betModalContainer;
      this.betModalContainer = undefined;
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        scale: 0.95,
        duration: 160,
        ease: 'Sine.easeIn',
        onComplete: () => {
          container.destroy();
        },
      });
    }
  }

  
  public openBetModal(): void {
    if (this.isSpinning) return;

    if (this.setMenuContainer) {
      this.setMenuContainer.destroy();
      this.setMenuContainer = undefined;
    }
    if (this.betModalContainer) {
      this.closeBetModal();
    }

    // Bring console container to top depth
    this.container.setDepth(30);

    // Full-screen invisible backdrop to detect outside clicks
    this.betModalBackdrop = this.scene.add
      .zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 2, GAME_HEIGHT * 2)
      .setInteractive({ useHandCursor: false })
      .setDepth(25);

    this.betModalBackdrop.on('pointerdown', () => {
      this.closeBetModal();
    });

    // Well-proportioned compact modal placed right above the BET button area
    const modalW = 420;
    const modalH = 360;
    const modalX = 140; // Aligned nicely above SET & BET buttons
    const modalBottomY = 75;
    const modalY = modalBottomY - modalH; // -285

    const modal = this.scene.add.container(modalX, modalY);
    modal.setDepth(35);

    // 1. Container Background & Border
    const bg = this.scene.add.graphics();
    // Drop shadow
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(4, 6, modalW, modalH, 18);

    // Main dark slate background
    bg.fillGradientStyle(0x131d2a, 0x131d2a, 0x0c131d, 0x0c131d, 1);
    bg.fillRoundedRect(0, 0, modalW, modalH, 18);

    // Sleek gold & slate border
    bg.lineStyle(2.5, 0xd4af37, 0.85);
    bg.strokeRoundedRect(0, 0, modalW, modalH, 18);

    // Subtle inner highlight edge
    bg.lineStyle(1, 0x33445c, 0.4);
    bg.strokeRoundedRect(2, 2, modalW - 4, modalH - 4, 16);
    modal.add(bg);

    // 2. 2-Column × 5-Row Grid of Bet Denominations
    const gridData = [
      [{ val: 0.5, label: '0.5', idx: 0 }, { val: 1, label: '1', idx: 1 }],
      [{ val: 5, label: '5', idx: 2 }, { val: 10, label: '10', idx: 3 }],
      [{ val: 20, label: '20', idx: 4 }, { val: 50, label: '50', idx: 5 }],
      [{ val: 100, label: '100', idx: 6 }, { val: 200, label: '200', idx: 7 }],
      [{ val: 500, label: '500', idx: 8 }, { val: 1000, label: '1000', idx: 9 }],
    ];

    const paddingX = 16;
    const paddingY = 16;
    const gapX = 12;
    const gapY = 10;
    const btnW = (modalW - paddingX * 2 - gapX) / 2; // 188px
    const btnH = (modalH - paddingY * 2 - gapY * 4) / 5; // ~57.6px

    const buttonItems: {
      gfx: Phaser.GameObjects.Graphics;
      txt: Phaser.GameObjects.Text;
      idx: number;
    }[] = [];

    const drawTile = (gfx: Phaser.GameObjects.Graphics, isSelected: boolean, isHovered: boolean = false) => {
      gfx.clear();
      const r = 10;
      if (isSelected) {
        // Bright emerald green background
        gfx.fillStyle(0x2ecc71, 1);
        gfx.fillRoundedRect(0, 0, btnW, btnH, r);
        gfx.lineStyle(2, 0x48e68b, 1);
        gfx.strokeRoundedRect(0, 0, btnW, btnH, r);
      } else {
        // Dark slate-blue button card
        const fillCol = isHovered ? 0x28384b : 0x1a2634;
        gfx.fillStyle(fillCol, 1);
        gfx.fillRoundedRect(0, 0, btnW, btnH, r);
        gfx.lineStyle(1.5, isHovered ? 0x3d536c : 0x27384a, 1);
        gfx.strokeRoundedRect(0, 0, btnW, btnH, r);
      }
    };

    gridData.forEach((row, rowIdx) => {
      row.forEach((item, colIdx) => {
        const itemX = paddingX + colIdx * (btnW + gapX);
        const itemY = paddingY + rowIdx * (btnH + gapY);

        const btnContainer = this.scene.add.container(itemX, itemY);
        const isSelected = this.betIndex === item.idx;

        const tileGfx = this.scene.add.graphics();
        drawTile(tileGfx, isSelected);

        const txt = this.scene.add
          .text(btnW / 2, btnH / 2, item.label, {
            fontSize: '26px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontStyle: 'bold',
            color: isSelected ? '#062a19' : '#ffffff',
          })
          .setOrigin(0.5);

        buttonItems.push({ gfx: tileGfx, txt, idx: item.idx });

        const zone = this.scene.add
          .zone(btnW / 2, btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
          this.audio.playClick();
          this.betIndex = item.idx;
          this.updateBetUI();

          buttonItems.forEach((btn) => {
            const active = btn.idx === this.betIndex;
            drawTile(btn.gfx, active);
            btn.txt.setColor(active ? '#062a19' : '#ffffff');
          });

          this.scene.time.delayedCall(220, () => {
            this.closeBetModal();
          });
        });

        zone.on('pointerover', () => {
          if (this.betIndex !== item.idx) {
            drawTile(tileGfx, false, true);
          }
        });

        zone.on('pointerout', () => {
          if (this.betIndex !== item.idx) {
            drawTile(tileGfx, false, false);
          }
        });

        btnContainer.add([tileGfx, txt, zone]);
        modal.add(btnContainer);
      });
    });

    this.container.add(modal);
    this.betModalContainer = modal;

    // Smooth Entrance Animation
    modal.setAlpha(0);
    modal.setScale(0.9);
    this.scene.tweens.add({
      targets: modal,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });
  }

  private toggleSetMenu(x: number, y: number): void {
    if (this.setMenuContainer) {
      this.scene.tweens.add({
        targets: this.setMenuContainer,
        scale: 0.9,
        alpha: 0,
        duration: 120,
        onComplete: () => {
          if (this.setMenuContainer) {
            this.setMenuContainer.destroy();
            this.setMenuContainer = undefined;
          }
        },
      });
      return;
    }

    if (this.betModalContainer) {
      this.closeBetModal();
    }

    const w = 340;
    const itemH = 68;
    const paddingY = 16;
    const h = itemH * 3 + paddingY * 2;
    const menu = this.scene.add.container(x + 75, y - 90);
    menu.setDepth(35);

    const bg = this.scene.add.graphics();
    // Drop shadow
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 18);

    // Main background
    bg.fillGradientStyle(0x131d2a, 0x131d2a, 0x0c131d, 0x0c131d, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);

    // Gold border
    bg.lineStyle(2.5, 0xd4af37, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

    // Inner highlight
    bg.lineStyle(1, 0x33445c, 0.4);
    bg.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 16);
    menu.add(bg);

    const items = [
      {
        icon: '📜',
        text: 'PAYTABLE',
        action: () => this.callbacks.onOpenPaytable(),
      },
      {
        icon: '📊',
        text: 'HISTORY',
        action: () => this.callbacks.onOpenHistory(),
      },
      {
        icon: '⚙️',
        text: 'SETTINGS',
        action: () => this.callbacks.onOpenSettings(),
      },
    ];

    items.forEach((item, idx) => {
      const itemY = -h / 2 + paddingY + idx * itemH + itemH / 2;

      // Item highlight background for hover
      const itemBg = this.scene.add.graphics();
      const drawItemBg = (hovered: boolean) => {
        itemBg.clear();
        if (hovered) {
          itemBg.fillStyle(0x28384b, 0.9);
          itemBg.fillRoundedRect(-w / 2 + 10, itemY - itemH / 2 + 4, w - 20, itemH - 8, 10);
        }
      };

      const t = this.scene.add
        .text(0, itemY, `${item.icon}  ${item.text}`, {
          fontSize: '24px',
          fontFamily: 'Space Grotesk, Cinzel, sans-serif',
          fontStyle: 'bold',
          color: '#ffd700',
        })
        .setOrigin(0.5);

      const zone = this.scene.add
        .zone(0, itemY, w - 16, itemH)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerdown', () => {
        this.audio.playClick();
        if (this.setMenuContainer) {
          this.scene.tweens.add({
            targets: this.setMenuContainer,
            scale: 0.9,
            alpha: 0,
            duration: 100,
            onComplete: () => {
              if (this.setMenuContainer) {
                this.setMenuContainer.destroy();
                this.setMenuContainer = undefined;
              }
            },
          });
        }
        item.action();
      });

      zone.on('pointerover', () => {
        drawItemBg(true);
        t.setColor('#ffffff');
      });

      zone.on('pointerout', () => {
        drawItemBg(false);
        t.setColor('#ffd700');
      });

      menu.add([itemBg, t, zone]);
    });

    this.container.add(menu);
    this.setMenuContainer = menu;

    // Smooth entrance
    menu.setScale(0.85);
    menu.setAlpha(0);
    this.scene.tweens.add({
      targets: menu,
      scale: 1,
      alpha: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });

    // Auto-close menu if untouched for 5 seconds
    this.scene.time.delayedCall(5000, () => {
      if (this.setMenuContainer === menu) {
        this.scene.tweens.add({
          targets: menu,
          scale: 0.9,
          alpha: 0,
          duration: 120,
          onComplete: () => {
            if (this.setMenuContainer === menu) {
              menu.destroy();
              this.setMenuContainer = undefined;
            }
          },
        });
      }
    });
  }

  private updateBetUI(): void {
    const newBet = this.getBet();
    if (this.betButtonText) {
      this.betButtonText.setText(`$${newBet}`);
    }
    this.callbacks.onBetChange(newBet);
  }
}
