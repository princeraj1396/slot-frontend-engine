import SlotMachineScene from './scenes/SlotMachineScene';
import { AUTO, Game, Scale } from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants';
import { PWAManager } from './utils/pwaManager';

/**
 * Main game initialization
 * Mobile-first portrait slot machine (Royal Fortune 777)
 */
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0614',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [SlotMachineScene],
  physics: {
    default: 'arcade',
  },
};

const game = new Game(config);

// Initialize PWA service worker and offline capability
PWAManager.getInstance();

window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.refresh();
  }
});

export default game;
