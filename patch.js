const fs = require('fs');
let code = fs.readFileSync('src/scenes/SlotMachineScene.ts', 'utf8');

// Inside preload
code = code.replace(/this\.createLoadingScreen\(\);/, `this.createLoadingScreen();\n    this.load.image('jillu_logo', '/JILLU-LOGO.png');\n    this.load.image('jillu_icon', '/JILLU-ICON.png');`);

// Inside createLoadingScreen
code = code.replace(/const providerText = this\.add[\s\S]*?this\.loadingContainer\.add\(providerText\);/, 
`    const providerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 190, 'PROVIDED BY', {
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
        const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130, 'jillu_logo');
        // scale logo to fit beautifully
        logo.setScale(0.4); 
        this.loadingContainer.add(logo);
      }
    });`);

fs.writeFileSync('src/scenes/SlotMachineScene.ts', code);
