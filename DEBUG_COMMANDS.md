# Debug Commands for Cursed Farm Adventure

If you experience issues with the game, you can use these commands in the browser's JavaScript console (F12 or Cmd+Option+I).

## Clear All Saved Games
```javascript
localStorage.clear()
```
or more specifically:
```javascript
clearAllSaves()
```

## Check if Story Text Loaded
```javascript
console.log('Story blocks loaded:', Object.keys(StoryText).length)
console.log('Game intro exists:', StoryText['game_intro'] ? 'YES' : 'NO')
```

## View Current Game State
```javascript
console.log(GameState)
```

## Force Start New Game
```javascript
startNewGame()
```

## Test if JavaScript is working
Open console and type:
```javascript
console.log('Test 1 - GameState exists:', typeof GameState !== 'undefined')
console.log('Test 2 - Current stats:', GameState.stats)
console.log('Test 3 - Bonus assigned:', GameState.bonusPointAssigned)
console.log('Test 4 - Story loaded:', Object.keys(StoryText).length, 'blocks')
console.log('Test 5 - Rooms loaded:', Object.keys(RoomsData).length, 'rooms')
```

## Force assign bonus point and start (if button isn't working)
```javascript
GameState.stats.grit = GameState.stats.grit + 1;
GameState.bonusPointAssigned = true;
beginAdventure();
```

## Reload Page Completely
```
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Common Issues

### "Story block not found" error
- Clear browser cache and reload
- Open browser console (F12) and check for fetch errors
- Make sure data/story.txt file exists and is accessible
- Try running: `loadStoryText().then(() => startNewGame())`

### "Begin Your Adventure" button doesn't work
- Open the browser console (F12 or Cmd+Option+I)
- Click one of the three "+1" buttons (Grit, Keen Eye, or Charm)
- You should see: "Bonus button clicked for stat: [stat name]"
- Then: "Bonus point applied successfully"
- Then: "Bonus point is now assigned: true"
- Now click "Begin Your Adventure"
- You should see: "Begin Adventure button clicked!"
- If you see an error message in red, copy it and check what it says
- If clicking the button shows nothing in console, the JavaScript may not be loading

### Game won't start after closing load modal
- Click the "New Game" button in the sidebar
- Or clear all saves using the "Clear All Saves" button in the Load Game modal
