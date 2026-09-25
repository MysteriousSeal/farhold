# Farhold

**An endless realm. The farther you roam, the fiercer it grows.**

Farhold is a top-down action RPG that runs in the browser, on desktop and on phones. You set out from the walled town of Hearthfire into a procedurally generated world that never ends: meadows, forests, deserts, tundra, swamps and the Blightlands beyond. Monsters grow stronger the farther you travel, and so does the loot.

Everything is drawn in code: there are no image or sound files. The art is vector-style canvas drawing and the music and sound effects are synthesized live.

## Features

- **Three classes:** Warrior (three-hit combos and cleaving swings), Ranger (fast, piercing arrows) and Mage (exploding arcane bolts). Each class has a skill tree with two active skills.
- **Four races:** Human, Elf, Dwarf and Orc, each with its own bonuses, plus appearance options.
- **Endless seeded world:** the same seed always gives the same world, with biomes, lakes, mountains and weather.
- **Towns and villages:** Hearthfire is a walled town with a market, a blacksmith, an alchemist, a fine-goods merchant, a bounty board and a waystone for fast travel. Villages along the way have their own shops and quests.
- **Caves and lairs:** caves hold treasure guarded by a mini-boss. Lairs hold named bosses, which leave a treasure chest behind when defeated.
- **Loot:** six gear slots, five rarities and nine materials. The blacksmith can upgrade gear, and every item shows how much stronger or weaker it would make you.
- **Day and night:** a day-night cycle with lamps, lit windows and night-time music.
- **Automatic saving:** progress is saved in the browser.

## Controls

| Action                          | Keyboard / mouse     | Touch                               |
| ------------------------------- | -------------------- | ----------------------------------- |
| Move                            | `WASD` or arrow keys | Drag on the left side of the screen |
| Attack                          | `Space` or click     | Hold **Attack**                     |
| Dodge roll                      | `Shift`              | **Roll**                            |
| Skills                          | `1`, `2`             | Skill buttons                       |
| Drink a potion                  | `Q`                  | Potion button                       |
| Interact (shops, chests, caves) | `E`                  | Action button                       |
| Bag                             | `I`                  | **Bag**                             |
| Skill tree                      | `C`                  | **Skills**                          |
| Pause menu                      | `Esc`                | **Menu**                            |

Red rings on the ground warn of heavy attacks. Roll out of them.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually `http://localhost:5173`).

### Scripts

| Command              | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run dev`        | Start the development server with hot reload               |
| `npm run build`      | Type-check and build the production version into `dist/`   |
| `npm run preview`    | Serve the production build locally                         |
| `npm test`           | Run the unit tests (Vitest)                                |
| `npm run test:watch` | Run the tests in watch mode                                |
| `npm run typecheck`  | Type-check with TypeScript                                 |
| `npm run lint`       | Lint with ESLint                                           |
| `npm run format`     | Format the code with Prettier (`format:check` only checks) |

## Project structure

```
index.html          Page markup: menus, HUD and on-screen touch controls
src/
  main.ts           Start-up and the main game loop
  styles.css        Interface styles
  core/             Canvas helpers, math, seeded noise, settings
  audio/            Synthesized sound effects and generative music
  world/            Terrain and biomes, world chunks, villages and Hearthfire,
                    dungeons, and vector outlines for mountains and shorelines
  art/              Canvas drawing: characters, creatures, houses, the town,
                    props, items
  data/             Classes, races, enemies, bosses and skill trees
  game/             Game rules: state, combat, enemies, loot, stats, quests,
                    saving
  render/           World rendering and the minimap
  input/            Keyboard, mouse and touch input
  ui/               HUD, menus, inventory, shops and screens
tests/              Unit tests for the rules that don't need a browser
public/             App icon
```

### Conventions

- **Shared state:** state that several modules change lives on the `game` object in `src/game/state.ts` (for example `game.P` for the player, `game.state`, `game.enemies`). Add new cross-module state there, because ES module imports are read-only.
- **Runtime objects:** enemies, villages and dungeons are plain objects built up at runtime. Their types are named loose aliases in `src/game/types.ts`.
- **Determinism:** world generation is seeded. Use the seeded helpers (`hs`, `vn`, `fbm`, `mulberry`) so the same seed always gives the same world.
- **Sharp art:** anything that must look crisp (edges, buildings, props) is drawn as vectors or into high-resolution sprites, not into the low-resolution ground image.
- **Code style:** code is formatted with Prettier, and files stay under 2000 lines.

## Deploying and installing as an app

`npm run build` produces a static site in `dist/` with relative paths, so it can be hosted anywhere static files are served (GitHub Pages, Netlify, any web server) with no extra configuration.

Farhold is a Progressive Web App. Once it's served over HTTPS, open it on a phone and choose **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome) to get a full-screen app that also works offline.
