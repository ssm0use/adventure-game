/**
 * MAIN GAME MODULE
 *
 * This is the main orchestrator that ties all modules together.
 * It handles game initialization, room navigation, event processing,
 * and the overall game loop.
 */

// Game initialization flag
let gameInitialized = false;

/**
 * MAP_DIRECTIONS — hex direction for each neighbor, keyed by [currentRoom][neighborRoom].
 * Directions are flat-top hex compass positions: N, NE, SE, S, SW, NW.
 *
 * Farm layout:
 *
 *              [Bee Hives]
 *                  |
 *   [Smokehouse] [Garden]
 *         \     /       \
 *      [FARMHOUSE]    [Pasture]--[Cornfield]--[Grain Silo]
 *            |       /     |                       |
 *          [Barn]---    [Old Well]*         [Silo Basement]*
 *         /  |   \
 *  [Chicken][Milk][Hayloft]*
 *   [Coop]  [Stn]    |
 *               [Root Cellar]*
 *
 *  Entry: [Farm Gate] → [Farmhouse] (one-way, visit once)
 */
const MAP_DIRECTIONS = {
    farmGate:       { farmhouse: 'N' },
    farmhouse:      { barn: 'N',  garden: 'NE', smokehouse: 'NW' },
    barn:           { farmhouse: 'S', pasture: 'NE', milkingStation: 'SE', chickenCoop: 'SW', hayloft: 'N', rootcellar: 'NW' },
    garden:         { farmhouse: 'SW', pasture: 'SE', beeHives: 'N' },
    pasture:        { barn: 'SW', garden: 'NW', cornfield: 'NE', oldwell: 'SE' },
    cornfield:      { pasture: 'SW', grainSilo: 'NE' },
    grainSilo:      { cornfield: 'SW', siloBasement: 'SE' },
    smokehouse:     { farmhouse: 'SE' },
    milkingStation: { barn: 'NW' },
    chickenCoop:    { barn: 'NE' },
    beeHives:       { garden: 'S' },
    rootcellar:     { barn: 'SE' },
    hayloft:        { barn: 'S' },
    oldwell:        { pasture: 'NW' },
    siloBasement:   { grainSilo: 'NW' }
};

// Hex tile dimensions (flat-top hexagon, width:height ≈ 2:√3)
const HEX_W = 130;
const HEX_H = 113;

// Pixel offsets from center hex for each compass direction (flat-top hex geometry)
const HEX_OFFSETS = {
    N:  { x: 0,    y: -121 },
    S:  { x: 0,    y:  121 },
    NE: { x: 102,  y: -61  },
    SE: { x: 102,  y:  61  },
    NW: { x: -102, y: -61  },
    SW: { x: -102, y:  61  }
};

/**
 * Returns all hidden areas for a room as an array.
 * Supports both singular hiddenArea and plural hiddenAreas formats.
 */
function getHiddenAreas(room) {
    if (!room) return [];
    if (room.hiddenAreas) return room.hiddenAreas;
    if (room.hiddenArea) return [room.hiddenArea];
    return [];
}

/**
 * Initializes the entire game
 * Called when the page loads
 */
async function initializeGame() {
    console.log('Initializing Cursed Farm Adventure...');

    // Load all data files
    await loadGameData();
    await loadStoryText();

    // Set up event listeners
    setupEventListeners();

    // Initialize audio system
    initAudio();

    // Initialize game settings panel
    initGameSettings();

    // Start a new game (shows Load button if saves exist)
    startNewGame();
}

/**
 * Starts a new game
 */
function startNewGame() {
    // Initialize game state with random stats
    initializeNewGame();

    // Restore name input if it was replaced with display
    const nameDisplay = document.getElementById('character-name-display');
    if (nameDisplay) {
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'character-name';
        nameInput.placeholder = 'Enter your name';
        nameInput.maxLength = 20;
        nameInput.addEventListener('input', (e) => {
            GameState.characterName = e.target.value.trim() || 'Adventurer';
        });
        nameDisplay.parentNode.replaceChild(nameInput, nameDisplay);
    }

    // Reset bonus point buttons (they may be disabled from previous game)
    const bonusBtns = document.querySelectorAll('.bonus-btn');
    bonusBtns.forEach(btn => {
        btn.disabled = false;
        // Remove any checkmarks from previous game
        btn.textContent = btn.textContent.replace(' ✓', '');
    });

    // Show the bonus point selection UI
    displayStoryText('game_intro');
    clearChoices();
    renderAllUI();
    syncDifficultyUI();
    showBonusPointUI();

    // Add continue button - disabled until bonus point assigned
    addChoice('Begin Your Adventure', () => {
        console.log('Begin Adventure button clicked!');
        beginAdventure();
    }, false); // Start disabled

    // Offer load option via button (avoids native confirm dialogs that break focus on Windows)
    if (anySavesExist()) {
        addChoice('Load Saved Game', () => {
            showLoadModal();
        });
    }

    gameInitialized = true;
}

/**
 * Begins the adventure after character creation
 */
