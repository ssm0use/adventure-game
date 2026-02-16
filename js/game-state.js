/**
 * GAME STATE MODULE
 *
 * This module manages all game state data including:
 * - Character stats (Grit, Keen Eye, Charm)
 * - Inventory and equipped items
 * - Current location and visited rooms
 * - Active curses and transformations
 * - Game flags and progress
 *
 * CURSE → CURE ITEM MAPPING (1:1, non-equippable, auto-cure on pickup):
 *   cow      → brassCollar        (Brass Bell Collar)       — found in Barn search
 *   bee      → beeVeil            (Beekeeper's Smoke Veil)  — found in Bee Hives search
 *   scarecrow→ blessedHat         (Blessed Straw Hat)       — found in Garden search
 *   ghost    → saltAmulet         (Salt Circle Amulet)      — found in Old Well search
 *   mouse    → mouserCharm        (Mouser's Charm)          — found in Hayloft search
 *   zombie   → boneCharm          (Bone Charm)              — found in Farmhouse search
 *   spider   → spidersilkBracelet (Spidersilk Bracelet)     — found in Silo Basement search
 *
 * ENCOUNTER → REWARD MAPPING:
 *   Farmhouse ghost     → silkNeckerchief  (+1 Charm)
 *   Milking station cow → workGloves       (+1 Grit)
 *   Pasture scarecrow   → sturdyOveralls   (+1 Grit)
 *   Bee hives           → luckyHorseshoe   (+1 Keen Eye)
 *   Smokehouse zombie   → smokedJerky      (+1 Grit)
 *   Cornfield scarecrow → wellWornBoots    (+1 Grit)
 *   Grain silo cow      → ironLantern      (+1 Charm)
 *   Chicken coop mouse  → copperThimble    (+1 Charm)
 *   Barn Abigail        → learnedRitualLocation flag
 *
 * HIDDEN AREAS → CLUES:
 *   Root cellar  (barn)       — Farmer Miller dialogue mentions it directly
 *   Hayloft      (barn)       — barn_entrance mentions ladder behind hay bales
 *   Old well     (pasture)    — pasture_entrance mentions circular grass pattern
 *   Silo basement(grain silo) — grainsilo_entrance mentions cold draft from below
 */

// Main game state object
const GameState = {
    // Character information
    characterName: '',

    // Stats: each stat ranges from 2 to 5
    stats: {
        grit: 2,
        keenEye: 2,
        charm: 2
    },

    // Items in inventory (array of item IDs)
    inventory: [],

    // Equipped items (array of item IDs)
    equipped: [],

    // Current room the player is in
    currentRoom: 'farmhouse',

    // Rooms that have been visited (with visit counts)
    visitedRooms: {},

    // Discovered hidden areas
    discoveredHiddenAreas: [],

    // Body map: which curse (if any) is affecting each body part
    bodyMap: {
        head: null,
        arms: null,
        body: null,
        legs: null
    },

    // Active curses (object mapping curse type to advance timer and stopped status)
    activeCurses: {},

    // Game flags for tracking story progress
    flags: {},

    // Completed one-time events
    completedEvents: [],

    // Room transition counter (used for curse progression)
    roomTransitions: 0,

    // Game status
    gameStatus: 'playing', // 'playing', 'won', 'gameOver'

    // Bonus point assigned flag
    bonusPointAssigned: false
};

// Data loaded from JSON files
let RoomsData = {};
let ItemsData = {};
let CursesData = {};

/**
 * Loads all JSON data files
 * @returns {Promise} Resolves when all data is loaded
 */
async function loadGameData() {
    try {
        const [roomsResponse, itemsResponse, cursesResponse] = await Promise.all([
            fetch('data/rooms.json'),
            fetch('data/items.json'),
            fetch('data/curses.json')
        ]);

        RoomsData = await roomsResponse.json();
        ItemsData = await itemsResponse.json();
        CursesData = await cursesResponse.json();

        console.log('Game data loaded successfully');
        console.log('Rooms:', Object.keys(RoomsData).length);
        console.log('Items:', Object.keys(ItemsData).length);
        console.log('Curses:', Object.keys(CursesData).length);
    } catch (error) {
        console.error('Error loading game data:', error);
        alert('Failed to load game data!\n\nYou must run the game through a web server.\n\nDouble-click START_GAME.command to start properly.\n\nSee HOW_TO_PLAY.md for instructions.');
    }
}

/**
 * Initializes a new game with random stats
 */
