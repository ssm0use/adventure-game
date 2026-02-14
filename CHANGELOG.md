# Cursed Farm Adventure - Changelog

## Bug Fixes & Improvements - February 12, 2025

### 🐛 Bug Fixes

#### 1. Game Over Restart Bug (FIXED)
**Issue:** After clicking "Try Again" on the game over screen, players couldn't start a new game because the bonus point buttons remained disabled from the previous game.

**Fix:** `main.js:40-57` - Added code to reset bonus point buttons when starting a new game:
- Re-enables all bonus stat buttons
- Removes checkmarks from previous game
- Properly resets the character creation screen

**Result:** Players can now restart the game properly after a game over!

#### 2. Protective Items Don't Cure Curses (FIXED)
**Issue:** Protective items only prevented curses from being applied, but didn't cure existing curses. If you were already cursed and then equipped a protective item, you'd stay cursed.

**Fix:** `game-state.js:196-217` - Enhanced `equipItem()` function:
- When a protective item is equipped, it now checks for matching active curses
- If a matching curse is found, it's instantly removed
- Player sees message: "X purges the Y Transformation from your body! You feel normal again."

**Result:** Players can now cure curses at ANY stage (1, 2, or 3) by equipping the matching protective item!

### ✨ New Features

#### 3. Improved Search System
**Issue:** Players had to commit to taking all items when searching, and cursed items were only warned about AFTER starting to take them. This was unfair to new players.

**Fix:** `main.js:339-393` - Completely redesigned search system:
- Players now see ALL items found before choosing which to take
- Cursed items are clearly marked with ⚠️ (CURSED!) warning
- Can take items one by one or click "Continue" to finish
- Items disappear from choice list after taking them
- Can choose to leave cursed items behind

**Benefits:**
- No more accidental cursing!
- Experienced players can avoid cursed items
- New players get fair warning
- More strategic gameplay

### 📖 Documentation Updates

#### WALKTHROUGH.html Updates
- Added "Important Game Mechanics" section explaining new search system
- Updated all protective item descriptions to say "Cure/Prevention"
- Clarified that protective items cure curses at ANY stage
- Updated cursed items section to explain the new search interface
- Added tips about avoiding cursed items with ⚠️ markers

#### 4. Root Cellar Journal Not Accessible (FIXED)
**Issue:** After entering the Root Cellar, the story described seeing an old journal on a table, but there was no clear way to pick it up. The generic "Search the Area" button wasn't obvious enough.

**Fix:**
- `rooms.json:rootcellar` - Added custom `searchText` field to the journal search
- `main.js:267-278` - Modified search button rendering to use custom text if provided

**Result:** The Root Cellar now shows a clear button: **"Pick Up and Read the Journal"** instead of generic "Search the Area"!

## Summary of Changes

### Files Modified:
1. `js/main.js` - Restart game fix + search system overhaul
2. `js/game-state.js` - Protective items now cure curses
3. `WALKTHROUGH.html` - Updated documentation throughout

### Player Benefits:
✅ Can restart game properly after game over
✅ Can cure curses at any stage by equipping protective items
✅ Can see all items before taking them
✅ Cursed items clearly marked and avoidable
✅ More forgiving and fair gameplay

## Testing Checklist

- [x] Game Over → Try Again → Character Creation → Start New Game (works!)
- [x] Get cursed → Equip protective item → Curse removed (works!)
- [x] Search location → See all items → Take some, leave others (works!)
- [x] Search location → See cursed item marked with ⚠️ (works!)
- [x] Walkthrough accurately describes new mechanics (updated!)

## Future Enhancements (Optional)

Potential improvements for future updates:
- Add "Examine" button for items to see detailed descriptions before taking
- Add item weight/capacity system
- Add achievement system for collecting all items
- Add difficulty modes (permadeath, time limits, etc.)
- Add more save slots beyond 3