function beginAdventure() {
    console.log('beginAdventure called');
    console.log('Bonus point assigned:', GameState.bonusPointAssigned);

    // Check if game data is loaded
    if (!RoomsData || Object.keys(RoomsData).length === 0) {
        console.error('Game data not loaded! RoomsData is empty.');
        alert('ERROR: Game data failed to load!\n\nYou must run the game through a web server, not by opening index.html directly.\n\nDouble-click START_GAME.command to start the game properly.\n\nSee HOW_TO_PLAY.md for instructions.');
        return;
    }

    // Get character name
    const nameInput = document.getElementById('character-name');
    GameState.characterName = nameInput.value.trim() || 'Adventurer';

    // Check if bonus point has been assigned
    if (!GameState.bonusPointAssigned) {
        alert('Please assign your bonus stat point before continuing!');
        return;
    }

    console.log('Character name:', GameState.characterName);
    console.log('Entering farm gate...');

    hideBonusPointUI();

    // Replace name input with signature-style display
    const nameDisplay = document.createElement('div');
    nameDisplay.id = 'character-name-display';
    nameDisplay.textContent = GameState.characterName;
    nameInput.parentNode.replaceChild(nameDisplay, nameInput);

    // Start at the farm gate
    enterRoom('farmGate');
}

/**
 * Enters a room and displays its content
 * @param {string} roomId - The room to enter
 */
function enterRoom(roomId) {
    console.log('enterRoom called with:', roomId);
    console.log('RoomsData loaded:', Object.keys(RoomsData).length, 'rooms');
    console.log('Game status:', GameState.gameStatus);

    // Check if we're in a game over state
    if (GameState.gameStatus !== 'playing') {
        if (GameState.gameStatus === 'won') {
            displayWinScreen();
        } else if (GameState.gameStatus === 'gameOver') {
            displayBodyMapGameOver();
        }
        return;
    }

    // Move to the room (updates visit count)
    const isFirstVisit = !GameState.visitedRooms[roomId];
    moveToRoom(roomId);
    renderLocation();
    playRoomMusic(roomId);

    // Progress any active curses (except on very first room entry)
    if (GameState.roomTransitions > 1) {
        const curseProgressions = progressCurses();

        // Check if any curse caused game over
        if (GameState.gameStatus === 'gameOver') {
            renderCurses();
            renderCurseStatus();

            if (curseProgressions.length > 0) {
                // Brief flash before game over
                const storyArea = document.getElementById('story-text');
                let html = '';
                curseProgressions.forEach(prog => {
                    const curseData = CursesData[prog.curseType];
                    html += `<div class="curse-applied-warning"><strong>⚠ ${curseData.name}</strong> — the curse claims the last of you.</div>`;
                });
                storyArea.innerHTML = html;
                setTimeout(() => {
                    displayBodyMapGameOver();
                }, 3000);
            } else {
                displayBodyMapGameOver();
            }
            return;
        }

        // Display brief curse advance notification, then let inline status handle details
        if (curseProgressions.length > 0) {
            const storyArea = document.getElementById('story-text');
            let html = '';
            curseProgressions.forEach(prog => {
                const curseData = CursesData[prog.curseType];
                html += `<div class="curse-applied-warning"><strong>⚠ ${curseData.name}</strong> — the curse spreads further, claiming more of your body.</div>`;
            });
            storyArea.innerHTML = html;
            storyArea.scrollTop = 0;

            clearChoices();
            addChoice('Continue...', () => {
                renderRoom(roomId, isFirstVisit);
            });

            renderCurses();
            renderCurseStatus();
            return;
        }
    }

    // Render the room normally
    renderRoom(roomId, isFirstVisit);
}

/**
 * Renders the current room's content and choices
 * @param {string} roomId - The room to render
 * @param {boolean} isFirstVisit - Whether this is the first visit
 */
function renderRoom(roomId, isFirstVisit) {
    console.log('renderRoom called:', roomId, 'isFirstVisit:', isFirstVisit);
    const room = RoomsData[roomId];
    if (!room) {
        console.error('Room not found:', roomId);
        console.error('Available rooms:', Object.keys(RoomsData));
        return;
    }

    console.log('Room data:', room);
    hideEncounterResult();
    renderCurses();
    renderCurseStatus();

    // Check for hidden area discovery (small chance each visit)
    const hiddenAreas = getHiddenAreas(room);
    for (const area of hiddenAreas) {
        if (!isHiddenAreaDiscovered(area.name) && checkEventRequirements(area)) {
            const checkResult = performPassiveKeenEyeCheck(area.luckThreshold);

            if (checkResult.success) {
                discoverHiddenArea(area.name);
                displayStoryText(area.name + '_discover');

                const storyArea = document.getElementById('story-text');
                const successMsg = document.createElement('div');
                successMsg.className = 'curse-applied-warning';
                successMsg.style.color = '#4a9';
                const areaRoom = RoomsData[area.name];
                const areaName = areaRoom ? areaRoom.name : area.name;
                successMsg.innerHTML = `<strong>✦ You discovered the ${areaName}!</strong>`;
                storyArea.appendChild(successMsg);

                clearChoices();
                addChoice('Continue...', () => {
                    renderRoomContent(roomId);
                });
                return;
            }
        }
    }

    renderRoomContent(roomId);
}

