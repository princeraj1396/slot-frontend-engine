import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { PAYLINES } from '../utils/casinoEngine';
import { SoundManager } from '../game-engine/SoundManager';

export class PaytableModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private soundManager: SoundManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.soundManager = SoundManager.getInstance();
  }

  public isOpen(): boolean {
    return this.container !== null;
  }

  public show(): void {
    if (this.container) return;
    this.soundManager.playClick();

    const container = this.scene.add.container(0, 0);
    container.setDepth(90);
    this.container = container;

    // Dark backing
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.88);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    bg.on('pointerdown', () => this.hide());
    container.add(bg);

    // Dialog Window (Vertical mobile optimized)
    const modalW = 960;
    const modalH = 1420;
    const modalX = (GAME_WIDTH - modalW) / 2;
    const modalY = (GAME_HEIGHT - modalH) / 2;

    const modalBox = this.scene.add.graphics();
    // Shadow
    modalBox.fillStyle(0x000000, 0.7);
    modalBox.fillRoundedRect(modalX + 6, modalY + 8, modalW, modalH, 20);

    // Body: Rich deep purple velvet & dark wood plate
    modalBox.fillGradientStyle(0x1a0c28, 0x1a0c28, 0x100618, 0x100618, 0.98);
    modalBox.fillRoundedRect(modalX, modalY, modalW, modalH, 20);

    // Gold borders
    modalBox.lineStyle(3.5, 0xd4af37, 1);
    modalBox.strokeRoundedRect(modalX, modalY, modalW, modalH, 20);
    modalBox.lineStyle(1.5, 0xffea88, 0.6);
    modalBox.strokeRoundedRect(modalX + 4, modalY + 4, modalW - 8, modalH - 8, 16);
    container.add(modalBox);

    // Modal Title
    const title = this.scene.add
      .text(GAME_WIDTH / 2, modalY + 55, '★ PAYTABLE & GAME RULES ★', {
        fontSize: '36px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(title);

    // Close button (X)
    const closeBtn = this.scene.add
      .text(modalX + modalW - 55, modalY + 42, '✕', {
        fontSize: '34px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#ffd700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hide());
    container.add(closeBtn);

    // 1. Symbols & Multipliers Section
    const symSectionHeader = this.scene.add.text(
      GAME_WIDTH / 2,
      modalY + 115,
      'SYMBOL PAYOUT MULTIPLIERS (LINE BET)',
      {
        fontSize: '20px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#c5a059',
        letterSpacing: 1.5,
      }
    ).setOrigin(0.5);
    container.add(symSectionHeader);

    const payoutsList = [
      { key: 'seven', name: 'Lucky 7', mult: '100x Line Bet + PROGRESSIVE JACKPOT', isJackpot: true },
      { key: 'diamond', name: 'Blue Diamond', mult: '50x Line Bet' },
      { key: 'clover', name: 'Four-Leaf Clover', mult: '25x Line Bet' },
      { key: 'cherry', name: 'Twin Cherries', mult: '15x (3 of a kind) • 3x (2 of a kind)' },
      { key: 'blueberry', name: 'Wild Blueberry', mult: '10x Line Bet' },
    ];

    const symStartY = modalY + 160;
    const symSpacing = 105;

    payoutsList.forEach((item, idx) => {
      const y = symStartY + idx * symSpacing;

      // Inset card for each symbol
      const card = this.scene.add.graphics();
      card.fillStyle(0x0c0612, 0.85);
      card.fillRoundedRect(modalX + 40, y, modalW - 80, 88, 12);
      card.lineStyle(1.5, item.isJackpot ? 0xffd700 : 0x5a3d7a, 0.7);
      card.strokeRoundedRect(modalX + 40, y, modalW - 80, 88, 12);
      container.add(card);

      // Symbol Sprite
      const symSprite = this.scene.add.sprite(modalX + 95, y + 44, item.key);
      symSprite.setDisplaySize(72, 72);
      container.add(symSprite);

      // Symbol Name
      const nameText = this.scene.add.text(modalX + 160, y + 16, item.name, {
        fontSize: '24px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: item.isJackpot ? '#ffd700' : '#ffffff',
      });
      container.add(nameText);

      // Multiplier
      const multText = this.scene.add.text(modalX + 160, y + 48, item.mult, {
        fontSize: '18px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: item.isJackpot ? '#ff3b30' : '#00f0ff',
      });
      container.add(multText);
    });

    // 2. Paylines Section
    const paylineHeaderY = modalY + 730;
    const linesHeader = this.scene.add.text(
      GAME_WIDTH / 2,
      paylineHeaderY,
      '5 ACTIVE CASINO PAYLINES',
      {
        fontSize: '22px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#c5a059',
        letterSpacing: 2,
      }
    ).setOrigin(0.5);
    container.add(linesHeader);

    const lineStartY = paylineHeaderY + 40;
    const lineSpacing = 72;

    PAYLINES.forEach((line, idx) => {
      const lineY = lineStartY + idx * lineSpacing;

      const lineRow = this.scene.add.graphics();
      lineRow.fillStyle(0x0c0612, 0.75);
      lineRow.fillRoundedRect(modalX + 40, lineY, modalW - 80, 60, 10);
      lineRow.lineStyle(1.5, line.color, 0.6);
      lineRow.strokeRoundedRect(modalX + 40, lineY, modalW - 80, 60, 10);
      container.add(lineRow);

      // Color Badge
      const badge = this.scene.add.graphics();
      badge.fillStyle(line.color, 1);
      badge.fillRoundedRect(modalX + 60, lineY + 12, 44, 36, 6);
      badge.lineStyle(1, 0xffffff, 0.9);
      badge.strokeRoundedRect(modalX + 60, lineY + 12, 44, 36, 6);
      container.add(badge);

      const numText = this.scene.add.text(modalX + 82, lineY + 30, String(line.id), {
        fontSize: '20px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#000000',
      }).setOrigin(0.5);
      container.add(numText);

      // Description
      const descText = this.scene.add.text(modalX + 125, lineY + 18, line.name, {
        fontSize: '21px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      container.add(descText);

      // Mini Grid Pattern [3x3]
      const miniX = modalX + modalW - 200;
      const miniY = lineY + 12;
      const cellW = 34;
      const cellH = 10;

      for (let col = 0; col < 3; col++) {
        for (let row = 0; row < 3; row++) {
          const isActive = line.coords.some((c) => c[0] === col && c[1] === row);
          const cell = this.scene.add.graphics();
          cell.fillStyle(isActive ? line.color : 0x241d38, isActive ? 1 : 0.4);
          cell.fillRect(miniX + col * (cellW + 4), miniY + row * (cellH + 3), cellW, cellH);
          container.add(cell);
        }
      }
    });

    // Bottom Dismiss Button
    const okBtn = this.scene.add.container(GAME_WIDTH / 2, modalY + modalH - 55);
    const okBg = this.scene.add.graphics();
    okBg.fillGradientStyle(0xffec99, 0xffec99, 0xd4a024, 0x946907, 1);
    okBg.fillRoundedRect(-140, -25, 280, 50, 12);
    okBg.lineStyle(2, 0xffffff, 0.9);
    okBg.strokeRoundedRect(-140, -25, 280, 50, 12);

    const okTxt = this.scene.add
      .text(0, 0, 'CLOSE PAYTABLE', {
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

    // Fade-in effect
    container.setAlpha(0);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Linear',
    });
  }

  public hide(): void {
    if (!this.container) return;
    this.soundManager.playClick();
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
