# GAME DOCUMENTATION

## Game Engine Explanation
The `SlotGameEngine` (located in `src/game-engine/SlotGameEngine.ts`) is the central brain of Royal Fortune 777. It acts as an integration facade handling the lifecycle of the game: initialization, start, server result parsing, animation triggering, and win celebration routing. It abstracts the Phaser layer from the backend logic.

## Main Components
- **SlotMachineScene:** The master visual controller and Phaser scene.
- **CasinoConsole:** The bottom interactive deck (Bet, Spin, Auto, Turbo).
- **Reel:** Handles the mathematical easing and blur effects of spinning symbols.
- **WinDisplay:** The tiered overlay for particle celebrations (Big Win, Mega Win, Jackpot).

## Asset Structure
All assets (sprites, icons, background images) are defined in `src/config/assets.ts`. This allows rapid reskinning of the game by swapping out standard Base64 URIs or asset paths.

## Animation System
Reel spins utilize custom Phaser tween easing logic for a tactile, physical feel. The "Big Win" displays use Phaser's particle emitter engine alongside scaling tweens for a dynamic presentation.

## State Management
State is managed across two layers: 
1. **Engine Layer:** `SlotGameEngine` tracks states like `IDLE`, `SPINNING`, `EVALUATING`, `WIN_CELEBRATION`.
2. **Settings Layer:** Local settings (Volume, Turbo, Stop on Win) are synchronized with `localStorage`.

## Future Backend Connection
The game currently leverages a `MockPlatformServer`. For a real RGS integration, replace the `executeSpin()` method inside the mock server with an `async fetch()` call to your operator endpoint. The `CasinoPlatformBridge` requires no changes, as it standardizes the messaging format.
