# Isles of Everbloom

A whimsical Phaser 3 adventure across three seasonal islands. Explore Everbloom Bay, meet mermaid guides, complete seasonal challenges, and restore the Seasonal Crystals.

## Run

Open `index.html` in a browser, or serve the folder with any local static server. The game loads Phaser 3.90 from jsDelivr, so an internet connection is required unless the library is hosted locally.

## Controls

- `WASD` or Arrow Keys: Move
- `E`: Interact, talk, and advance dialogue
- `ESC`: Pause, leave a mini-game, or close dialogue
- `SPACE`: Lantern Rhythm timing input
- Mouse: Click fireflies, memory cards, and sequence pads

The controls legend is shown in the bottom-right corner during play.

## Gameplay

Choose Spring, Autumn, or Winter in any order. Each island has two mini-games. Complete both to restore that island's Seasonal Crystal. Restore all three crystals to finish the journey.

Each mini-game opens with instructions, a timer, scoring details, and a Begin Challenge button. Use Help during a challenge to pause and review the instructions.

## Seasonal Challenges

- **Spring:** Petal Path and Firefly Chase
- **Autumn:** Foxfire Run and Acorn Memory
- **Winter:** Lantern Rhythm and Moonlight Sequence

## Project Files

- `index.html`: Page structure, menus, HUD, and controls legend
- `style.css`: UI layout and visual styling
- `game.js`: Phaser world, player, characters, portals, audio, and mini-games

The game uses Phaser Graphics and Web Audio, so no external game art or audio files are required.
