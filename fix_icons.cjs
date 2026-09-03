const fs = require('fs');
let code = fs.readFileSync('src/components/CasinoConsole.ts', 'utf8');

code = code.replace(/this\.container\.add\(balHit\);/g, 'this.applyButtonAnimations(balHit, 0.95, 1.05);\n    this.container.add(balHit);');
code = code.replace(/this\.container\.add\(soundContainer\);/g, 'this.applyButtonAnimations(soundContainer, 0.9, 1.1);\n    this.container.add(soundContainer);');
// wifi Container is not interactive right now but let's check
fs.writeFileSync('src/components/CasinoConsole.ts', code);