/**
 * Renders the room's main content
 * @param {string} roomId - The room to render
 */
function renderRoomContent(roomId) {
    const room = RoomsData[roomId];

    // Refresh curse displays
    renderCurses();
    renderCurseStatus();

    // Find first-visit events
    const firstVisitEvents = room.events?.filter(e =>
        e.trigger === 'firstVisit' &&
        !isEventCompleted(e.id) &&
        checkEventRequirements(e)
    ) || [];

    // Display story for first-visit events
    if (firstVisitEvents.length > 0) {
        const event = firstVisitEvents[0];

        // Check if event blocks entry (don't complete it - keep blocking until requirements change)
        if (event.blocksEntry) {
            displayStoryText(event.storyKey);

            // Show navigation choices (can't enter this room)
            clearChoices();
            renderNavigationChoices(GameState.currentRoom, true); // Back to previous
            return;
        }

        displayStoryText(event.storyKey);
        if (event.oneTime) {
            completeEvent(event.id);
        }
    } else {
        // No first-visit events — show return-visit description for this room
        // Use a cleared variant if all action events are done and one exists
        const allActionsDone = room.events?.filter(e => e.trigger === 'action').every(e => isEventCompleted(e.id)) ?? true;
        const clearedKey = roomId + '_return_cleared';
        if (allActionsDone && hasStoryText(clearedKey)) {
            displayStoryText(clearedKey);
        } else {
            displayStoryText(roomId + '_return');
        }
    }

    // If room is fully cleared, append the explored indicator
    if (isRoomFullyCleared(roomId)) {
        displayAreaExploredIndicator(room.name);
    }

    // Show all available actions for this room
    renderRoomActions(roomId);
}

/**
 * Checks if all actionable content in a room is done (events, searches, items claimed)
 * @param {string} roomId - The room to check
 * @returns {boolean} True if all content is done
 */
function isRoomContentDone(roomId) {
    const room = RoomsData[roomId];
    if (!room) return true;

    const remainingActions = room.events?.filter(e =>
        e.trigger === 'action' && !isEventCompleted(e.id)
    ) || [];
    if (remainingActions.length > 0) return false;

    const remainingSearches = room.searches?.filter(s =>
        !isEventCompleted(s.id)
    ) || [];
    if (remainingSearches.length > 0) return false;

    const hasUnclaimedItems = room.searches?.some(s => {
        if (!isEventCompleted(s.id)) return false;
        return s.items?.some(itemId => !hasItem(itemId)) || false;
    }) || false;
    if (hasUnclaimedItems) return false;

    // Check for undiscovered hidden areas
    const hiddenAreas = getHiddenAreas(room);
    for (const area of hiddenAreas) {
        if (!isHiddenAreaDiscovered(area.name)) return false;
    }

    return true;
}

/**
 * Checks if a room has actionable content and it's all been completed
 * Used for the "Explored Areas" list display
 * @param {string} roomId - The room to check
 * @returns {boolean} True if room had content and it's all cleared
 */
function isRoomFullyCleared(roomId) {
    const room = RoomsData[roomId];
    if (!room) return false;

    const hasContent = (room.events?.some(e => e.trigger === 'action') || false) ||
                       (room.searches?.length > 0 || false) ||
                       (getHiddenAreas(room).length > 0);
    if (!hasContent) return false;

    return isRoomContentDone(roomId);
}

/**
 * Determines if a destination room should be hidden from navigation.
 * Currently always returns false — cleared rooms stay visible (styled with hex-cleared).
 * @param {string} destRoomId - The destination room
 * @param {string} currentRoomId - The room the player is currently in
 * @returns {boolean} Always false — rooms are never hidden
 */
function shouldHideFromNavigation(destRoomId, currentRoomId) {
    return false;
}

/**
 * Renders all available actions for a room
 * @param {string} roomId - The room ID
 */
