import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { MockPlatformServer } from '../api/MockPlatformServer';
import { GameHistoryItem } from '../api/CasinoPlatformBridge';
import { SoundManager } from '../game-engine/SoundManager';

export class GameHistoryModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private server: MockPlatformServer;
  private soundManager: SoundManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.server = MockPlatformServer.getInstance();
    this.soundManager = SoundManager.getInstance();
  }

  public isOpen(): boolean {
    return this.container !== null;
  }

  public show(): void {
    if (this.container) return;
    this.soundManager.playClick();

    const container = this.scene.add.container(0, 0);
    container.setDepth(92);
    this.container = container;

    // Dark backdrop with dismiss click
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.88);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    bg.on('pointerdown', () => this.hide());
    container.add(bg);

    // Modal Box (Vertical mobile optimized)
    const modalW = 960;
    const modalH = 1380;
    const modalX = (GAME_WIDTH - modalW) / 2;
    const modalY = (GAME_HEIGHT - modalH) / 2;

    const modalBox = this.scene.add.graphics();
    modalBox.fillStyle(0x000000, 0.7);
    modalBox.fillRoundedRect(modalX + 6, modalY + 8, modalW, modalH, 20);

    modalBox.fillGradientStyle(0x1a0c28, 0x1a0c28, 0x100618, 0x100618, 0.98);
    modalBox.fillRoundedRect(modalX, modalY, modalW, modalH, 20);

    // Gold Bevel Borders
    modalBox.lineStyle(3.5, 0xd4af37, 1);
    modalBox.strokeRoundedRect(modalX, modalY, modalW, modalH, 20);
    modalBox.lineStyle(1.5, 0xffea88, 0.6);
    modalBox.strokeRoundedRect(modalX + 4, modalY + 4, modalW - 8, modalH - 8, 16);
    container.add(modalBox);

    // Title
    const title = this.scene.add.text(
      GAME_WIDTH / 2,
      modalY + 50,
      '★ GAME HISTORY & AUDIT LOG ★',
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

    // Close button (X)
    const closeBtn = this.scene.add
      .text(modalX + modalW - 50, modalY + 42, '✕', {
        fontSize: '32px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#ffd700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hide());
    container.add(closeBtn);

    // Table Header
    const headerY = modalY + 105;
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x0c0614, 0.95);
    headerBg.fillRoundedRect(modalX + 30, headerY, modalW - 60, 48, 8);
    headerBg.lineStyle(1, 0xd4af37, 0.5);
    headerBg.strokeRoundedRect(modalX + 30, headerY, modalW - 60, 48, 8);
    container.add(headerBg);

    const headers = [
      { text: 'ROUND ID', x: modalX + 50 },
      { text: 'TIME', x: modalX + 320 },
      { text: 'BET', x: modalX + 480 },
      { text: 'PAYOUT', x: modalX + 630 },
      { text: 'STATUS', x: modalX + 800 },
    ];

    headers.forEach((h) => {
      const hText = this.scene.add.text(h.x, headerY + 24, h.text, {
        fontSize: '16px',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        color: '#c5a059',
      }).setOrigin(0, 0.5);
      container.add(hText);
    });

    // Fetch Records
    const history = this.server.getHistory();
    const rowStartY = headerY + 60;
    const rowHeight = 90;
    const maxVisibleRows = 10;

    if (history.length === 0) {
      const emptyText = this.scene.add.text(
        GAME_WIDTH / 2,
        modalY + modalH / 2,
        'NO GAME ROUNDS PLAYED YET\nPRESS SPIN TO GENERATE CASINO AUDIT TRAIL',
        {
          fontSize: '22px',
          fontFamily: 'Cinzel, serif',
          color: '#9ca3af',
          align: 'center',
          lineSpacing: 10,
        }
      ).setOrigin(0.5);
      container.add(emptyText);
    } else {
      const displayRows = history.slice(0, maxVisibleRows);
      displayRows.forEach((rec: GameHistoryItem, idx: number) => {
        const rowY = rowStartY + idx * rowHeight;

        // Row background
        const rowBg = this.scene.add.graphics();
        const isWin = rec.win > 0;
        rowBg.fillStyle(idx % 2 === 0 ? 0x12081e : 0x180c26, 0.9);
        rowBg.fillRoundedRect(modalX + 30, rowY, modalW - 60, rowHeight - 8, 8);
        if (isWin) {
          rowBg.lineStyle(1.5, 0xd4af37, 0.6);
          rowBg.strokeRoundedRect(modalX + 30, rowY, modalW - 60, rowHeight - 8, 8);
        }
        container.add(rowBg);

        // Round ID
        const roundText = this.scene.add.text(
          modalX + 50,
          rowY + 24,
          rec.roundId.substring(0, 16),
          {
            fontSize: '17px',
            fontFamily: 'Space Grotesk, monospace',
            color: '#e2e8f0',
          }
        );
        container.add(roundText);

        // Time
        const timeStr = new Date(rec.timestamp).toLocaleTimeString();
        const timeText = this.scene.add.text(modalX + 320, rowY + 24, timeStr, {
          fontSize: '17px',
          fontFamily: 'Space Grotesk, sans-serif',
          color: '#9ca3af',
        });
        container.add(timeText);

        // Bet
        const betText = this.scene.add.text(
          modalX + 480,
          rowY + 24,
          `$${rec.bet.toFixed(2)}`,
          {
            fontSize: '18px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontStyle: 'bold',
            color: '#ffffff',
          }
        );
        container.add(betText);

        // Payout
        const payoutText = this.scene.add.text(
          modalX + 630,
          rowY + 24,
          `$${rec.win.toFixed(2)}`,
          {
            fontSize: '18px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontStyle: 'bold',
            color: isWin ? '#4ade80' : '#6b7280',
          }
        );
        container.add(payoutText);

        // Status Badge
        const badge = this.scene.add.graphics();
        badge.fillStyle(isWin ? 0x166534 : 0x27272a, 1);
        badge.fillRoundedRect(modalX + 800, rowY + 12, 100, 32, 6);
        badge.lineStyle(1, isWin ? 0x22c55e : 0x52525b, 0.8);
        badge.strokeRoundedRect(modalX + 800, rowY + 12, 100, 32, 6);
        container.add(badge);

        const statusText = this.scene.add.text(
          modalX + 850,
          rowY + 28,
          isWin ? 'WIN' : 'LOSS',
          {
            fontSize: '15px',
            fontFamily: 'Cinzel, serif',
            fontStyle: 'bold',
            color: isWin ? '#86efac' : '#9ca3af',
          }
        ).setOrigin(0.5);
        container.add(statusText);

        // Secondary line with details
        const detailStr = isWin
          ? `Won on ${rec.winningLinesCount} lines • Mult: ${rec.multiplier.toFixed(1)}x • Hash: ${rec.roundId.substring(0, 10)}...`
          : `No matches • PRNG Seed: ${rec.roundId.substring(0, 12)}...`;
        const detailText = this.scene.add.text(modalX + 50, rowY + 54, detailStr, {
          fontSize: '13px',
          fontFamily: 'Space Grotesk, sans-serif',
          color: isWin ? '#ffd700' : '#64748b',
        });
        container.add(detailText);
      });
    }

    // Dismiss Button
    const okBtn = this.scene.add.container(GAME_WIDTH / 2, modalY + modalH - 55);
    const okBg = this.scene.add.graphics();
    okBg.fillGradientStyle(0xffec99, 0xffec99, 0xd4a024, 0x946907, 1);
    okBg.fillRoundedRect(-140, -25, 280, 50, 12);
    okBg.lineStyle(2, 0xffffff, 0.9);
    okBg.strokeRoundedRect(-140, -25, 280, 50, 12);

    const okTxt = this.scene.add
      .text(0, 0, 'CLOSE LOG', {
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
