const fs = require('fs');
let code = fs.readFileSync('src/scenes/SlotMachineScene.ts', 'utf8');

code = code.replace(/this\.createLoadingScreen\(\);/, `this.createLoadingScreen();\n    this.load.image('jillu_logo', '/JILLU-LOGO.png');\n    this.load.image('jillu_icon', '/JILLU-ICON.png');`);

code = code.replace(/const providerText = this\.add[\s\S]*?this\.loadingContainer\.add\(providerText\);/, 
`    const providerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 'PROVIDED BY', {
        fontSize: '14px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontStyle: 'bold',
        color: '#c5a059',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.loadingContainer.add(providerText);

    this.load.once('filecomplete-image-jillu_logo', () => {
      if (this.loadingContainer) {
        const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'jillu_logo');
        // scale logo appropriately
        const maxWidth = 200;
        const scale = maxWidth / logo.width;
        logo.setScale(scale); 
        this.loadingContainer.add(logo);
      }
    });`);

fs.writeFileSync('src/scenes/SlotMachineScene.ts', code);
