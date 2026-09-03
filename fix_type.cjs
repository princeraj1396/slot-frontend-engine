const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');
code = code.replace(/private applyButtonAnimations\(btn: Phaser\.GameObjects\.Container, scaleDown/g, 'private applyButtonAnimations(btn: any, scaleDown');
fs.writeFileSync('src/components/CasinoConsole.ts', code);
