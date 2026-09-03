import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { SoundManager } from '../game-engine/SoundManager';

/**
 * WinDisplay Component - High-impact Las Vegas tiered win celebration
 * Features dynamic coin fountains, confetti, rotating burst rays, and ticker tally
 */
export class WinDisplay {
  private scene: Phaser.Scene;
  private soundManager: SoundManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.soundManager = SoundManager.getInstance();
  }

  /**
   * Show celebration for a win
   */
  public show(
    amount: number,
    tier: 'small' | 'medium' | 'big' | 'mega' | 'jackpot',
    multiplier: number = 1,
    onComplete: () => void
  ): void {
    const isJackpot = tier === 'jackpot';
    const isMega = tier === 'mega';
    const isBig = tier === 'big';

    // Play appropriate victory fanfare
    if (isJackpot) {
      this.soundManager.playJackpot();
    } else if (isMega || isBig) {
      this.soundManager.playBigWin();
    } else {
      this.soundManager.playLineWin();
    }

    const container = this.scene.add.container(0, 0);
    container.setDepth(100);

    // 1. Dark glowing backdrop
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(overlay);

    // 2. Rotating sunburst rays for Big/Mega/Jackpot
    const sunburst = this.scene.add.graphics();
    const numRays = 16;
    const radius = 900;
    sunburst.fillStyle(isJackpot ? 0xffcc00 : 0xffa500, 0.15);
    for (let i = 0; i < numRays; i++) {
      const angle1 = (i * 2 * Math.PI) / numRays;
      const angle2 = angle1 + Math.PI / numRays;
      sunburst.beginPath();
      sunburst.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
      sunburst.lineTo(
        GAME_WIDTH / 2 + Math.cos(angle1) * radius,
        GAME_HEIGHT / 2 - 40 + Math.sin(angle1) * radius
      );
      sunburst.lineTo(
        GAME_WIDTH / 2 + Math.cos(angle2) * radius,
        GAME_HEIGHT / 2 - 40 + Math.sin(angle2) * radius
      );
      sunburst.closePath();
      sunburst.fillPath();
    }
    container.add(sunburst);

    this.scene.tweens.add({
      targets: sunburst,
      angle: 360,
      duration: 12000,
      repeat: -1,
      ease: 'Linear',
    });

    // 3. Gold Coin Fountain & Confetti
    this.spawnFountainParticles(container, tier);

    // 4. Celebration Header Title
    let titleText = 'BIG WIN!';
    let titleColor = '#ffd700';
    if (isJackpot) {
      titleText = '★ PROGRESSIVE JACKPOT! ★';
      titleColor = '#ff2a6d';
    } else if (isMega) {
      titleText = 'MEGA WIN!';
      titleColor = '#00f0ff';
    }

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, titleText, {
        fontSize: isJackpot ? '76px' : '92px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: titleColor,
        stroke: '#000000',
        strokeThickness: 10,
        align: 'center',
      })
      .setOrigin(0.5);
    title.setScale(0.2);
    container.add(title);

    // Bounce in title
    this.scene.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Multiplier Overlay (if combo win)
    if (multiplier > 1) {
      const multText = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `x${multiplier} COMBO!`, {
          fontSize: '64px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontStyle: 'bold',
          color: '#ff2a6d',
          stroke: '#ffffff',
          strokeThickness: 8,
          align: 'center',
        })
        .setOrigin(0.5)
        .setScale(0);
      
      container.add(multText);

      this.scene.tweens.add({
        targets: multText,
        scale: 1.2,
        duration: 400,
        delay: 300,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 200,
        repeat: -1,
        repeatDelay: 1000
      });
    }

    // 5. Amount Ticker (Count up from 0 to amount)
    const amountText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, '$0.00', {
        fontSize: '110px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 12,
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(amountText);

    // 6. "CLICK ANYWHERE TO COLLECT" helper
    const promptText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, 'CLICK ANYWHERE TO COLLECT', {
        fontSize: '24px',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#aaaaaa',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    container.add(promptText);

    this.scene.tweens.add({
      targets: promptText,
      alpha: { from: 0.3, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Count-up animation
    const counterObj = { val: 0 };
    const tallyDuration = isJackpot ? 2500 : isMega || isBig ? 1800 : 900;

    let tickSoundTimer: Phaser.Time.TimerEvent | null = null;
    tickSoundTimer = this.scene.time.addEvent({
      delay: 70,
      repeat: Math.floor(tallyDuration / 70),
      callback: () => {
        this.soundManager.playCoinDrop();
      },
    });

    const tween = this.scene.tweens.add({
      targets: counterObj,
      val: amount,
      duration: tallyDuration,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        amountText.setText(`$${counterObj.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      },
      onComplete: () => {
        amountText.setText(`$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        if (tickSoundTimer) tickSoundTimer.remove();
      },
    });

    // Dismiss logic (auto after timeout or click)
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (tickSoundTimer) tickSoundTimer.remove();
      tween.stop();
      this.soundManager.playClick();

      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          container.destroy();
          onComplete();
        },
      });
    };

    // Make clickable to fast collect
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.on('pointerdown', dismiss);

    // Auto dismiss after duration
    const totalStay = tallyDuration + (isJackpot ? 3500 : 2500);
    this.scene.time.delayedCall(totalStay, dismiss);
  }

  /**
   * Spawn particle effects (Coins and Confetti)
   */
  private spawnFountainParticles(
    container: Phaser.GameObjects.Container,
    tier: string
  ): void {
    const isJackpot = tier === 'jackpot';

    // 1. Confetti
    const confettiEmitter = this.scene.add.particles(0, 0, 'confetti', {
      speed: { min: 250, max: 600 },
      angle: { min: 220, max: 320 },
      gravityY: 700,
      lifespan: 3000,
      frame: [0, 1, 2, 3, 4, 5],
      x: { min: 100, max: GAME_WIDTH - 100 },
      y: GAME_HEIGHT + 20,
      scale: { min: 1, max: 2.2 },
      rotate: { start: 0, end: 360 },
      quantity: isJackpot ? 6 : 3,
    });
    container.add(confettiEmitter);

    // 2. Gold Coins Falling
    const coinEmitter = this.scene.add.particles(0, 0, 'coin', {
      speedY: { min: 200, max: 600 },
      speedX: { min: -150, max: 150 },
      gravityY: 600,
      lifespan: 3500,
      x: { min: 50, max: GAME_WIDTH - 50 },
      y: -40,
      scale: { min: 0.6, max: 1.2 },
      rotate: { start: 0, end: 720 },
      quantity: isJackpot ? 4 : 2,
    });
    container.add(coinEmitter);

    this.scene.time.delayedCall(isJackpot ? 4000 : 2500, () => {
      coinEmitter.stop();
    });

    this.scene.time.delayedCall(3000, () => {
      confettiEmitter.stop();
    });
  }
}
