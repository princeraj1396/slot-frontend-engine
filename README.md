# Royal Fortune 777

**A Premium Slot Module by JILLU**

---

## 1. Game Overview
Royal Fortune 777 is a high-end, mobile-first 3x3 slot game designed for real-world casino integration. It features a luxury purple velvet and dark wood aesthetic, 3D metallic-styled symbols, an ornate gold frame, and an immersive progressive jackpot system.

## 2. Game Features
- **3x3 Reel Matrix:** Classic layout with highly polished symbol art.
- **5 Active Paylines:** Standard multi-line payout structure.
- **Combo Multipliers:** Automatic x2 or x3 overlay multipliers on multiple line hits.
- **Big Win Celebrations:** High-impact, tiered win animations (Big, Mega, Jackpot) featuring gold coins, confetti, and rotating sunburst rays.
- **Dynamic Sound Engine:** Custom synthesized mechanical reel sounds and celebratory fanfares.
- **Progressive Jackpot:** Integrated jackpot scaling based on player bets.
- **Interactive Casino Console:** Unified tactile controls for Autospin, Turbo Spin, Bet Adjustment, and Paytable/History modaling.

## 3. Technology Stack
- **Engine:** Phaser 3 (WebGL/Canvas rendering)
- **Framework:** React / TypeScript / Vite
- **Styling:** Custom CSS for the surrounding HTML/UI
- **Audio:** Web Audio API (Synthesized)

## 4. Project Structure
```
src/
├── api/             # CasinoPlatformBridge & MockPlatformServer
├── components/      # Phaser classes (Reels, UI elements, Modals)
├── config/          # Constants, paylines, asset mappings
├── game-engine/     # SoundManager and SlotGameEngine integration facade
├── scenes/          # Phaser Scenes (SlotMachineScene)
├── utils/           # PWA and helper utilities
└── main.ts          # Entry point
```

## 5. Installation Guide
1. Run `npm install` to download dependencies.
2. Run `npm run dev` to preview the local build.
3. Use `npm run build` to generate the production-ready package.

## 6. Configuration Guide
Environment variables can be adapted for server endpoints (if overriding the Mock Server). Update `src/config/constants.ts` to adjust game width, height, or base RTP parameters.

## 7. Frontend Architecture
The game uses a strict separation between the `SlotGameEngine` (logic & state) and the Phaser `SlotMachineScene` (presentation). The `CasinoConsole` acts as the primary user interaction layer outside of the reels.

## 8. Backend Integration Points
The game connects through `CasinoPlatformBridge.ts`. It provides an event-driven architecture listening for `BET_PLACED`, `SPIN_STARTED`, `REEL_STOPPED`, and `WIN_CELEBRATION_START`.

## 9. API Requirements
A standard Spin API response must return the `SpinResultData` interface (matrix, win tier, total win, etc.).

## 10. Casino Platform Integration Guide
Operators should wrap the game inside an iframe. The `CasinoPlatformBridge` automatically dispatches `window.parent.postMessage` events for seamless wallet updates and session synchronization.

## 11. Customization Guide
To swap symbol art, replace the base64/URL mappings in `src/config/assets.ts`. To modify the multiplier rules, update `MockPlatformServer.ts` (or the equivalent remote game server).
