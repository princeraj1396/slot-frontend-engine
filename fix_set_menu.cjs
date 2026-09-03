const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');

const regex = /private toggleSetMenu\(x: number, y: number\): void {[\s\S]*?this\.setMenuContainer === menu\) {\s*menu\.destroy\(\);\s*this\.setMenuContainer = undefined;\s*}\s*}\);\s*}/;

const newCode = `private toggleSetMenu(x: number, y: number): void {
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
        }
      });
      return;
    }

    const w = 340;
    const itemH = 64;
    const paddingY = 24;
    const h = itemH * 3 + paddingY * 2;
    const menu = this.scene.add.container(x + 85, y - 100);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w, h, 16);
    bg.fillStyle(0x131a24, 0.98);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.lineStyle(2, 0xd4af37, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
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
      const t = this.scene.add
        .text(0, itemY, \`\${item.icon}  \${item.text}\`, {
          fontSize: '24px',
          fontFamily: 'Space Grotesk, sans-serif',
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
            }
          });
        }
        item.action();
      });
      zone.on('pointerover', () => t.setColor('#ffffff'));
      zone.on('pointerout', () => t.setColor('#ffd700'));

      menu.add([t, zone]);
    });

    this.container.add(menu);
    this.setMenuContainer = menu;

    menu.setScale(0.85);
    menu.setAlpha(0);
    this.scene.tweens.add({
      targets: menu,
      scale: 1,
      alpha: 1,
      duration: 160,
      ease: 'Back.easeOut'
    });

    // Auto-close menu if untouched for 4.5 seconds
    this.scene.time.delayedCall(4500, () => {
      if (this.setMenuContainer === menu) {
        this.scene.tweens.add({
          targets: menu,
          scale: 0.9,
          alpha: 0,
          duration: 120,
          onComplete: () => {
            menu.destroy();
            this.setMenuContainer = undefined;
          }
        });
      }
    });
  }`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/components/CasinoConsole.ts', code);
