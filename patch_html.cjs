const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<link rel="icon" type="image\/svg\+xml" href="\/icon.svg" \/>/, `<link rel="icon" type="image/png" href="/JILLU-ICON.png" />`);
code = code.replace(/<link rel="apple-touch-icon" href="\/apple-touch-icon.png" \/>/, `<link rel="apple-touch-icon" href="/JILLU-ICON.png" />`);

fs.writeFileSync('index.html', code);
