const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');

// 1. Add helper method for standard button tweens
if (!code.includes('applyButtonAnimations')) {
  const helperCode = `
  private applyButtonAnimations(btn: Phaser.GameObjects.Container, scaleDown: number = 0.94, scaleHover: number = 1.04): void {
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
`;
  
  // Insert before the last closing brace or right after createBottomStatusStrip
  code = code.replace(/private createBottomStatusStrip/, helperCode + '\n  private createBottomStatusStrip');
}

// 2. Replace setScale in SET button
code = code.replace(/btn\.on\('pointerdown', \(\) => {\n\s*btn\.setScale\(0\.92\);/g, `btn.on('pointerdown', () => {`);
code = code.replace(/btn\.on\('pointerup', \(\) => {\n\s*btn\.setScale\(1\);\n\s*}\);/g, ``);
code = code.replace(/btn\.on\('pointerout', \(\) => {\n\s*btn\.setScale\(1\);\n\s*}\);/g, ``);

// Manually fix createSetButton
code = code.replace(/this\.container\.add\(btn\);\n\s*}\n\n\s*\/\*\*/, `this.applyButtonAnimations(btn);\n    this.container.add(btn);\n  }\n\n  /**`);

// Hmm, the regex might be tricky. Let's just do targeted replacements.
fs.writeFileSync('src/components/CasinoConsole.ts', code);