function renderRoomActions(roomId) {
    const room = RoomsData[roomId];

    // Always refresh curse displays when re-rendering room actions
    renderCurses();
    renderCurseStatus();

    clearChoices();

    // Action events (encounters, special actions)
    const actionEvents = room.events?.filter(e =>
        e.trigger === 'action' &&
        !isEventCompleted(e.id) &&
        checkEventRequirements(e)
    ) || [];

    actionEvents.forEach(event => {
        // Check for win condition
        if (event.winCondition) {
            addChoice(event.actionText, () => {
                performWinAction(event);
            });
        } else if (event.check) {
            // Event with a stat check
            addChoice(event.actionText, () => {
                performEncounterAction(event);
            });
        } else if (event.effect) {
            // Auto-complete action (no dice roll)
            addChoice(event.actionText, () => {
                performAutoAction(event);
            });
        }
    });

    // Unified search: regular searches take priority, then hidden area discovery
    const availableSearches = room.searches?.filter(s =>
        !isEventCompleted(s.id) &&
        checkSearchRequirements(s)
    ) || [];

    const hiddenAreas = getHiddenAreas(room);
    const undiscoveredAreas = hiddenAreas.filter(a => !isHiddenAreaDiscovered(a.name) && checkEventRequirements(a));

    if (availableSearches.length > 0) {
        const searchText = availableSearches[0].searchText || `Search ${room.name}`;
        addChoice(searchText, () => {
            performSearchAction(roomId, availableSearches);
        });
    } else if (undiscoveredAreas.length > 0) {
        addChoice(`Search ${room.name}`, () => {
            performHiddenAreaSearch(roomId);
        });
    }

    // Show unclaimed items from completed searches
    const completedSearches = room.searches?.filter(s =>
        isEventCompleted(s.id) && s.items
    ) || [];

    completedSearches.forEach(search => {
        search.items.forEach(itemId => {
            if (!hasItem(itemId)) {
                const item = ItemsData[itemId];
                if (item) {
                    addChoice(`Pick Up ${item.name}`, () => {
                        addItemToInventory(itemId);
                        renderInventory();
                        renderCurses();
                        renderCurseStatus();

                        // Announce the item in a green block
                        const storyArea = document.getElementById('story-text');
                        const rewardDiv = document.createElement('div');
                        rewardDiv.className = 'item-reward-announcement';
                        rewardDiv.innerHTML = `<strong>✦ Discovered: ${item.name}</strong> — ${item.description}`;
                        storyArea.appendChild(rewardDiv);

                        // Check if picking up a cursed item caused game over
                        if (GameState.gameStatus === 'gameOver') {
                            setTimeout(() => {
                                displayBodyMapGameOver();
                            }, 3000);
                            return;
                        }

                        renderRoomActions(roomId);
                    });
                }
            }
        });
    });

    // Show pending items (encounter rewards not yet picked up, in Default/Story mode)
    const pendingItems = getPendingItems(roomId);
    pendingItems.forEach(itemId => {
        const item = ItemsData[itemId];
        if (!item) return;

        let btnText = `Pick Up ${item.name}`;
        if (item.type === 'cursed') {
            btnText = `Pick Up ${item.name} (Cursed!)`;
        }

        addChoice(btnText, () => {
            addItemToInventory(itemId);
            removePendingItem(roomId, itemId);
            renderInventory();
            renderCurses();
            renderCurseStatus();

            // Announce the item in the story area
            const storyArea = document.getElementById('story-text');
            const rewardDiv = document.createElement('div');
            rewardDiv.className = 'item-reward-announcement';
            rewardDiv.innerHTML = `<strong>✦ Picked Up: ${item.name}</strong> — ${item.description}`;
            storyArea.appendChild(rewardDiv);

            if (item.type === 'cursed') {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'curse-applied-warning';
                warningDiv.innerHTML = `<span class="story-warning">You picked up a cursed item!</span>`;
                storyArea.appendChild(warningDiv);
            }

            // Check if picking up a cursed item caused game over
            if (GameState.gameStatus === 'gameOver') {
                setTimeout(() => {
                    displayBodyMapGameOver();
                }, 3000);
                return;
            }

            renderRoomActions(roomId);
        });
    });

    // Navigation choices
    renderNavigationChoices(roomId);

    // Update the explored areas log
    renderExploredAreas();
}

/**
 * Performs a win action (ritual to break curse)
 * @param {Object} event - The event object
 */
function performWinAction(event) {
    displayStoryText(event.storyKey);
    GameState.gameStatus = 'won';

    // Victory cures all active curses and clears body map
    for (const curseType in GameState.activeCurses) {
        delete GameState.activeCurses[curseType];
    }
    GameState.bodyMap = { head: null, arms: null, body: null, legs: null };
    GameState.curseClock = 0;
    renderCurses();
    renderCurseStatus();

    setTimeout(() => {
        displayWinScreen();
    }, 3000);
}

/**
 * Performs an automatic action event (no dice roll).
 * Displays story text, applies effects (flags, item consumption, event completion),
 * and re-renders the room.
 * @param {Object} event - The event object with an effect field
 */
function performAutoAction(event) {
    displayStoryText(event.storyKey);

    const effect = event.effect;

    // Set flag
    if (effect.flag) {
        setFlag(effect.flag);
    }

    // Consume item (remove from inventory)
    if (effect.consumeItem) {
        removeItemFromInventory(effect.consumeItem);
        renderInventory();
    }

    // Complete a related event (e.g., skip the charm check)
    if (effect.completesEvent) {
        completeEvent(effect.completesEvent);
    }

    // Mark this event itself as completed
    completeEvent(event.id);

    // Re-render
    renderCurses();
    renderCurseStatus();

    clearChoices();
    addChoice('Continue...', () => {
        renderRoomContent(GameState.currentRoom);
    });
}

/**
 * Shows the encounter preview before the player commits to rolling
 * @param {Object} event - The event object
 */
function performEncounterAction(event) {
    // Check if this encounter has a dedicated story description
    // (not the same as the success/failure story keys)
    const hasEncounterDescription = event.storyKey &&
        event.storyKey !== event.check.successStory &&
        event.storyKey !== event.check.failureStory;

    if (hasEncounterDescription) {
        // Phase 1: Show the encounter story, then transition to combat
        displayStoryText(event.storyKey);
        clearChoices();
        addChoice('Brace Yourself...', () => {
            showEncounterPreview(event);
        });
        if (!event.noEscape) {
            addChoice('Back Away', () => {
                hideEncounterResult();
                renderRoomActions(GameState.currentRoom);
            });
        }
    } else {
        // No separate story - go straight to the combat preview
        showEncounterPreview(event);
    }
}

