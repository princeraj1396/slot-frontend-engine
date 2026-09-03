const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');

const modalReplacement = `
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

    // Compact Modal placement right above the BET button
    const modalX = 220; // Aligned near bet button
    const modalBottomY = 85;
    const modalW = 280; // Compact width
    const modalH = 260; // Compact height
    const modalY = modalBottomY - modalH; 

    const modal = this.scene.add.container(modalX, modalY);
    modal.setDepth(35);

    // 1. Container Background & Border
    const bg = this.scene.add.graphics();
    // Drop shadow
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(3, 5, modalW, modalH, 16);

    // Main dark slate background
    bg.fillGradientStyle(0x131d2a, 0x131d2a, 0x0c131d, 0x0c131d, 1);
    bg.fillRoundedRect(0, 0, modalW, modalH, 16);

    // Sleek subtle border
    bg.lineStyle(2, 0x253549, 1);
    bg.strokeRoundedRect(0, 0, modalW, modalH, 16);

    // Subtle inner highlight edge
    bg.lineStyle(1, 0x33445c, 0.35);
    bg.strokeRoundedRect(1, 1, modalW - 2, modalH - 2, 15);
    modal.add(bg);

    // 2. 2-Column × 5-Row Grid of Bet Denominations (Scaled down)
    const gridData = [
      [{ val: 0.5, label: '0.5', idx: 0 }, { val: 1, label: '1', idx: 1 }],
      [{ val: 5, label: '5', idx: 2 }, { val: 10, label: '10', idx: 3 }],
      [{ val: 20, label: '20', idx: 4 }, { val: 50, label: '50', idx: 5 }],
      [{ val: 100, label: '100', idx: 6 }, { val: 200, label: '200', idx: 7 }],
      [{ val: 500, label: '500', idx: 8 }, { val: 1000, label: '1000', idx: 9 }],
    ];

    const paddingX = 14;
    const paddingY = 14;
    const gapX = 10;
    const gapY = 8;
    const btnW = (modalW - paddingX * 2 - gapX) / 2;
    const btnH = (modalH - paddingY * 2 - gapY * 4) / 5; 

    const buttonItems: {
      gfx: Phaser.GameObjects.Graphics;
      txt: Phaser.GameObjects.Text;
      idx: number;
    }[] = [];

    const drawTile = (gfx: Phaser.GameObjects.Graphics, isSelected: boolean, isHovered: boolean = false) => {
      gfx.clear();
      const r = 8;
      if (isSelected) {
        // Bright emerald green background
        gfx.fillStyle(0x2ecc71, 1);
        gfx.fillRoundedRect(0, 0, btnW, btnH, r);
        gfx.lineStyle(2, 0x48e68b, 1);
        gfx.strokeRoundedRect(0, 0, btnW, btnH, r);
      } else {
        // Dark slate-blue button card
        const fillCol = isHovered ? 0x28384b : 0x1e2b38;
        gfx.fillStyle(fillCol, 1);
        gfx.fillRoundedRect(0, 0, btnW, btnH, r);
        gfx.lineStyle(1.5, isHovered ? 0x3d536c : 0x2d3e52, 1);
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
            fontSize: '18px',
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
  }`;

// Find openBetModal boundaries
const startIndex = code.indexOf('public openBetModal(): void {');
// Assuming the function ends near line 1098, let's search for the close boundary by finding the next function 'private toggleSetMenu'
const endIndex = code.indexOf('private toggleSetMenu(', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + modalReplacement + '\n\n  ' + code.substring(endIndex);
    fs.writeFileSync('src/components/CasinoConsole.ts', code);
}
