import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WIN_DISPLAY_DURATION } from '../config/constants';

/**
 * WinDisplay Component - Shows win animations and confetti
 * Part of the frontend presentation layer
 */
export class WinDisplay {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show win animation with overlay, confetti, and text
   * @param onComplete - Callback when animation finishes
   */
  public show(onComplete: () => void): void {
    const overlay = this.createOverlay();
    this.addConfetti();
    this.showWinText(overlay, onComplete);
  }

  /**
   * Create semi-transparent overlay
   */
  private createOverlay(): Phaser.GameObjects.Graphics {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(10);
    return overlay;
  }

  /**
   * Add confetti particle emitter
   */
  private addConfetti(): void {
    const confettiEmitter = this.scene.add.particles(0, 0, 'confetti', {
      speed: 200,
      lifespan: 2000,
      gravityY: 500,
      frame: [0, 1, 2, 3, 4, 5],
      x: { min: 0, max: GAME_WIDTH },
      scaleX: {
        onEmit: () => -1.0,
        onUpdate: (particle) => {
          return particle.scaleX > 1.0 ? -1.0 : particle.scaleX + 0.05;
        },
      },
      rotate: {
        onEmit: () => 0,
        onUpdate: (particle) => {
          return particle.angle + 1;
        },
      },
    });
    confettiEmitter.setDepth(11);

    this.scene.time.delayedCall(1000, () => {
      confettiEmitter.stop();
    });
  }

  /**
   * Show win text with fade animations
   */
  private showWinText(
    overlay: Phaser.GameObjects.Graphics,
    onComplete: () => void
  ): void {
    const winTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '120px',
      color: '#ffffff',
      fontFamily: 'Space Grotesk',
      fontStyle: 'bold',
      align: 'center',
    };

    const winText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2.5, 'You Win!', winTextConfig)
      .setOrigin(0.5);
    winText.setDepth(11);

    // Fade in
    this.scene.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.8 },
      duration: 500,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: winText,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Power2',
    });

    // Fade out after delay
    this.scene.time.delayedCall(WIN_DISPLAY_DURATION, () => {
      this.scene.tweens.add({
        targets: overlay,
        alpha: { from: 0.8, to: 0 },
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          overlay.destroy();
          onComplete();
        },
      });

      this.scene.tweens.add({
        targets: winText,
        alpha: { from: 1, to: 0 },
        duration: 500,
        ease: 'Power2',
        onComplete: () => winText.destroy(),
      });
    });
  }
}