/**
 * Shows the combat preview with stats, odds, and roll/flee buttons
 * @param {Object} event - The event object
 */
function showEncounterPreview(event) {
    // Update story area with a combat transition message
    const storyArea = document.getElementById('story-text');
    storyArea.innerHTML = '<p><em>You steel yourself for what comes next...</em></p>';
    storyArea.scrollTop = 0;

    // Show the pre-roll preview with stats and odds
    displayEncounterPreview(formatEncounterPreview(event));

    // Give the player a choice: roll or flee
    clearChoices();
    addChoice('Roll the Dice!', () => {
        executeEncounterRoll(event);
    });
    if (!event.noEscape) {
        addChoice('Back Away', () => {
            hideEncounterResult();
            renderRoomActions(GameState.currentRoom);
        });
    }
}

/**
 * Executes the actual dice roll and resolves the encounter
 * Called after the player chooses to proceed from the preview
 * @param {Object} event - The event object
 */
function executeEncounterRoll(event) {
    const result = resolveEncounter(event);

    // Check if a curse was blocked by a protective item
    if (result.curseApplied && result.curseApplied.blocked) {
        const curseType = event.check.failureEffect.curse;
        const protectiveItemId = CursesData[curseType].protectiveItem;
        const protectiveItem = ItemsData[protectiveItemId];
        const curseName = CursesData[curseType].name;

        // Show protection story instead of failure story
        displayProtectionText(curseName, protectiveItem.name);
    } else if (result.curseApplied && result.curseApplied.storyModeBlocked) {
        // Story Mode: existing curse blocked a new one
        displayStoryText(result.storyKey);

        const storyArea = document.getElementById('story-text');
        const notice = document.createElement('div');
        notice.className = 'item-protection-announcement';
        notice.innerHTML = `<strong>✦ Something strange happens...</strong> You feel a dark energy try to take hold, but the existing curse seems to repel it. Perhaps one affliction is all the farm's magic can sustain in you at once.`;
        storyArea.appendChild(notice);
    } else {
        // Normal path: display the encounter story
        displayStoryText(result.storyKey);

        // If a curse was applied, append a prominent warning to the story text
        if (result.curseApplied && result.curseApplied.success) {
            const curseType = event.check.failureEffect.curse;
            const curseData = CursesData[curseType];
            if (curseData) {
                const storyArea = document.getElementById('story-text');
                const warning = document.createElement('div');
                warning.className = 'curse-applied-warning';
                warning.innerHTML = `<strong>⚠ ${curseData.name}!</strong> A curse has taken hold. It will spread further with each place you visit unless you find a cure.`;
                storyArea.appendChild(warning);
            }
        }
    }

    // Show the dice roll result
    displayEncounterResult(result);

    // Mark event as completed on success, or on failure if completesOnFailure is set
    if (result.success || event.completesOnFailure) {
        completeEvent(event.id);
    }

    // Grant reward items on success
    if (result.success && result.rewardItems) {
        if (GameState.difficulty === 'hard') {
            // Hard mode: auto-pickup all items (legacy behavior)
            result.rewardItems.forEach(itemId => {
                addItemToInventory(itemId);
            });
            renderInventory();
            renderCurses();
            renderCurseStatus();

            // Announce discovered items in the story area
            const storyArea = document.getElementById('story-text');
            result.rewardItems.forEach(itemId => {
                const item = ItemsData[itemId];
                if (item) {
                    const rewardDiv = document.createElement('div');
                    rewardDiv.className = 'item-reward-announcement';
                    rewardDiv.innerHTML = `<strong>✦ Discovered: ${item.name}</strong> — ${item.description}`;
                    storyArea.appendChild(rewardDiv);

                    if (item.type === 'cursed') {
                        const warningDiv = document.createElement('div');
                        warningDiv.className = 'curse-applied-warning';
                        warningDiv.innerHTML = `<span class="story-warning">You were compelled to pick up a cursed item and are now cursed.</span>`;
                        storyArea.appendChild(warningDiv);
                    }
                }
            });
        } else {
            // Default / Story mode: show items as pending pickups
            addPendingItems(GameState.currentRoom, result.rewardItems);

            const storyArea = document.getElementById('story-text');
            result.rewardItems.forEach(itemId => {
                const item = ItemsData[itemId];
                if (item) {
                    const rewardDiv = document.createElement('div');
                    rewardDiv.className = 'item-reward-announcement';
                    if (item.type === 'cursed') {
                        rewardDiv.innerHTML = `<strong>✦ Found: ${item.name}</strong> — ${item.description}<br><em class="story-warning">${item.warning || 'This item radiates dark energy.'}</em>`;
                    } else {
                        rewardDiv.innerHTML = `<strong>✦ Found: ${item.name}</strong> — ${item.description}`;
                    }
                    storyArea.appendChild(rewardDiv);
                }
            });
        }
    }

    // Penalty for losing an unprotected encounter: advance curse clock by 1
    if (!result.success && result.curseApplied && !result.curseApplied.blocked) {
        const curseProgressions = progressCurses();

        if (curseProgressions.length > 0) {
            const storyArea = document.getElementById('story-text');
            curseProgressions.forEach(prog => {
                const curseData = CursesData[prog.curseType];
                const warning = document.createElement('div');
                warning.className = 'curse-applied-warning';
                warning.innerHTML = `<strong>⚠ ${curseData.name}</strong> — the curse spreads further, claiming more of your body.`;
                storyArea.appendChild(warning);
            });
        }
    }

    // Re-render UI in case curse was applied
    renderCurses();
    renderCurseStatus();

    // Check if encounter caused game over (body map full from curse item pickup or encounter)
    if (GameState.gameStatus === 'gameOver') {
        setTimeout(() => {
            displayBodyMapGameOver();
        }, 3000);
        return;
    }

    // Add continue button - return to full room view to clear encounter display
    clearChoices();
    addChoice('Continue...', () => {
        hideEncounterResult();
        renderRoomContent(GameState.currentRoom);
    });
}

