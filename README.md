# Blightmill Dairy

A browser-based "Choose Your Own Adventure" game set on a haunted dairy farm. Help break the century-old curse while avoiding transformations into various farm creatures!

## ⚠️ How to Play - IMPORTANT!

**DO NOT open `index.html` directly!** Browsers block local file loading for security.

### Starting the Game:

**On Mac:**
- Double-click `START_GAME.command`
- Your browser will open automatically at `http://localhost:8000`
- Press Ctrl+C in the terminal when done

**On Windows/Linux:**
1. Open terminal/command prompt in this folder
2. Run: `python -m http.server 8000` (or `python3 -m http.server 8000`)
3. Open browser to `http://localhost:8000`
4. Press Ctrl+C when done

### Playing:
1. Read the intro story
2. Enter your character name (optional)
3. Click a +1 button to assign your bonus stat point
4. Click "Begin Your Adventure" to start exploring
5. Save often using the Save Game button!

## Game Features

- **Farm-themed Stats**: Grit, Keen Eye, and Charm
- **Stat-based Encounters**: d20 roll system for challenge resolution
- **Multiple Transformations**: Four different curse paths (Cow, Bee, Scarecrow, Ghost)
- **Hidden Areas**: Discover secrets with high Keen Eye or lucky rolls
- **Save System**: 3 save slots using browser localStorage
- **Win Condition**: Break the curse and reunite lost loves
- **Multiple Game Overs**: Different transformation endings

## 📖 Need Help?

- **WALKTHROUGH.html** - Complete spoiler guide! Open in your browser for:
  - Step-by-step victory path
  - All hidden areas and how to find them
  - Complete item and room lists
  - All 4 transformation endings guide
  - Stat check probabilities and strategies
  - Pro tips for speedruns and completionists

## File Structure

```
adventure-game/
├── index.html              # Main game HTML
├── styles.css              # Storybook-themed styling
├── README.md              # This file
├── js/
│   ├── main.js            # Game orchestration & room navigation
│   ├── game-state.js      # State management, stats, inventory
│   ├── ui.js              # UI rendering & updates
│   ├── encounters.js      # Stat checks & dice rolling
│   ├── save-load.js       # LocalStorage save/load system
│   └── story-loader.js    # Parses story.txt into memory
└── data/
    ├── story.txt          # All narrative text [block_name] format
    ├── rooms.json         # Room connections, events, checks
    ├── items.json         # Item definitions & effects
    └── curses.json        # Transformation stages & requirements
```

## Editing the Game

### Adding New Story Text

Edit `data/story.txt` and add blocks in this format:

```
[block_name]
Your story text goes here.
It can span multiple paragraphs.
[END]
```

### Modifying Rooms

Edit `data/rooms.json` to:
- Add new rooms
- Change connections between rooms
- Add events and encounters
- Adjust difficulty checks

### Adding Items

Edit `data/items.json` to add new items with properties like:
- `type`: "key", "quest", "protective", "equipment", "cursed"
- `statBoost`: Bonus to Grit, Keen Eye, or Charm
- `protectsFrom`: Which curse it protects against

### Adjusting Curses

Edit `data/curses.json` to modify:
- Transformation stages
- Rooms between transformations
- Which items protect against each curse

## Game Tips

- **Explore thoroughly** - Hidden areas contain powerful items
- **Read item descriptions** - Some items are cursed!
- **Equip protective items** - They block transformation curses
- **Use stat-boosting equipment** - It helps you pass checks
- **Save often** - Multiple save slots let you try different approaches

## Technical Details

- **Pure JavaScript** - No frameworks, easy to modify
- **Modular Design** - Each system in its own file
- **LocalStorage Saves** - Progress persists between sessions
- **Responsive Layout** - Works on desktop browsers

## Credits

Created as a Scooby-Doo-style spooky adventure with transformation mechanics and a romantic curse-breaking story.
