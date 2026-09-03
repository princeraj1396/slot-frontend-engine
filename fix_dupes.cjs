const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');
code = code.replace(/this\.applyButtonAnimations\(btn\);\n\s*this\.applyButtonAnimations\(btn\);/g, 'this.applyButtonAnimations(btn);');
fs.writeFileSync('src/components/CasinoConsole.ts', code);