function initializeNewGame() {
    // Reset game state
    GameState.characterName = '';
    GameState.inventory = [];
    GameState.equipped = [];
    GameState.currentRoom = 'farmhouse';
    GameState.visitedRooms = {};
    GameState.discoveredHiddenAreas = [];
    GameState.bodyMap = { head: null, arms: null, body: null, legs: null };
    GameState.activeCurses = {};
    GameState.flags = {};
    GameState.completedEvents = [];
    GameState.roomTransitions = 0;
    GameState.gameStatus = 'playing';
    GameState.bonusPointAssigned = false;

    // Randomly assign stats (2-5 stars each)
    // Total of 3 stats, each gets a random value between 2 and 5
    GameState.stats.grit = getRandomStatValue();
    GameState.stats.keenEye = getRandomStatValue();
    GameState.stats.charm = getRandomStatValue();

    console.log('New game initialized with stats:', GameState.stats);
}

/**
 * Generates a random stat value between 2 and 5
 * @returns {number} Random stat value
 */
function getRandomStatValue() {
    return Math.floor(Math.random() * 3) + 2; // Random number from 2 to 4
}

/**
 * Applies the bonus point to a chosen stat
 * @param {string} statName - The stat to boost ('grit', 'keenEye', or 'charm')
 */
function applyBonusPoint(statName) {
    if (!GameState.bonusPointAssigned && GameState.stats[statName] < 5) {
        GameState.stats[statName]++;
        GameState.bonusPointAssigned = true;
        console.log(`Bonus point applied to ${statName}. New value: ${GameState.stats[statName]}`);
        return true;
    }
    return false;
}

/**
 * Gets the current effective stat value (including equipment bonuses)
 * @param {string} statName - The stat to calculate
 * @returns {number} Total stat value
 */
function getEffectiveStat(statName) {
    let baseValue = GameState.stats[statName];

    // Add bonuses from equipped items
    GameState.equipped.forEach(itemId => {
        const item = ItemsData[itemId];
        if (item && item.statBoost && item.statBoost.stat === statName) {
            baseValue += item.statBoost.amount;
        }
    });

    // Apply penalties from cursed items in inventory
    GameState.inventory.forEach(itemId => {
        const item = ItemsData[itemId];
        if (item && item.type === 'cursed' && item.statPenalty && item.statPenalty.stat === statName) {
            baseValue -= item.statPenalty.amount;
        }
    });

    // Ensure stat doesn't go below 1 or above 5
    return Math.max(1, Math.min(5, baseValue));
}

/**
 * Adds an item to the player's inventory
 * @param {string} itemId - The item ID to add
 */
function addItemToInventory(itemId) {
    if (!GameState.inventory.includes(itemId)) {
        GameState.inventory.push(itemId);
        console.log(`Added ${itemId} to inventory`);

        const item = ItemsData[itemId];

        // If it's a cursed item, apply the curse effect
        if (item && item.curseEffect) {
            applyCurse(item.curseEffect.curse);
            checkBodyMapGameOver();
        }

        // If it's a protective item and the matching curse is active, fully cure it
        if (item && item.type === 'protective' && item.protectsFrom) {
            const curseType = item.protectsFrom;
            if (GameState.activeCurses[curseType]) {
                removeCurse(curseType);
                const curseName = CursesData[curseType] ? CursesData[curseType].name : curseType;
                console.log(`${item.name} fully cured ${curseName}!`);
                alert(`The ${item.name} flares with protective energy! The ${curseName} is purged from your body completely.`);
            }
        }
    }
}

/**
 * Removes an item from inventory
 * @param {string} itemId - The item ID to remove
 */
function removeItemFromInventory(itemId) {
    const index = GameState.inventory.indexOf(itemId);
    if (index > -1) {
        GameState.inventory.splice(index, 1);
        console.log(`Removed ${itemId} from inventory`);
    }
}

/**
 * Equips an item (moves it from inventory to equipped)
 * @param {string} itemId - The item ID to equip
 */
function equipItem(itemId) {
    const item = ItemsData[itemId];
    if (!item || !item.canEquip) {
        return false;
    }

    // Check for slot conflict - auto-swap if another item occupies the same slot
    if (item.equipSlot) {
        const conflictId = GameState.equipped.find(eqId => {
            const eqItem = ItemsData[eqId];
            return eqItem && eqItem.equipSlot === item.equipSlot;
        });
        if (conflictId) {
            // Unequip the conflicting item first (this handles curse resumption)
            unequipItem(conflictId);
        }
    }

    // Remove from inventory and add to equipped
    removeItemFromInventory(itemId);
    if (!GameState.equipped.includes(itemId)) {
        GameState.equipped.push(itemId);
        console.log(`Equipped ${itemId}`);
        return true;
    }
    return false;
}

