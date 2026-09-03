const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');

// Strip all existing manual scale and pointer events for buttons (except spin which is custom)
// SET button
code = code.replace(/btn\.on\('pointerdown', \(\) => {\n\s*btn\.setScale\(0\.92\);\n\s*this\.audio\.playClick\(\);\n\s*this\.toggleSetMenu\(x, y - 60\);\n\s*}\);/, 
  `btn.on('pointerdown', () => {\n      this.audio.playClick();\n      this.toggleSetMenu(x, y - 60);\n    });`);

// BET button
code = code.replace(/btn\.on\('pointerdown', \(\) => {\n\s*if \(this\.isSpinning\) return;\n\s*btn\.setScale\(0\.92\);\n\s*this\.audio\.playClick\(\);\n\s*this\.toggleBetModal\(\);\n\s*}\);/,
  `btn.on('pointerdown', () => {\n      if (this.isSpinning) return;\n      this.audio.playClick();\n      this.toggleBetModal();\n    });`);

// AUTO button
code = code.replace(/btn\.on\('pointerdown', \(\) => {\n\s*btn\.setScale\(0\.92\);\n\s*this\.audio\.playClick\(\);\n\s*const options = \[0, 10, 25, 50, 100\];\n\s*const currentIdx = options\.indexOf\(this\.autoSpinCount\);\n\s*const nextIdx = \(currentIdx \+ 1\) % options\.length;\n\s*this\.autoSpinCount = options\[nextIdx\];\n\s*this\.updateAutoButtonUI\(\);\n\s*this\.callbacks\.onAutoSpinChange\(this\.autoSpinCount\);\n\s*}\);/,
  `btn.on('pointerdown', () => {\n      this.audio.playClick();\n      const options = [0, 10, 25, 50, 100];\n      const currentIdx = options.indexOf(this.autoSpinCount);\n      const nextIdx = (currentIdx + 1) % options.length;\n      this.autoSpinCount = options[nextIdx];\n      this.updateAutoButtonUI();\n      this.callbacks.onAutoSpinChange(this.autoSpinCount);\n    });`);

// TURBO button
code = code.replace(/btn\.on\('pointerdown', \(\) => {\n\s*btn\.setScale\(0\.92\);\n\s*this\.audio\.playClick\(\);\n\s*this\.isTurbo = !this\.isTurbo;\n\s*this\.drawTurboButtonGraphics\(this\.isTurbo\);\n\s*this\.callbacks\.onTurboToggle\(this\.isTurbo\);\n\s*}\);/,
  `btn.on('pointerdown', () => {\n      this.audio.playClick();\n      this.isTurbo = !this.isTurbo;\n      this.drawTurboButtonGraphics(this.isTurbo);\n      this.callbacks.onTurboToggle(this.isTurbo);\n    });`);

// Clean up dangling pointerup/pointerout
code = code.replace(/btn\.on\('pointerup', \(\) => {\n\s*btn\.setScale\(1\);\n\s*}\);/g, '');
code = code.replace(/btn\.on\('pointerout', \(\) => {\n\s*btn\.setScale\(1\);\n\s*}\);/g, '');

// Add applyButtonAnimations before container.add
code = code.replace(/this\.container\.add\(btn\);/g, 'this.applyButtonAnimations(btn);\n    this.container.add(btn);');

// The spin button is `this.spinBtnContainer` and has custom graphics scaling, but we can also add tween scaling.
code = code.replace(/this\.container\.add\(this\.spinBtnContainer\);/g, 'this.applyButtonAnimations(this.spinBtnContainer, 0.95, 1.08);\n    this.container.add(this.spinBtnContainer);');

fs.writeFileSync('src/components/CasinoConsole.ts', code);
