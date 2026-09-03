/**
 * SpinButton Component - Interactive button for initiating spins
 * Part of the frontend UI layer
 */
export class SpinButton {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private isEnabled: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, onSpin: () => void) {
    this.scene = scene;
    this.container = this.createButton(x, y, onSpin);
  }

  /**
   * Create the button visual and interactive elements
   */
  private createButton(
    x: number,
    y: number,
    onSpin: () => void
  ): Phaser.GameObjects.Container {
    const buttonWidth = 400;
    const buttonHeight = 80;

    const container = this.scene.add.container(x, y);
    const buttonBg = this.scene.add.graphics();

    // Button background
    buttonBg.fillStyle(0xf9fafb, 0.9);
    buttonBg.fillRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12
    );
    buttonBg.lineStyle(1, 0xffffff, 1);
    buttonBg.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12
    );

    // Button text
    const buttonText = this.scene.add
      .text(0, 0, 'Spin!', {
        fontSize: '40px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#000',
      })
      .setOrigin(0.5);

    container.add([buttonBg, buttonText]);
    this.setupInteractivity(container, onSpin);

    return container;
  }

  /**
   * Setup button interactions and animations
   */
  private setupInteractivity(
    container: Phaser.GameObjects.Container,
    onSpin: () => void
  ): void {
    container
      .setSize(400, 80)
      .setInteractive()
      .on('pointerdown', () => {
        if (!this.isEnabled) return;
        onSpin();
        this.scene.tweens.add({
          targets: container,
          scale: 0.93,
          duration: 150,
          ease: 'Power2',
        });
      })
      .on('pointerup', () => {
        this.scene.tweens.add({
          targets: container,
          scale: 1,
          duration: 150,
          ease: 'Power2',
        });
      })
      .on('pointerover', () => {
        if (!this.isEnabled) return;
        this.scene.tweens.add({
          targets: container,
          scale: 0.98,
          duration: 200,
          ease: 'Power2',
        });
      })
      .on('pointerout', () => {
        this.scene.tweens.add({
          targets: container,
          scale: 1,
          duration: 200,
          ease: 'Power2',
        });
      });
  }

  /**
   * Disable button interaction
   */
  public disable(): void {
    this.isEnabled = false;
    this.container.disableInteractive();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.5,
      duration: 200,
      ease: 'Linear',
    });
  }

  /**
   * Enable button interaction
   */
  public enable(): void {
    this.isEnabled = true;
    this.container.setInteractive();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Linear',
    });
  }
}
