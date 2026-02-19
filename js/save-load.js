/**
 * SAVE/LOAD MODULE
 *
 * This module handles saving and loading game state using browser localStorage.
 * Supports multiple save slots (3 slots by default).
 */

const SAVE_SLOT_PREFIX = 'cursedFarmSave_';
const NUM_SAVE_SLOTS = 3;

/**
 * Saves the current game state to a specific slot
 * @param {number} slotNumber - The save slot (1-3)
 * @returns {boolean} True if save was successful
 */
function saveGame(slotNumber) {
    try {
        // Create a save object with game state and metadata
        const saveData = {
            gameState: JSON.parse(JSON.stringify(GameState)), // Deep copy
            timestamp: new Date().toISOString(),
            slotNumber: slotNumber
        };

        // Save to localStorage
        const saveKey = SAVE_SLOT_PREFIX + slotNumber;
        localStorage.setItem(saveKey, JSON.stringify(saveData));

        console.log(`Game saved to slot ${slotNumber}`);
        return true;
    } catch (error) {
        console.error('Error saving game:', error);
        alert('Failed to save game. Your browser may have localStorage disabled.');
        return false;
    }
}

/**
 * Loads a game from a specific slot
 * @param {number} slotNumber - The save slot (1-3)
 * @returns {boolean} True if load was successful
 */
function loadGame(slotNumber) {
    try {
        const saveKey = SAVE_SLOT_PREFIX + slotNumber;
        const saveDataString = localStorage.getItem(saveKey);

        if (!saveDataString) {
            console.log(`No save found in slot ${slotNumber}`);
            return false;
        }

        const saveData = JSON.parse(saveDataString);

        // Restore game state
        Object.assign(GameState, saveData.gameState);

        // Migration: old saves without bodyMap
        if (!GameState.bodyMap) {
            GameState.bodyMap = { head: null, arms: null, body: null, legs: null };

            // Convert old-format curses (with currentStage) to body map claims
            for (const curseType in GameState.activeCurses) {
                const curse = GameState.activeCurses[curseType];
                if (curse.currentStage !== undefined) {
                    const stage = curse.currentStage || 1;
                    for (let i = 0; i < stage; i++) {
                        claimClearZone(curseType);
                    }
                }
            }
        }

        // Migration: old saves without searchAttempts
        if (!GameState.searchAttempts) {
            GameState.searchAttempts = {};
        }

        // Migration: old saves without difficulty
        if (!GameState.difficulty) {
            GameState.difficulty = 'default';
        }

        // Migration: old saves without pendingItems
        if (!GameState.pendingItems) {
            GameState.pendingItems = {};
        }

        // Migration: old per-curse timer format to master clock format
        if (GameState.curseClock === undefined) {
            GameState.curseClock = 0;
            GameState.curseClockInterval = 4;

            let hasActiveCurse = false;
            for (const curseType in GameState.activeCurses) {
                const curse = GameState.activeCurses[curseType];
                if (typeof curse === 'object') {
                    // Convert old object format {roomsUntilNextAdvance, stopped} to simple boolean
                    GameState.activeCurses[curseType] = true;
                }
                hasActiveCurse = true;
            }

            // Start master clock if there are active curses
            if (hasActiveCurse) {
                GameState.curseClock = GameState.curseClockInterval;
            }
        }

        // Migration: old saves without item randomization
        if (!GameState.itemSeed) {
            GameState.itemSeed = 0;
        }
        if (!GameState.itemPlacements) {
            GameState.itemPlacements = null;
        }

        // Restore randomized item placements to rooms data
        restoreAndApplyPlacements();

        console.log(`Game loaded from slot ${slotNumber}`);
        return true;
    } catch (error) {
        console.error('Error loading game:', error);
        alert('Failed to load game. The save file may be corrupted.');
        return false;
    }
}

/**
 * Gets information about a save slot without loading it
 * @param {number} slotNumber - The save slot (1-3)
 * @returns {Object|null} Save info or null if slot is empty
 */
function getSaveSlotInfo(slotNumber) {
    try {
        const saveKey = SAVE_SLOT_PREFIX + slotNumber;
        const saveDataString = localStorage.getItem(saveKey);

        if (!saveDataString) {
            return null;
        }

        const saveData = JSON.parse(saveDataString);

        // Return useful info about the save
        return {
            slotNumber: slotNumber,
            characterName: saveData.gameState.characterName || 'Unnamed Hero',
            timestamp: saveData.timestamp,
            currentRoom: saveData.gameState.currentRoom,
            stats: saveData.gameState.stats,
            gameStatus: saveData.gameState.gameStatus
        };
    } catch (error) {
        console.error(`Error reading save slot ${slotNumber}:`, error);
        return null;
    }
}

/**
 * Deletes a save from a specific slot
 * @param {number} slotNumber - The save slot (1-3)
 * @returns {boolean} True if deletion was successful
 */
function deleteSave(slotNumber) {
    try {
        const saveKey = SAVE_SLOT_PREFIX + slotNumber;
        localStorage.removeItem(saveKey);
        console.log(`Deleted save in slot ${slotNumber}`);
        return true;
    } catch (error) {
        console.error('Error deleting save:', error);
        return false;
    }
}

/**
 * Gets info for all save slots
 * @returns {Array} Array of save slot info objects
 */
function getAllSaveSlots() {
    const slots = [];
    for (let i = 1; i <= NUM_SAVE_SLOTS; i++) {
        slots.push({
            slotNumber: i,
            info: getSaveSlotInfo(i)
        });
    }
    return slots;
}

/**
 * Checks if any saves exist
 * @returns {boolean} True if at least one save exists
 */
function anySavesExist() {
    for (let i = 1; i <= NUM_SAVE_SLOTS; i++) {
        if (getSaveSlotInfo(i) !== null) {
            return true;
        }
    }
    return false;
}

/**
 * Formats a timestamp for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Formatted date/time
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

/**
 * Gets the room display name
 * @param {string} roomId - The room ID
 * @returns {string} Room display name
 */
function getRoomDisplayName(roomId) {
    if (RoomsData[roomId]) {
        return RoomsData[roomId].name;
    }
    return roomId;
}

/**
 * Clears all saved games
 * @returns {boolean} True if all saves were cleared
 */
function clearAllSaves() {
    try {
        for (let i = 1; i <= NUM_SAVE_SLOTS; i++) {
            const saveKey = SAVE_SLOT_PREFIX + i;
            localStorage.removeItem(saveKey);
        }
        console.log('All saves cleared');
        return true;
    } catch (error) {
        console.error('Error clearing saves:', error);
        return false;
    }
}
