/**
 * Type definitions for Slot Frontend Engine
 */

/**
 * Reel frame layout and container data
 */
export interface FrameData {
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  container: Phaser.GameObjects.Container;
}

/**
 * Spin result from backend
 * The backend will provide this data to the frontend for rendering
 */
export interface SpinResult {
  symbols: string[][];
  winRows?: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Game engine initialization options
 */
export interface GameEngineConfig {
  width?: number;
  height?: number;
  parentElement?: string;
  assetPath?: string;
}
