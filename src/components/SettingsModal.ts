import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { SoundManager } from '../game-engine/SoundManager';

export interface CasinoSettings {
  soundEnabled: boolean;
  volume: number;
  turboEnabled: boolean;
  spacebarEnabled: boolean;
  stopOnWin: boolean;
}

export class SettingsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private audio: SoundManager;
  private currentSettings: CasinoSettings;
  private onSettingsChange: (settings: CasinoSettings) => void;

  constructor(
    scene: Phaser.Scene,
    onSettingsChange: (settings: CasinoSettings) => void
  ) {
    this.scene = scene;
    this.audio = SoundManager.getInstance();
    this.onSettingsChange = onSettingsChange;

    this.currentSettings = {
      soundEnabled: !this.audio.getMuted(),
      volume: 0.5,
      turboEnabled: false,
      spacebarEnabled: true,
      stopOnWin: false,
    };
  }

  public getSettings(): CasinoSettings {
    return { ...this.currentSettings };
  }

  public isOpen(): boolean {
    return this.container !== null;
  }

  public show(): void {
    if (this.container) return;
    this.audio.playClick();

    const container = this.scene.add.container(0, 0);
    container.setDepth(96);
    this.container = container;

    // Dimmed Backdrop
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.88);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    bg.on('pointerdown', () => this.hide());
    container.add(bg);

    // Modal Card (Mobile Portrait)
    const modalW = 960;
    const modalH = 1380;
    const modalX = (GAME_WIDTH - modalW) / 2;
    const modalY = (GAME_HEIGHT - modalH) / 2;

    const box = this.scene.add.graphics();
    box.fillStyle(0x000000, 0.7);
    box.fillRoundedRect(modalX + 6, modalY + 8, modalW, modalH, 20);

    box.fillGradientStyle(0x1a0c28, 0x1a0c28, 0x100618, 0x100618, 0.98);
    box.fillRoundedRect(modalX, modalY, modalW, modalH, 20);

    box.lineStyle(3.5, 0xd4af37, 1);
    box.strokeRoundedRect(modalX, modalY, modalW, modalH, 20);
    box.lineStyle(1.5, 0xffea88, 0.6);
    box.strokeRoundedRect(modalX + 4, modalY + 4, modalW - 8, modalH - 8, 16);
    container.add(box);

    // Title
    const title = this.scene.add.text(
      GAME_WIDTH / 2,
      modalY + 55,
      '⚙ CASINO GAME SETTINGS',
      {
        fontSize: '34px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5);
    container.add(title);

    // Close Button
    const closeBtn = this.scene.add
      .text(modalX + modalW - 50, modalY + 45, '✕', {
        fontSize: '32px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#ffd700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hide());
    container.add(closeBtn);

    // Options List
    const startY = modalY + 140;
    const itemGap = 100;
    const rowW = modalW - 80;
    const rowX = modalX + 40;

    // 1. Sound FX Volume
    this.createSliderRow(
      container,
      rowX,
      startY,
      rowW,
      'SOUND FX VOLUME',
      this.currentSettings.volume,
      (newVol) => {
        this.currentSettings.volume = newVol;
        this.audio.setVolume(newVol);
        if (newVol > 0 && this.audio.getMuted()) {
          this.audio.toggleMute();
        }
        this.notify();
      }
    );

    // 2. Sound Mute Toggle
    this.createToggleRow(
      container,
      rowX,
      startY + itemGap,
      rowW,
      'MUTE ALL SOUNDS',
      !this.currentSettings.soundEnabled,
      (isMuted) => {
        this.currentSettings.soundEnabled = !isMuted;
        if (this.audio.getMuted() !== isMuted) {
          this.audio.toggleMute();
        }
        this.notify();
      }
    );

    // 3. Turbo Spins
    this.createToggleRow(
      container,
      rowX,
      startY + itemGap * 2,
      rowW,
      'QUICK TURBO SPINS (⚡)',
      this.currentSettings.turboEnabled,
      (enabled) => {
        this.currentSettings.turboEnabled = enabled;
        this.notify();
      }
    );

    // 4. Spacebar to Spin
    this.createToggleRow(
      container,
      rowX,
      startY + itemGap * 3,
      rowW,
      'SPACEBAR HOTKEY SPIN',
      this.currentSettings.spacebarEnabled,
      (enabled) => {
        this.currentSettings.spacebarEnabled = enabled;
        this.notify();
      }
    );

    // 5. Stop Auto-Play on Any Win
    this.createToggleRow(
      container,
      rowX,
      startY + itemGap * 4,
      rowW,
      'AUTO-PLAY STOP ON ANY WIN',
      this.currentSettings.stopOnWin,
      (enabled) => {
        this.currentSettings.stopOnWin = enabled;
        this.notify();
      }
    );

    // Technical & Regulatory Certification Box (Bottom)
    const certY = modalY + modalH - 240;
    const certBg = this.scene.add.graphics();
    certBg.fillStyle(0x0a0614, 0.95);
    certBg.fillRoundedRect(rowX, certY, rowW, 140, 12);
    certBg.lineStyle(1.5, 0xd4af37, 0.5);
    certBg.strokeRoundedRect(rowX, certY, rowW, 140, 12);
    container.add(certBg);

    const certText = this.scene.add.text(
      rowX + 30,
      certY + 24,
      'ROYAL VEGAS 777 • TECHNICAL AUDIT SPECIFICATION\n' +
      '• THEORETICAL RTP: 96.50% | VOLATILITY: MEDIUM-HIGH | 5 ACTIVE LINES\n' +
      '• RNG ENGINE: CRYPTO-STRONG PRNG SEEDED PER JURISDICTION COMPLIANCE\n' +
      '• PROGRESSIVE JACKPOT POOL: SEEDED AT $50,000.00 + 0.5% ROUND CONTRIBUTION\n' +
      '• PWA CAPABLE: STANDALONE ENGINE CERTIFIED WITH OFFLINE CACHE',
      {
        fontSize: '15px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#c5a059',
        lineSpacing: 6,
      }
    );
    container.add(certText);

    // Save & Close Button
    const okBtn = this.scene.add.container(GAME_WIDTH / 2, modalY + modalH - 45);
    const okBg = this.scene.add.graphics();
    okBg.fillGradientStyle(0xffec99, 0xffec99, 0xd4a024, 0x946907, 1);
    okBg.fillRoundedRect(-140, -25, 280, 50, 12);
    okBg.lineStyle(2, 0xffffff, 0.9);
    okBg.strokeRoundedRect(-140, -25, 280, 50, 12);

    const okTxt = this.scene.add
      .text(0, 0, 'APPLY SETTINGS', {
        fontSize: '20px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#1a0d02',
      })
      .setOrigin(0.5);

    okBtn.add([okBg, okTxt]);
    okBtn.setSize(280, 50).setInteractive({ useHandCursor: true });
    okBtn.on('pointerdown', () => this.hide());
    container.add(okBtn);

    container.setAlpha(0);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Linear',
    });
  }

  private createToggleRow(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    label: string,
    initialState: boolean,
    onChange: (val: boolean) => void
  ): void {
    let state = initialState;

    const rowBg = this.scene.add.graphics();
    rowBg.fillStyle(0x0c0612, 0.85);
    rowBg.fillRoundedRect(x, y, w, 70, 10);
    rowBg.lineStyle(1.5, 0x5a3d7a, 0.5);
    rowBg.strokeRoundedRect(x, y, w, 70, 10);
    container.add(rowBg);

    const titleText = this.scene.add.text(x + 24, y + 35, label, {
      fontSize: '20px',
      fontFamily: 'Cinzel, serif',
      fontStyle: 'bold',
      color: '#e5e7eb',
    }).setOrigin(0, 0.5);
    container.add(titleText);

    // Switch container
    const switchX = x + w - 80;
    const switchY = y + 35;
    const switchGraphics = this.scene.add.graphics();
    container.add(switchGraphics);

    const drawSwitch = () => {
      switchGraphics.clear();
      switchGraphics.fillStyle(state ? 0x166534 : 0x27272a, 1);
      switchGraphics.fillRoundedRect(switchX - 35, switchY - 18, 70, 36, 18);
      switchGraphics.lineStyle(2, state ? 0x22c55e : 0x52525b, 0.9);
      switchGraphics.strokeRoundedRect(switchX - 35, switchY - 18, 70, 36, 18);

      // Thumb
      const thumbX = state ? switchX + 16 : switchX - 16;
      switchGraphics.fillStyle(state ? 0x86efac : 0x9ca3af, 1);
      switchGraphics.fillCircle(thumbX, switchY, 13);
    };

    drawSwitch();

    const hitZone = this.scene.add
      .zone(x, y + 35, w, 70)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', () => {
      this.audio.playClick();
      state = !state;
      drawSwitch();
      onChange(state);
    });

    container.add(hitZone);
  }

  private createSliderRow(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    label: string,
    initialVal: number,
    onChange: (val: number) => void
  ): void {
    let currentVal = Phaser.Math.Clamp(initialVal, 0, 1);

    const rowBg = this.scene.add.graphics();
    rowBg.fillStyle(0x0c0612, 0.85);
    rowBg.fillRoundedRect(x, y, w, 70, 10);
    rowBg.lineStyle(1.5, 0x5a3d7a, 0.5);
    rowBg.strokeRoundedRect(x, y, w, 70, 10);
    container.add(rowBg);

    const titleText = this.scene.add.text(x + 24, y + 35, label, {
      fontSize: '20px',
      fontFamily: 'Cinzel, serif',
      fontStyle: 'bold',
      color: '#e5e7eb',
    }).setOrigin(0, 0.5);
    container.add(titleText);

    // Track
    const trackW = 240;
    const trackX = x + w - trackW - 50;
    const trackY = y + 35;

    const trackGraphics = this.scene.add.graphics();
    container.add(trackGraphics);

    const drawTrack = () => {
      trackGraphics.clear();
      // BG track
      trackGraphics.fillStyle(0x27272a, 1);
      trackGraphics.fillRoundedRect(trackX, trackY - 6, trackW, 12, 6);

      // Fill track
      trackGraphics.fillStyle(0xd4af37, 1);
      trackGraphics.fillRoundedRect(trackX, trackY - 6, trackW * currentVal, 12, 6);

      // Knob
      const knobX = trackX + trackW * currentVal;
      trackGraphics.fillStyle(0xffffff, 1);
      trackGraphics.fillCircle(knobX, trackY, 15);
      trackGraphics.lineStyle(2, 0xd4af37, 1);
      trackGraphics.strokeCircle(knobX, trackY, 15);
    };

    drawTrack();

    const hitZone = this.scene.add
      .zone(trackX + trackW / 2, trackY, trackW + 40, 50)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - trackX;
      currentVal = Phaser.Math.Clamp(localX / trackW, 0, 1);
      drawTrack();
      onChange(currentVal);
    });

    container.add(hitZone);
  }

  private notify(): void {
    this.onSettingsChange({ ...this.currentSettings });
  }

  public hide(): void {
    if (!this.container) return;
    this.audio.playClick();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Linear',
      onComplete: () => {
        if (this.container) {
          this.container.destroy();
          this.container = null;
        }
      },
    });
  }
}