/**
 * Performs a search action
 * @param {string} roomId - The current room
 * @param {Array} searches - Available search objects
 */
function performSearchAction(roomId, searches) {
    const search = searches[0]; // Take first available search

    displayStoryText(search.storyKey);

    // Track which items have been taken this search
    const itemsTakenThisSearch = new Set();

    if (GameState.difficulty === 'hard') {
        // Hard mode: auto-add cursed items immediately (legacy behavior)
        if (search.items && search.items.length > 0) {
            search.items.forEach(itemId => {
                const item = ItemsData[itemId];
                if (item && item.type === 'cursed') {
                    addItemToInventory(itemId);
                    itemsTakenThisSearch.add(itemId);
                    renderInventory();
                    renderCurses();
                    renderCurseStatus();

                    const storyArea = document.getElementById('story-text');
                    const rewardDiv = document.createElement('div');
                    rewardDiv.className = 'item-reward-announcement';
                    rewardDiv.innerHTML = `<strong>✦ Discovered: ${item.name}</strong> — ${item.description}`;
                    storyArea.appendChild(rewardDiv);

                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'curse-applied-warning';
                    warningDiv.innerHTML = `<span class="story-warning">You were compelled to pick up a cursed item and are now cursed.</span>`;
                    storyArea.appendChild(warningDiv);
                }
            });
        }
    } else {
        // Default / Story mode: announce cursed items but don't auto-add
        if (search.items && search.items.length > 0) {
            search.items.forEach(itemId => {
                const item = ItemsData[itemId];
                if (item && item.type === 'cursed') {
                    const storyArea = document.getElementById('story-text');
                    const rewardDiv = document.createElement('div');
                    rewardDiv.className = 'item-reward-announcement';
                    rewardDiv.style.borderColor = '#8b6f47';
                    rewardDiv.style.color = '#6b5638';
                    rewardDiv.innerHTML = `<strong>✦ Found: ${item.name}</strong> — ${item.description}<br><em class="story-warning">${item.warning || 'This item radiates dark energy.'}</em>`;
                    storyArea.appendChild(rewardDiv);
                }
            });
        }
    }

    function renderSearchChoices() {
        clearChoices();

        // Show items found and let player choose which to take
        if (search.items && search.items.length > 0) {
            search.items.forEach(itemId => {
                // Skip items already taken
                if (itemsTakenThisSearch.has(itemId)) return;

                const item = ItemsData[itemId];
                if (!item) return;

                let itemText = `Take ${item.name}`;
                if (item.type === 'cursed' && GameState.difficulty !== 'hard') {
                    itemText = `Pick Up ${item.name} (Cursed!)`;
                }

                addChoice(itemText, () => {
                    addItemToInventory(itemId);
                    itemsTakenThisSearch.add(itemId);
                    renderInventory();
                    renderCurses();
                    renderCurseStatus();

                    // Announce the item
                    const storyArea = document.getElementById('story-text');
                    const rewardDiv = document.createElement('div');
                    rewardDiv.className = 'item-reward-announcement';
                    rewardDiv.innerHTML = `<strong>✦ Discovered: ${item.name}</strong> — ${item.description}`;
                    storyArea.appendChild(rewardDiv);

                    if (item.type === 'cursed') {
                        // Check if curse was blocked by story mode
                        const curseResult = GameState.activeCurses[item.curseEffect?.curse] ? null : true;
                        const warningDiv = document.createElement('div');
                        warningDiv.className = 'curse-applied-warning';
                        warningDiv.innerHTML = `<span class="story-warning">You picked up a cursed item!</span>`;
                        storyArea.appendChild(warningDiv);
                    }

                    // Check if picking up a cursed item caused game over
                    if (GameState.gameStatus === 'gameOver') {
                        setTimeout(() => {
                            displayBodyMapGameOver();
                        }, 3000);
                        return;
                    }

                    // Re-render choices to remove taken item
                    renderSearchChoices();
                });
            });
        }

        // Add "Continue" button if at least some items remain or all taken
        addChoice('Continue (Finish Searching)', () => {
            // Mark search as completed
            completeEvent(search.id);
            clearChoices();
            addChoice('Continue...', () => {
                renderRoomActions(roomId);
            });
        });
    }

    renderSearchChoices();
}

