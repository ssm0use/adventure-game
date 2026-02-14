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

    // Start a new game
    startNewGame();

    // Check if there are existing saves and offer to load
    if (anySavesExist()) {
        if (confirm('Saved game found! Would you like to load it?')) {
            showLoadModal();
        }
    }
}

/**
 * Starts a new game
 */
function startNewGame() {
    // Initialize game state with random stats
    initializeNewGame();

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
    showBonusPointUI();

    // Add continue button - disabled until bonus point assigned
    addChoice('Begin Your Adventure', () => {
        console.log('Begin Adventure button clicked!');
        beginAdventure();
    }, false); // Start disabled

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
    console.log('Entering farmhouse...');

    hideBonusPointUI();

    // Start at the farmhouse
    enterRoom('farmhouse');
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

    // Progress any active curses (except on very first room entry)
    if (GameState.roomTransitions > 1) {
        const curseProgressions = progressCurses();

        // Check if any curse caused game over
        if (GameState.gameStatus === 'gameOver') {
            renderCurses();
            renderBodyMap();

            if (curseProgressions.length > 0) {
                displayCurseProgressions(curseProgressions);
                setTimeout(() => {
                    displayBodyMapGameOver();
                }, 3000);
            } else {
                displayBodyMapGameOver();
            }
            return;
        }

        // Display curse progression messages
        if (curseProgressions.length > 0) {
            displayCurseProgressions(curseProgressions);

            clearChoices();
            addChoice('Continue...', () => {
                renderRoom(roomId, isFirstVisit);
            });

            renderCurses();
            renderBodyMap();
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
    renderBodyMap();

    // Check for hidden area discovery (small chance each visit)
    if (room.hiddenArea && !isHiddenAreaDiscovered(room.hiddenArea.name)) {
        const checkResult = performPassiveKeenEyeCheck(room.hiddenArea.luckThreshold);

        if (checkResult.success) {
            discoverHiddenArea(room.hiddenArea.name);
            displayStoryText(room.hiddenArea.name + '_discover');

            clearChoices();
            addChoice('Continue...', () => {
                renderRoomContent(roomId);
            });
            return;
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
    renderBodyMap();

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
                       (room.searches?.length > 0 || false);
    if (!hasContent) return false;

    return isRoomContentDone(roomId);
}

/**
 * Determines if a destination room should be hidden from navigation
 * A room is hidden only if it AND all rooms exclusively reachable through it
 * are fully cleared with no undiscovered hidden areas
 * @param {string} destRoomId - The destination room
 * @param {string} currentRoomId - The room the player is currently in
 * @returns {boolean} True if the destination should be hidden
 */
function shouldHideFromNavigation(destRoomId, currentRoomId) {
    // BFS: find all rooms reachable from currentRoom WITHOUT going through destRoom
    const reachableWithout = new Set();
    const queue = [currentRoomId];
    reachableWithout.add(currentRoomId);

    while (queue.length > 0) {
        const roomId = queue.shift();
        const room = RoomsData[roomId];
        if (!room) continue;

        room.connections.forEach(connId => {
            if (connId !== destRoomId && !reachableWithout.has(connId)) {
                reachableWithout.add(connId);
                queue.push(connId);
            }
        });

        if (room.hiddenArea && isHiddenAreaDiscovered(room.hiddenArea.name)) {
            const hiddenId = room.hiddenArea.name;
            if (hiddenId !== destRoomId && !reachableWithout.has(hiddenId)) {
                reachableWithout.add(hiddenId);
                queue.push(hiddenId);
            }
        }
    }

    // BFS: find all rooms only reachable through destRoom
    const roomsOnlyThroughDest = new Set();
    const destQueue = [destRoomId];
    roomsOnlyThroughDest.add(destRoomId);

    while (destQueue.length > 0) {
        const roomId = destQueue.shift();
        const room = RoomsData[roomId];
        if (!room) continue;

        room.connections.forEach(connId => {
            if (!roomsOnlyThroughDest.has(connId) && !reachableWithout.has(connId)) {
                roomsOnlyThroughDest.add(connId);
                destQueue.push(connId);
            }
        });

        if (room.hiddenArea && isHiddenAreaDiscovered(room.hiddenArea.name)) {
            const hiddenId = room.hiddenArea.name;
            if (!roomsOnlyThroughDest.has(hiddenId) && !reachableWithout.has(hiddenId)) {
                roomsOnlyThroughDest.add(hiddenId);
                destQueue.push(hiddenId);
            }
        }
    }

    // Every room in the subtree must be content-done with no undiscovered hidden areas
    for (const roomId of roomsOnlyThroughDest) {
        if (!isRoomContentDone(roomId)) return false;

        const room = RoomsData[roomId];
        if (room && room.hiddenArea && !isHiddenAreaDiscovered(room.hiddenArea.name)) {
            return false;
        }
    }

    return true;
}

/**
 * Renders all available actions for a room
 * @param {string} roomId - The room ID
 */
function renderRoomActions(roomId) {
    const room = RoomsData[roomId];

    // Always refresh curse displays when re-rendering room actions
    renderCurses();
    renderBodyMap();

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
        }
    });

    // Search actions
    const searches = room.searches?.filter(s =>
        !isEventCompleted(s.id) &&
        checkSearchRequirements(s)
    ) || [];

    if (searches.length > 0) {
        // Use custom search text if provided, otherwise default to "Search the Area"
        const searchText = searches[0].searchText || 'Search the Area';
        addChoice(searchText, () => {
            performSearchAction(roomId, searches);
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
                        renderBodyMap();

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
    renderCurses();
    renderBodyMap();

    setTimeout(() => {
        displayWinScreen();
    }, 3000);
}

/**
 * Performs an encounter action with a stat check
 * @param {Object} event - The event object
 */
function performEncounterAction(event) {
    const result = resolveEncounter(event);

    // Check if a curse was blocked by a protective item
    if (result.curseApplied && result.curseApplied.blocked) {
        const curseType = event.check.failureEffect.curse;
        const protectiveItemId = CursesData[curseType].protectiveItem;
        const protectiveItem = ItemsData[protectiveItemId];
        const curseName = CursesData[curseType].name;

        // Show protection story instead of failure story
        displayProtectionText(curseName, protectiveItem.name);
    } else {
        // Normal path: display the encounter story
        displayStoryText(result.storyKey);
    }

    // Show the dice roll result
    displayEncounterResult(result);

    // Only mark event as completed on success - failed encounters can be retried
    if (result.success) {
        completeEvent(event.id);
    }

    // Re-render UI in case curse was applied
    renderCurses();
    renderBodyMap();

    // Check if encounter caused game over (body map full from curse item pickup or encounter)
    if (GameState.gameStatus === 'gameOver') {
        setTimeout(() => {
            displayBodyMapGameOver();
        }, 3000);
        return;
    }

    // Add continue button
    clearChoices();
    addChoice('Continue...', () => {
        renderRoomActions(GameState.currentRoom);
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

    function renderSearchChoices() {
        clearChoices();

        // Show items found and let player choose which to take
        if (search.items && search.items.length > 0) {
            search.items.forEach(itemId => {
                // Skip items already taken
                if (itemsTakenThisSearch.has(itemId)) return;

                const item = ItemsData[itemId];
                if (!item) return;

                const itemText = `Take ${item.name}`;

                addChoice(itemText, () => {
                    addItemToInventory(itemId);
                    itemsTakenThisSearch.add(itemId);
                    renderInventory();
                    renderCurses();
                    renderBodyMap();

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
 * Renders navigation choices (moving to connected rooms)
 * @param {string} roomId - Current room
 * @param {boolean} backOnly - Only show back option (for blocked rooms)
 */
function renderNavigationChoices(roomId, backOnly = false) {
    const room = RoomsData[roomId];

    if (backOnly) {
        // Just show a "Go Back" option
        addChoice('Go Back', () => {
            // Go back to first connected room (usually where we came from)
            const previousRoom = room.connections[0];
            enterRoom(previousRoom);
        });
        return;
    }

    // Filter connected rooms - hide fully explored subtrees
    const visibleConnections = room.connections.filter(connId => {
        const connRoom = RoomsData[connId];
        return connRoom && !shouldHideFromNavigation(connId, roomId);
    });

    // Check discovered hidden areas
    let visibleHidden = null;
    if (room.hiddenArea && isHiddenAreaDiscovered(room.hiddenArea.name)) {
        const hiddenRoomId = room.hiddenArea.name;
        const hiddenRoom = RoomsData[hiddenRoomId];
        if (hiddenRoom && !shouldHideFromNavigation(hiddenRoomId, roomId)) {
            visibleHidden = { id: hiddenRoomId, room: hiddenRoom };
        }
    }

    // Safety: if nothing is visible, show all connections to prevent getting stuck
    if (visibleConnections.length === 0 && !visibleHidden) {
        room.connections.forEach(connId => {
            if (RoomsData[connId]) visibleConnections.push(connId);
        });
    }

    // Render visible connections
    visibleConnections.forEach(connectedRoomId => {
        addChoice(`Go to ${RoomsData[connectedRoomId].name}`, () => {
            enterRoom(connectedRoomId);
        });
    });

    // Render visible hidden area
    if (visibleHidden) {
        addChoice(`Enter ${visibleHidden.room.name}`, () => {
            enterRoom(visibleHidden.id);
        });
    }
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
