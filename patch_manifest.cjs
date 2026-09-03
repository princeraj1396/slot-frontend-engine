const fs = require('fs');
let code = fs.readFileSync('public/manifest.webmanifest', 'utf8');
let manifest = JSON.parse(code);

manifest.name = "Royal Fortune 777 by JILLU";
manifest.short_name = "Royal Fortune";
manifest.description = "A professional, high-end mobile-first 3x3 slot game titled Royal Fortune 777, featuring progressive jackpot, 5 paylines, textured wood and gold console deck, and responsive controls. Powered by JILLU.";
manifest.icons = [
  {
    "src": "/JILLU-ICON.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  }
];

fs.writeFileSync('public/manifest.webmanifest', JSON.stringify(manifest, null, 2));