/**
 * Performs an active search for hidden areas in the current room.
 * Advances the curse clock as a cost, then resolves the Keen Eye check.
 * @param {string} roomId - The room to search
 */
function performHiddenAreaSearch(roomId) {
    const room = RoomsData[roomId];
    const hiddenAreas = getHiddenAreas(room);
    const undiscoveredAreas = hiddenAreas.filter(a => !isHiddenAreaDiscovered(a.name) && checkEventRequirements(a));
    if (undiscoveredAreas.length === 0) return;

    const targetArea = undiscoveredAreas[0];

    // Advance curse clock (searching costs time like movement)
    const curseProgressions = progressCurses();

    // Check if curse progression caused game over
    if (GameState.gameStatus === 'gameOver') {
        renderCurses();
        renderCurseStatus();

        const storyArea = document.getElementById('story-text');
        let html = '';
        curseProgressions.forEach(prog => {
            const curseData = CursesData[prog.curseType];
            html += `<div class="curse-applied-warning"><strong>⚠ ${curseData.name}</strong> — the curse claims the last of you.</div>`;
        });
        storyArea.innerHTML = html;
        setTimeout(() => {
            displayBodyMapGameOver();
        }, 3000);
        return;
    }

    // If curses progressed (but not game over), show warning first
    if (curseProgressions.length > 0) {
        renderCurses();
        renderCurseStatus();

        const storyArea = document.getElementById('story-text');
        let html = '';
        curseProgressions.forEach(prog => {
            const curseData = CursesData[prog.curseType];
            html += `<div class="curse-applied-warning"><strong>⚠ ${curseData.name}</strong> — the curse spreads further, claiming more of your body.</div>`;
        });
        storyArea.innerHTML = html;
        storyArea.scrollTop = 0;

        clearChoices();
        addChoice('Continue...', () => {
            resolveHiddenAreaSearch(roomId, targetArea);
        });
        return;
    }

    // No curse progression — resolve search immediately
    resolveHiddenAreaSearch(roomId, targetArea);
}

/**
 * Resolves a hidden area search using the Keen Eye check.
 * @param {string} roomId - The room being searched
 * @param {Object} targetArea - The hidden area object to search for
 */
function resolveHiddenAreaSearch(roomId, targetArea) {
    // Cumulative bonus: each prior failed search lowers the threshold by 2
    const attempts = GameState.searchAttempts[roomId] || 0;
    const adjustedThreshold = Math.max(5, targetArea.luckThreshold - (attempts * 2));
    const checkResult = performPassiveKeenEyeCheck(adjustedThreshold);

    if (checkResult.success) {
        discoverHiddenArea(targetArea.name);
        displayStoryText(targetArea.name + '_discover');

        const storyArea = document.getElementById('story-text');
        const successMsg = document.createElement('div');
        successMsg.className = 'curse-applied-warning';
        successMsg.style.color = '#4a9';
        const areaRoom = RoomsData[targetArea.name];
        const areaName = areaRoom ? areaRoom.name : targetArea.name;
        successMsg.innerHTML = `<strong>✦ You discovered the ${areaName}!</strong>`;
        storyArea.appendChild(successMsg);

        clearChoices();
        addChoice('Continue...', () => {
            renderRoomContent(roomId);
        });
    } else {
        // Track failed attempt for cumulative bonus next time
        GameState.searchAttempts[roomId] = attempts + 1;

        // Show room-specific failure text, or generic fallback
        const failKey = roomId + '_search_fail';
        const storyArea = document.getElementById('story-text');

        if (hasStoryText(failKey)) {
            displayStoryText(failKey);
        } else {
            storyArea.innerHTML = '<p>You search thoroughly but find nothing new. The room keeps its secrets — for now.</p>';
            storyArea.scrollTop = 0;
        }

        // Hint that familiarity is growing
        const hint = document.createElement('p');
        hint.style.cssText = 'color: #6a8a6a; font-style: italic; margin-top: 10px;';
        hint.textContent = 'Still, you feel you know this place a little better now. Next time, you might spot something you missed.';
        storyArea.appendChild(hint);

        clearChoices();
        addChoice('Continue...', () => {
            renderRoomActions(roomId);
        });
    }
}

/**
 * Collects the list of visible neighbor destinations for a room.
 * Uses the same filtering logic as the old button-based navigation
 * (shouldHideFromNavigation + discovered hidden areas + safety fallback).
 * @param {string} roomId - Current room ID
 * @returns {Array<{id: string, name: string}>} Visible neighbor rooms
 */