/**
 * Unequips an item (moves it from equipped back to inventory)
 * @param {string} itemId - The item ID to unequip
 */
function unequipItem(itemId) {
    const index = GameState.equipped.indexOf(itemId);
    if (index > -1) {
        GameState.equipped.splice(index, 1);
        addItemToInventory(itemId);
        console.log(`Unequipped ${itemId}`);
        return true;
    }
    return false;
}

/**
 * Checks if player has a specific item (in inventory or equipped)
 * @param {string} itemId - The item ID to check
 * @returns {boolean} True if player has the item
 */
function hasItem(itemId) {
    return GameState.inventory.includes(itemId) || GameState.equipped.includes(itemId);
}

/**
 * Checks if player has a protective item for a curse type (in inventory or equipped)
 * @param {string} curseType - The curse type to check protection for
 * @returns {boolean} True if protected
 */
function hasProtection(curseType) {
    const curse = CursesData[curseType];
    if (!curse) return false;

    const protectiveItemId = curse.protectiveItem;
    return GameState.inventory.includes(protectiveItemId) || GameState.equipped.includes(protectiveItemId);
}

/**
 * Counts body parts occupied by a specific curse
 * @param {string} curseType
 * @returns {number} 0-4
 */
function getCurseStage(curseType) {
    let count = 0;
    for (const part in GameState.bodyMap) {
        if (GameState.bodyMap[part] === curseType) count++;
    }
    return count;
}

/**
 * Counts total occupied body parts (any curse)
 * @returns {number} 0-4
 */
function getBodyMapOccupiedCount() {
    let count = 0;
    for (const part in GameState.bodyMap) {
        if (GameState.bodyMap[part] !== null) count++;
    }
    return count;
}

/**
 * Claims one body part for the given curse
 * Picks a random part NOT already held by this curse
 * @param {string} curseType
 * @returns {Object|null} { bodyPart, overwrittenCurse } or null if impossible
 */
function advanceCurseOneStep(curseType) {
    const parts = ['head', 'arms', 'body', 'legs'];
    const candidates = parts.filter(p => GameState.bodyMap[p] !== curseType);

    if (candidates.length === 0) return null;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const previousOccupant = GameState.bodyMap[chosen];

    GameState.bodyMap[chosen] = curseType;

    // If we overwrote another curse, check if it still has any parts
    if (previousOccupant && previousOccupant !== curseType) {
        const otherStage = getCurseStage(previousOccupant);
        if (otherStage === 0) {
            delete GameState.activeCurses[previousOccupant];
            console.log(`Curse ${previousOccupant} fully displaced by ${curseType}`);
        }
    }

    console.log(`Curse ${curseType} claimed ${chosen}` + (previousOccupant ? ` (overwrote ${previousOccupant})` : ''));
    return { bodyPart: chosen, overwrittenCurse: previousOccupant };
}

/**
 * Frees one random body part from a specific curse
 * @param {string} curseType
 * @returns {string|null} The body part freed, or null
 */
function freeOneBodyPart(curseType) {
    const parts = ['head', 'arms', 'body', 'legs'];
    const occupied = parts.filter(p => GameState.bodyMap[p] === curseType);
    if (occupied.length === 0) return null;

    const chosen = occupied[Math.floor(Math.random() * occupied.length)];
    GameState.bodyMap[chosen] = null;
    console.log(`Freed ${chosen} from ${curseType} curse`);
    return chosen;
}

/**
 * Checks if all 4 body parts are cursed (game over condition)
 * @returns {boolean} True if game over
 */
function checkBodyMapGameOver() {
    if (getBodyMapOccupiedCount() >= 4) {
        GameState.gameStatus = 'gameOver';
        return true;
    }
    return false;
}

/**
 * Applies a curse to the player, claiming one body part
 * @param {string} curseType - The type of curse ('cow', 'bee', 'scarecrow', 'ghost', 'mouse')
 * @returns {Object} Result with success/blocked/alreadyActive status
 */
