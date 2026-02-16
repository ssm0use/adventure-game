# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build system — pure HTML/CSS/JavaScript with no dependencies. Must be served via HTTP (not `file://`) because the game fetches JSON data files.

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

There are no tests, linters, or CI configured.

## Architecture

Browser-based interactive fiction game ("Choose Your Own Adventure") set on a haunted dairy farm. The game is a single-page app with 6 JS modules loaded via `<script>` tags (no bundler, no module system — all functions are global).

**Data flow:** `initializeGame()` loads JSON data + story text → player creates character → `enterRoom(roomId)` drives the game loop → state changes trigger UI re-renders.

### Module Responsibilities

- **`js/main.js`** — Orchestrator. Handles game init, room navigation (`enterRoom`/`renderRoom`), encounter flow, search actions, and navigation choice rendering. Uses BFS to hide fully-explored room subtrees from navigation.
- **`js/game-state.js`** — Single `GameState` object (global mutable state). Manages stats, inventory, equipped items, curse progression, body map, and flags. Key functions: `getEffectiveStat()`, `applyCurse()`, `progressCurses()`, `equipItem()`.
- **`js/ui.js`** — All DOM manipulation. Renders stats (star display), inventory, equipped items, curses, body map, and story text. Manages choice buttons via `addChoice()`/`clearChoices()`.
- **`js/encounters.js`** — Dice mechanics. D20 + modifier (stat - 2) vs difficulty threshold. Passive Keen Eye checks use roll-with-advantage. Resolves encounters with rewards or curses.
- **`js/save-load.js`** — localStorage persistence with 3 save slots. Key prefix: `cursedFarmSave_`. Includes migration logic for old save formats.
- **`js/story-loader.js`** — Parses `data/story.txt` (block format: `[block_name]...[END]`) into the global `StoryText` object.

### Data Files (all in `data/`)

- **`rooms.json`** — Room definitions with connections, events (encounters/actions with stat checks), searches, and hidden areas (discovered via passive Keen Eye).
- **`items.json`** — Items with types (`key`, `quest`, `protective`, `equipment`, `cursed`), stat boosts, equip slots, and curse protection.
- **`curses.json`** — Curse definitions with progression timers, body part descriptions, and protective item mappings.
- **`story.txt`** — All narrative text in `[block_name]...[END]` format, referenced by `storyKey` fields in the JSON data.

### Key Game Mechanics

**Curse system:** Curses are progressive — each claims body parts over time. `activeCurses` tracks timers that decrement on room transitions. When a timer hits 0, a random unclaimed body part is claimed. If all 4 body parts (`head`, `arms`, `body`, `legs`) are cursed, it's game over. Protective items halt progression and reduce curse stage.

**Event requirements:** Events in rooms can have prerequisites (`hasItem`, `missingItem`, `completedEvent`, `visitCount`) checked before display.

**Encounter flow:** Preview (show odds) → player confirms roll → d20 resolution → success grants items / failure applies curse → return to room.

## Modifying Game Content

Most changes require **no code modifications** — just edit the JSON data files and `story.txt`:

- **New story text:** Add `[block_name]...[END]` blocks to `data/story.txt`
- **New rooms:** Add room objects to `data/rooms.json` with connections, events, and searches
- **New items:** Add to `data/items.json` with type, effects, and equip slot
- **New encounters:** Add event objects to a room's `events` array with `check` properties (stat, difficulty, success/failure stories and effects)
- **Curse tuning:** Edit `data/curses.json` (`roomsUntilAdvance`, `protectiveItem`, descriptions)

## Debugging

Open browser console (F12). All key functions log state changes. See `DEBUG_COMMANDS.md` for console commands (e.g., `console.log(GameState)`, `clearAllSaves()`).
