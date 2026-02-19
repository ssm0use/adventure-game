# How to Play Blightmill Dairy

## IMPORTANT: How to Start the Game

**DO NOT double-click `index.html`!** This will cause the game to fail to load data files.

### On Mac:
**Double-click the `START_GAME.command` file** in this folder.
- Your browser will open automatically
- The game will load at `http://localhost:8000`
- To stop the server, press Ctrl+C in the Terminal window that appears

### On Windows:
1. Open Command Prompt in this folder
2. Run: `python -m http.server 8000`
3. Open your browser and go to: `http://localhost:8000`

### Alternative (any OS):
If you have Python installed:
1. Open Terminal/Command Prompt in this folder
2. Run: `python3 -m http.server 8000` (Mac/Linux) or `python -m http.server 8000` (Windows)
3. Open browser to: `http://localhost:8000`

## Game Instructions

1. Read the intro story
2. Enter your character name (optional - defaults to "Adventurer")
3. Click one of the three +1 buttons to assign your bonus stat point
4. Click "Begin Your Adventure" to start playing
5. Use Save Game to save your progress (3 save slots available)

## Need Help?

**WALKTHROUGH.html** - Complete game guide with spoilers!
- Open this file in your browser for detailed help
- Includes victory path, hidden areas, all items, and endings
- Tips and strategies for every situation

## Troubleshooting

### "Failed to load game data"
- You're opening the file directly. Use START_GAME.command instead!

### Game won't progress
- Make sure you're running through a web server (see above)
- Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Open browser console (F12) to see any error messages

### Clear all saves
- Click "Load Game" button
- Click "Clear All Saves" at the bottom