function getVisibleNeighbors(roomId) {
    const room = RoomsData[roomId];
    if (!room) return [];

    const visibleConnections = room.connections.filter(connId => {
        const connRoom = RoomsData[connId];
        return connRoom && !shouldHideFromNavigation(connId, roomId);
    });

    const visibleHidden = [];
    for (const area of getHiddenAreas(room)) {
        if (isHiddenAreaDiscovered(area.name)) {
            const hiddenRoomId = area.name;
            const hiddenRoom = RoomsData[hiddenRoomId];
            if (hiddenRoom && !shouldHideFromNavigation(hiddenRoomId, roomId)) {
                visibleHidden.push(hiddenRoomId);
            }
        }
    }

    // Safety: if nothing is visible, show all connections to prevent getting stuck
    if (visibleConnections.length === 0 && visibleHidden.length === 0) {
        room.connections.forEach(connId => {
            if (RoomsData[connId] && !visibleConnections.includes(connId)) {
                visibleConnections.push(connId);
            }
        });
    }

    const neighbors = [];
    visibleConnections.forEach(id => {
        neighbors.push({ id, name: RoomsData[id].name });
    });
    visibleHidden.forEach(id => {
        neighbors.push({ id, name: RoomsData[id].name });
    });
    return neighbors;
}

/**
 * Renders the hexagonal navigation map for a room.
 * Current room is center hex; visible neighbors are positioned by compass direction.
 * @param {string} roomId - Current room ID
 */
function renderHexMap(roomId) {
    const hexMap = document.getElementById('hex-map');
    hexMap.innerHTML = '';

    const room = RoomsData[roomId];
    if (!room) return;

    const neighbors = getVisibleNeighbors(roomId);
    if (neighbors.length === 0) return;

    const directions = MAP_DIRECTIONS[roomId] || {};

    // Grid container — sized to hold center hex + one ring of neighbors
    const grid = document.createElement('div');
    grid.className = 'hex-grid';

    // Center hex (current room)
    const centerHex = document.createElement('div');
    centerHex.className = 'hex hex-current';
    centerHex.textContent = room.name;
    // Position at center of grid
    centerHex.style.left = '50%';
    centerHex.style.top = '50%';
    centerHex.style.transform = 'translate(-50%, -50%)';
    grid.appendChild(centerHex);

    // Neighbor hexes
    neighbors.forEach(neighbor => {
        const dir = directions[neighbor.id];
        if (!dir || !HEX_OFFSETS[dir]) return; // skip if no direction mapping

        const offset = HEX_OFFSETS[dir];
        const hex = document.createElement('div');
        hex.className = isRoomFullyCleared(neighbor.id) ? 'hex hex-neighbor hex-cleared' : 'hex hex-neighbor';
        hex.textContent = neighbor.name;
        hex.style.left = `calc(50% + ${offset.x}px)`;
        hex.style.top = `calc(50% + ${offset.y}px)`;
        hex.style.transform = 'translate(-50%, -50%)';
        hex.addEventListener('click', () => {
            enterRoom(neighbor.id);
        });
        grid.appendChild(hex);
    });

    hexMap.appendChild(grid);
}

/**
 * Renders navigation choices (moving to connected rooms)
 * @param {string} roomId - Current room
 * @param {boolean} backOnly - Only show back option (for blocked rooms)
 */
function renderNavigationChoices(roomId, backOnly = false) {
    const room = RoomsData[roomId];

    if (backOnly) {
        // Just show a "Go Back" option (plain button, no hex map)
        addChoice('Go Back', () => {
            const previousRoom = room.connections[0];
            enterRoom(previousRoom);
        });
        return;
    }

    // Use hex map for normal navigation
    renderHexMap(roomId);
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    // Character name input
    const nameInput = document.getElementById('character-name');
    nameInput.addEventListener('input', (e) => {
        GameState.characterName = e.target.value.trim() || 'Adventurer';
    });

    // Bonus point buttons
    const bonusBtns = document.querySelectorAll('.bonus-btn');
    bonusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const stat = e.target.dataset.stat;
            console.log('Bonus button clicked for stat:', stat);

            if (applyBonusPoint(stat)) {
                console.log('Bonus point applied successfully');
                renderStats();
                // Disable all bonus buttons
                bonusBtns.forEach(b => b.disabled = true);
                e.target.textContent += ' ✓';

                console.log('Bonus point is now assigned:', GameState.bonusPointAssigned);

                // Enable the Begin Adventure button
                const beginBtn = document.querySelector('.choice-btn');
                if (beginBtn) {
                    beginBtn.disabled = false;
                    beginBtn.classList.remove('disabled');
                    console.log('Begin Adventure button enabled');
                }
            }
        });
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
        if (!gameInitialized) {
            alert('No game in progress to save!');
            return;
        }
        showSaveModal();
    });

    // Load button
    document.getElementById('load-btn').addEventListener('click', () => {
        showLoadModal();
    });

    // New Game button
    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (confirm('Start a new game? Your current progress will be lost (but saves will remain).')) {
            startNewGame();
        }
    });

    // Modal close button
    document.getElementById('modal-close').addEventListener('click', closeModal);

    // Close modal when clicking overlay
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    });
}

/**
 * Restarts the game (called from game over/win screen)
 */
function restartGame() {
    startNewGame();
}

/**
 * Prompt to load game on startup if saves exist
 */
window.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

// Warn player before accidental page refresh or close (Cmd+Shift+R, etc.)
window.addEventListener('beforeunload', (e) => {
    if (gameInitialized && GameState.gameStatus === 'playing' && GameState.roomTransitions > 0) {
        e.preventDefault();
    }
});