function applyCurse(curseType) {
    // Check if player has protection (in inventory or equipped)
    if (hasProtection(curseType)) {
        console.log(`Curse ${curseType} blocked by protective item`);
        return { blocked: true };
    }

    // If curse already exists (active or stopped), don't restart it
    if (GameState.activeCurses[curseType]) {
        console.log(`Curse ${curseType} already active`);
        return { alreadyActive: true };
    }

    const curseData = CursesData[curseType];
    if (!curseData) return { error: 'Curse not found' };

    // Create the curse entry
    GameState.activeCurses[curseType] = {
        roomsUntilNextAdvance: curseData.roomsUntilAdvance,
        stopped: false
    };

    // Immediately claim one body part
    const advanceResult = advanceCurseOneStep(curseType);

    console.log(`Applied curse: ${curseType}`);
    return {
        success: true,
        bodyPart: advanceResult ? advanceResult.bodyPart : null,
        overwrittenCurse: advanceResult ? advanceResult.overwrittenCurse : null
    };
}

/**
 * Progresses all active curses when moving to a new room
 * Each non-stopped curse decrements its timer and claims a body part when it fires
 * @returns {Array} Array of curse progression results
 */
function progressCurses() {
    const results = [];
    const curseTypes = Object.keys(GameState.activeCurses);

    for (const curseType of curseTypes) {
        const curseState = GameState.activeCurses[curseType];
        if (!curseState || curseState.stopped) continue;

        curseState.roomsUntilNextAdvance--;

        if (curseState.roomsUntilNextAdvance <= 0) {
            const advanceResult = advanceCurseOneStep(curseType);

            if (advanceResult) {
                curseState.roomsUntilNextAdvance = CursesData[curseType].roomsUntilAdvance;

                results.push({
                    curseType,
                    bodyPart: advanceResult.bodyPart,
                    overwrittenCurse: advanceResult.overwrittenCurse,
                    stage: getCurseStage(curseType)
                });
            }
        }
    }

    // Check game over after all curses have advanced
    if (getBodyMapOccupiedCount() >= 4) {
        GameState.gameStatus = 'gameOver';
        if (results.length > 0) {
            results[results.length - 1].gameOver = true;
        }
    }

    return results;
}

/**
 * Removes a curse (used when protective item is applied)
 * @param {string} curseType - The curse type to remove
 */
function removeCurse(curseType) {
    if (GameState.activeCurses[curseType]) {
        delete GameState.activeCurses[curseType];
        // Clear all body parts held by this curse
        for (const part in GameState.bodyMap) {
            if (GameState.bodyMap[part] === curseType) {
                GameState.bodyMap[part] = null;
            }
        }
        console.log(`Removed curse: ${curseType}`);
        return true;
    }
    return false;
}

/**
 * Moves the player to a new room
 * @param {string} roomId - The room ID to move to
 */
function moveToRoom(roomId) {
    GameState.currentRoom = roomId;
    GameState.roomTransitions++;

    // Track visit count
    if (!GameState.visitedRooms[roomId]) {
        GameState.visitedRooms[roomId] = 0;
    }
    GameState.visitedRooms[roomId]++;

    console.log(`Moved to room: ${roomId} (visit #${GameState.visitedRooms[roomId]})`);
}

/**
 * Gets the current room's visit count
 * @returns {number} Number of times current room has been visited
 */
function getCurrentRoomVisitCount() {
    return GameState.visitedRooms[GameState.currentRoom] || 0;
}

/**
 * Sets a game flag
 * @param {string} flagName - The flag name
 * @param {any} value - The flag value (default true)
 */
function setFlag(flagName, value = true) {
    GameState.flags[flagName] = value;
    console.log(`Flag set: ${flagName} = ${value}`);
}

/**
 * Checks if a game flag is set
 * @param {string} flagName - The flag name to check
 * @returns {boolean} True if flag is set
 */
function hasFlag(flagName) {
    return !!GameState.flags[flagName];
}

/**
 * Marks an event as completed (for one-time events)
 * @param {string} eventId - The event ID
 */
function completeEvent(eventId) {
    if (!GameState.completedEvents.includes(eventId)) {
        GameState.completedEvents.push(eventId);
    }
}

/**
 * Checks if an event has been completed
 * @param {string} eventId - The event ID to check
 * @returns {boolean} True if event is completed
 */
function isEventCompleted(eventId) {
    return GameState.completedEvents.includes(eventId);
}

/**
 * Discovers a hidden area
 * @param {string} areaId - The hidden area ID
 */
function discoverHiddenArea(areaId) {
    if (!GameState.discoveredHiddenAreas.includes(areaId)) {
        GameState.discoveredHiddenAreas.push(areaId);
        console.log(`Discovered hidden area: ${areaId}`);
        return true;
    }
    return false;
}

/**
 * Checks if a hidden area has been discovered
 * @param {string} areaId - The hidden area ID
 * @returns {boolean} True if discovered
 */
function isHiddenAreaDiscovered(areaId) {
    return GameState.discoveredHiddenAreas.includes(areaId);
}
