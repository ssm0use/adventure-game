/**
 * UI MODULE
 *
 * This module handles all user interface updates and interactions.
 * It updates the DOM to reflect the current game state and renders
 * story text, choices, stats, inventory, etc.
 */

/**
 * Renders the current location display above the story text in the main area
 */
function renderLocation() {
    const locationHeader = document.getElementById('location-header');
    const locationDisplay = document.getElementById('current-location');

    if (!GameState.currentRoom || GameState.gameStatus !== 'playing') {
        locationHeader.style.display = 'none';
        return;
    }

    locationHeader.style.display = 'block';
    const roomName = getRoomDisplayName(GameState.currentRoom);
    locationDisplay.textContent = roomName;
}

/**
 * Renders the character stats display with stars
 */
function renderStats() {
    const statElements = {
        grit: document.getElementById('stat-grit'),
        keenEye: document.getElementById('stat-keenEye'),
        charm: document.getElementById('stat-charm')
    };

    for (const statName in statElements) {
        const effectiveValue = getEffectiveStat(statName);
        const element = statElements[statName];

        // Generate star display (5 stars total, filled based on stat value)
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= effectiveValue) {
                starsHTML += '<span class="star-filled">★</span>';
            } else {
                starsHTML += '<span class="star-empty">☆</span>';
            }
        }

        element.innerHTML = starsHTML;
    }
}

/**
 * Generates HTML for an item's effect descriptions (colored flavor text)
 * @param {Object} item - The item data object
 * @returns {string} HTML string with effect descriptions
 */
function getItemEffectHTML(item) {
    let html = '';
    const statNames = { grit: 'Grit', keenEye: 'Keen Eye', charm: 'Charm' };
    const slotNames = { head: 'Head', neck: 'Neck', hands: 'Hands', body: 'Body', pocket: 'Pocket' };

    // Stat boost (green)
    if (item.statBoost) {
        html += `<div class="item-effect item-effect-good">+${item.statBoost.amount} ${statNames[item.statBoost.stat] || item.statBoost.stat}</div>`;
    }

    // Protection (green)
    if (item.protectsFrom && CursesData[item.protectsFrom]) {
        html += `<div class="item-effect item-effect-good">Wards: ${CursesData[item.protectsFrom].name}</div>`;
    }

    // Stat penalty (red)
    if (item.statPenalty) {
        html += `<div class="item-effect item-effect-bad">-${item.statPenalty.amount} ${statNames[item.statPenalty.stat] || item.statPenalty.stat}</div>`;
    }

    // Curse trigger (red)
    if (item.curseEffect && CursesData[item.curseEffect.curse]) {
        html += `<div class="item-effect item-effect-bad">Cursed! Triggers: ${CursesData[item.curseEffect.curse].name}</div>`;
    }

    // Equip slot
    if (item.equipSlot) {
        html += `<div class="item-effect item-effect-slot">Slot: ${slotNames[item.equipSlot] || item.equipSlot}</div>`;
    }

    return html;
}

/**
 * Renders the inventory list
 */
function renderInventory() {
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';

    if (GameState.inventory.length === 0) {
        inventoryList.innerHTML = '<li class="empty-state">Empty</li>';
        return;
    }

    GameState.inventory.forEach(itemId => {
        const item = ItemsData[itemId];
        if (!item) return;

        const li = document.createElement('li');
        li.className = 'item-entry';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';

        const itemName = document.createElement('div');
        itemName.className = 'item-name';
        itemName.textContent = item.name;
        itemName.title = item.description;
        infoDiv.appendChild(itemName);

        // Add colored effect text
        const effectHTML = getItemEffectHTML(item);
        if (effectHTML) {
            const effectsDiv = document.createElement('div');
            effectsDiv.innerHTML = effectHTML;
            infoDiv.appendChild(effectsDiv);
        }

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        // Add equip button if item can be equipped
        if (item.canEquip) {
            const equipBtn = document.createElement('button');
            equipBtn.className = 'item-btn';
            equipBtn.textContent = 'Equip';
            equipBtn.onclick = () => {
                equipItem(itemId);
                renderInventory();
                renderEquipped();
                renderStats();
                renderCurses();
                renderCurseStatus();
            };
            actions.appendChild(equipBtn);
        }

        li.appendChild(infoDiv);
        li.appendChild(actions);
        inventoryList.appendChild(li);
    });
}

/**
 * Renders the equipped items list
 */
function renderEquipped() {
    const equippedList = document.getElementById('equipped-list');
    equippedList.innerHTML = '';

    if (GameState.equipped.length === 0) {
        equippedList.innerHTML = '<li class="empty-state">Nothing equipped</li>';
        return;
    }

    GameState.equipped.forEach(itemId => {
        const item = ItemsData[itemId];
        if (!item) return;

        const li = document.createElement('li');
        li.className = 'item-entry';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';

        const itemName = document.createElement('div');
        itemName.className = 'item-name';
        itemName.textContent = item.name;
        itemName.title = item.description;
        infoDiv.appendChild(itemName);

        // Add colored effect text
        const effectHTML = getItemEffectHTML(item);
        if (effectHTML) {
            const effectsDiv = document.createElement('div');
            effectsDiv.innerHTML = effectHTML;
            infoDiv.appendChild(effectsDiv);
        }

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const unequipBtn = document.createElement('button');
        unequipBtn.className = 'item-btn';
        unequipBtn.textContent = 'Unequip';
        unequipBtn.onclick = () => {
            unequipItem(itemId);
            renderInventory();
            renderEquipped();
            renderStats();
            renderCurses();
            renderCurseStatus();
        };
        actions.appendChild(unequipBtn);

        li.appendChild(infoDiv);
        li.appendChild(actions);
        equippedList.appendChild(li);
    });
}

/**
 * Renders the active curses list
 */
function renderCurses() {
    const cursesSection = document.getElementById('curses-section');
    const cursesList = document.getElementById('curses-list');

    // If no curses, hide the section
    if (Object.keys(GameState.activeCurses).length === 0) {
        cursesSection.style.display = 'none';
        return;
    }

    cursesSection.style.display = 'block';
    cursesList.innerHTML = '';

    const partLabels = { head: 'Head', arms: 'Arms', body: 'Body', legs: 'Legs' };

    for (const curseType in GameState.activeCurses) {
        const curseState = GameState.activeCurses[curseType];
        const curseData = CursesData[curseType];
        if (!curseData) continue;

        const stage = getCurseStage(curseType);
        const li = document.createElement('li');
        li.className = 'curse-entry';

        const curseName = document.createElement('div');
        curseName.className = 'curse-name';
        curseName.textContent = curseData.name;

        const curseStage = document.createElement('div');
        curseStage.className = 'curse-stage';

        // Build list of affected body parts
        const affectedParts = [];
        for (const part in GameState.bodyMap) {
            if (GameState.bodyMap[part] === curseType) {
                affectedParts.push(partLabels[part]);
            }
        }
        let stageText = `Stage ${stage}/4`;
        if (affectedParts.length > 0) {
            stageText += ` — ${affectedParts.join(', ')}`;
        }
        if (curseState.stopped) {
            stageText += ' (Halted)';
        } else {
            stageText += ` (advances in ${curseState.roomsUntilNextAdvance} move${curseState.roomsUntilNextAdvance !== 1 ? 's' : ''})`;
        }
        curseStage.textContent = stageText;

        li.appendChild(curseName);
        li.appendChild(curseStage);
        cursesList.appendChild(li);
    }
}

/**
 * Substitutes story variables like {playerName} with actual values
 * @param {string} text - The raw story text
 * @returns {string} Text with variables replaced
 */
function substituteStoryVariables(text) {
    const fullName = GameState.characterName || 'Adventurer';
    const firstName = fullName.split(' ')[0];
    return text.replace(/\{playerName\}/g, firstName);
}

/**
 * Displays story text in the main area
 * @param {string} storyKey - The story block key from story.txt
 */
function displayStoryText(storyKey) {
    const storyArea = document.getElementById('story-text');
    const text = substituteStoryVariables(getStoryText(storyKey));

    // Split into paragraphs and wrap in <p> tags
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');

    storyArea.innerHTML = html;

    // Scroll to top of story area
    storyArea.scrollTop = 0;
}

/**
 * Displays text describing a protective item blocking a curse
 * @param {string} curseName - The display name of the curse (e.g., "Bovine Transformation")
 * @param {string} itemName - The display name of the protective item (e.g., "Brass Bell Collar")
 */
function displayProtectionText(curseName, itemName) {
    const storyArea = document.getElementById('story-text');

    const html = `
        <p>The dark magic of the <strong>${curseName}</strong> tries to take hold,
        but your <strong>${itemName}</strong> flares with protective light!</p>
        <p>A wave of warmth washes over you, driving back the curse's icy grip.
        The cursed energy recoils, unable to penetrate the ward. You stagger but
        remain yourself, shielded from the transformation.</p>
        <p><em>Your ${itemName} protected you from the ${curseName}!</em></p>
    `;

    storyArea.innerHTML = html;
    storyArea.scrollTop = 0;
}

/**
 * Renders the inline curse status paragraph at the top of the story area.
 * Combines vivid body-part descriptions into a flowing second-person paragraph.
 */
function renderCurseStatus() {
    const statusDiv = document.getElementById('curse-status');
    const occupiedCount = getBodyMapOccupiedCount();

    if (occupiedCount === 0) {
        statusDiv.style.display = 'none';
        return;
    }

    statusDiv.style.display = 'block';

    // Collect descriptions for each cursed body part
    const descriptions = [];
    for (const part in GameState.bodyMap) {
        const curseType = GameState.bodyMap[part];
        if (curseType) {
            const curseData = CursesData[curseType];
            if (curseData && curseData.bodyPartDescriptions[part]) {
                descriptions.push(curseData.bodyPartDescriptions[part]);
            }
        }
    }

    // Severity label and styling
    let severityLabel, severityClass;
    if (occupiedCount === 1) {
        severityLabel = 'Something is wrong...';
        severityClass = 'curse-severity-low';
    } else if (occupiedCount === 2) {
        severityLabel = 'The curses are spreading...';
        severityClass = 'curse-severity-medium';
    } else {
        severityLabel = 'Your body is failing you...';
        severityClass = 'curse-severity-high';
    }

    statusDiv.className = `curse-status-box ${severityClass}`;
    statusDiv.innerHTML = `<strong>${severityLabel}</strong> ${descriptions.join(' ')}`;
}

/**
 * Displays the game over screen based on body map being fully cursed
 */
function displayBodyMapGameOver() {
    const storyArea = document.getElementById('story-text');

    // Build description of the player's final cursed state
    let curseDescHTML = '<div class="curse-ending">';
    curseDescHTML += '<h3>Your Transformation</h3>';

    const partLabels = { head: 'Head', arms: 'Arms', body: 'Body', legs: 'Legs' };
    for (const part in GameState.bodyMap) {
        const curseType = GameState.bodyMap[part];
        if (curseType) {
            const curseData = CursesData[curseType];
            if (curseData) {
                curseDescHTML += `<p><strong>${partLabels[part]}:</strong> ${curseData.bodyPartDescriptions[part]}</p>`;
            }
        }
    }
    curseDescHTML += '</div>';

    // Generic game over text
    const gameOverText = substituteStoryVariables(getStoryText('game_over'));
    const paragraphs = gameOverText.split('\n\n').filter(p => p.trim().length > 0);
    const formattedGameOver = paragraphs.map(p => `<p>${p}</p>`).join('');

    storyArea.innerHTML = `
        <div class="game-end-screen lose">
            <h2>GAME OVER</h2>
            <p class="game-over-subtitle">The curses have consumed your body entirely.</p>
            ${curseDescHTML}
            ${formattedGameOver}
            <button class="restart-btn" onclick="restartGame()">Try Again</button>
        </div>
    `;
    clearChoices();
    hideEncounterResult();
}

/**
 * Displays multiple story texts in sequence
 * @param {Array<string>} storyKeys - Array of story keys
 */
function displayMultipleStoryTexts(storyKeys) {
    const storyArea = document.getElementById('story-text');
    let html = '';

    storyKeys.forEach(key => {
        const text = substituteStoryVariables(getStoryText(key));
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        html += paragraphs.map(p => `<p>${p}</p>`).join('');
        html += '<hr style="margin: 20px 0; border: 1px solid #a89060;">';
    });

    storyArea.innerHTML = html;
    storyArea.scrollTop = 0;
}

/**
 * Displays a "thoroughly explored" indicator appended to the story area
 * @param {string} roomName - The display name of the room
 */
function displayAreaExploredIndicator(roomName) {
    const storyArea = document.getElementById('story-text');

    const indicator = document.createElement('div');
    indicator.className = 'area-explored-indicator';
    indicator.innerHTML = `<p>You have thoroughly explored the <strong>${roomName}</strong>. Nothing more to find here.</p>`;

    storyArea.appendChild(indicator);
}

/**
 * Renders the list of all completely explored areas at the bottom of the main window
 */
function renderExploredAreas() {
    const section = document.getElementById('explored-areas-section');
    const list = document.getElementById('explored-areas-list');

    // Build list of rooms that have been fully explored
    const exploredRooms = [];
    for (const roomId in RoomsData) {
        if (isRoomFullyCleared(roomId)) {
            exploredRooms.push(RoomsData[roomId].name);
        }
    }

    if (exploredRooms.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';
    exploredRooms.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        list.appendChild(li);
    });
}

/**
 * Clears the choices area
 */
function clearChoices() {
    const choicesArea = document.getElementById('choices-area');
    choicesArea.innerHTML = '';
}

/**
 * Adds a choice button
 * @param {string} text - Button text
 * @param {Function} callback - Function to call when clicked
 * @param {boolean} enabled - Whether button is enabled (default true)
 */
function addChoice(text, callback, enabled = true) {
    const choicesArea = document.getElementById('choices-area');

    const button = document.createElement('button');
    button.className = 'choice-btn';
    button.textContent = text;
    button.disabled = !enabled;
    button.onclick = callback;

    choicesArea.appendChild(button);
}

/**
 * Displays the encounter preview before rolling
 * @param {string} html - The formatted preview HTML
 */
function displayEncounterPreview(html) {
    const encounterResults = document.getElementById('encounter-results');
    encounterResults.style.display = 'block';
    encounterResults.innerHTML = html;
}

/**
 * Displays an encounter result with dice roll info
 * @param {Object} result - The encounter result object
 */
function displayEncounterResult(result) {
    const encounterResults = document.getElementById('encounter-results');
    encounterResults.style.display = 'block';
    encounterResults.innerHTML = formatCheckResult(result.checkResult);
}

/**
 * Hides the encounter results display
 */
function hideEncounterResult() {
    const encounterResults = document.getElementById('encounter-results');
    encounterResults.style.display = 'none';
}

/**
 * Shows the save game modal
 */
function showSaveModal() {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Save Game';

    const slots = getAllSaveSlots();
    let html = '';

    slots.forEach(slot => {
        const info = slot.info;

        html += `<div class="save-slot" onclick="handleSaveToSlot(${slot.slotNumber})">`;
        html += `<div class="save-slot-name">Slot ${slot.slotNumber}</div>`;

        if (info) {
            html += `<div class="save-slot-details">`;
            html += `${info.characterName} - ${getRoomDisplayName(info.currentRoom)}<br>`;
            html += `Saved: ${formatTimestamp(info.timestamp)}`;
            html += `</div>`;
        } else {
            html += `<div class="save-slot-details save-slot-empty">Empty Slot</div>`;
        }

        html += `</div>`;
    });

    body.innerHTML = html;
    modal.style.display = 'flex';
}

/**
 * Shows the load game modal
 */
function showLoadModal() {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Load Game';

    const slots = getAllSaveSlots();
    let html = '';

    slots.forEach(slot => {
        const info = slot.info;

        if (info) {
            html += `<div class="save-slot-wrapper">`;
            html += `<div class="save-slot" onclick="handleLoadFromSlot(${slot.slotNumber})">`;
            html += `<div class="save-slot-name">Slot ${slot.slotNumber}</div>`;
            html += `<div class="save-slot-details">`;
            html += `${info.characterName} - ${getRoomDisplayName(info.currentRoom)}<br>`;
            html += `Saved: ${formatTimestamp(info.timestamp)}`;
            html += `</div>`;
            html += `</div>`;
            html += `<button class="delete-save-btn" onclick="handleDeleteSave(${slot.slotNumber}); event.stopPropagation();">Delete</button>`;
            html += `</div>`;
        } else {
            html += `<div class="save-slot save-slot-empty" style="cursor: default;">`;
            html += `<div class="save-slot-name">Slot ${slot.slotNumber}</div>`;
            html += `<div class="save-slot-details">Empty Slot</div>`;
            html += `</div>`;
        }
    });

    if (!anySavesExist()) {
        html = '<p style="text-align: center; color: #888;">No saved games found.</p>';
    } else {
        html += `<button class="action-btn" style="margin-top: 20px; background: #8b0000;" onclick="handleClearAllSaves()">Clear All Saves</button>`;
    }

    body.innerHTML = html;
    modal.style.display = 'flex';
}

/**
 * Closes the modal
 */
function closeModal() {
    const modal = document.getElementById('modal-overlay');
    modal.style.display = 'none';
}

/**
 * Handles saving to a specific slot (called from modal)
 * @param {number} slotNumber
 */
function handleSaveToSlot(slotNumber) {
    if (saveGame(slotNumber)) {
        alert(`Game saved to Slot ${slotNumber}!`);
        closeModal();
    }
}

/**
 * Handles loading from a specific slot (called from modal)
 * @param {number} slotNumber
 */
function handleLoadFromSlot(slotNumber) {
    if (confirm('Loading will overwrite your current progress. Continue?')) {
        if (loadGame(slotNumber)) {
            closeModal();
            // Re-render everything
            renderAllUI();
            // Navigate to current room
            enterRoom(GameState.currentRoom);
        }
    }
}

/**
 * Handles deleting a specific save slot (called from modal)
 * @param {number} slotNumber
 */
function handleDeleteSave(slotNumber) {
    if (confirm(`Delete save in Slot ${slotNumber}?`)) {
        if (deleteSave(slotNumber)) {
            // Refresh the modal to show updated saves
            showLoadModal();
        }
    }
}

/**
 * Handles clearing all saved games (called from modal)
 */
function handleClearAllSaves() {
    if (confirm('Delete ALL saved games? This cannot be undone!')) {
        if (clearAllSaves()) {
            alert('All saves cleared!');
            closeModal();
        }
    }
}

/**
 * Renders all UI elements
 */
function renderAllUI() {
    renderStats();
    renderInventory();
    renderEquipped();
    renderCurses();
    renderCurseStatus();
    renderExploredAreas();
    renderLocation();

    // Update character name display if it exists
    const nameInput = document.getElementById('character-name');
    if (nameInput) {
        nameInput.value = GameState.characterName;
    }
    const nameDisplay = document.getElementById('character-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = GameState.characterName;
    }
}

/**
 * Shows the bonus point selection UI
 */
function showBonusPointUI() {
    const bonusSection = document.getElementById('bonus-point-section');
    bonusSection.style.display = 'block';
}

/**
 * Hides the bonus point selection UI
 */
function hideBonusPointUI() {
    const bonusSection = document.getElementById('bonus-point-section');
    bonusSection.style.display = 'none';
}

/**
 * Displays the win screen with enhanced formatting
 */
function displayWinScreen() {
    const storyArea = document.getElementById('story-text');

    // Format the win text with proper paragraph tags
    const winText = substituteStoryVariables(getStoryText('game_win'));
    const paragraphs = winText.split('\n\n').filter(p => p.trim().length > 0);
    const formattedText = paragraphs.map(p => `<p>${p}</p>`).join('');

    // Build a summary of curses that were lifted, if any body parts were affected
    let curseLiftedHTML = '';
    const affectedParts = [];
    for (const part in GameState.bodyMap) {
        if (GameState.bodyMap[part] !== null) {
            affectedParts.push(part);
        }
    }
    if (affectedParts.length > 0) {
        curseLiftedHTML = '<p><em>As the curse shatters, every twisted transformation reverses. Your body returns to its true form — fully human once more.</em></p>';
    }

    storyArea.innerHTML = `
        <div class="game-end-screen win">
            <div class="win-banner">
                <h2>VICTORY!</h2>
                <p class="win-subtitle">The Curse is Broken</p>
            </div>
            <div class="win-story">
                ${curseLiftedHTML}
                ${formattedText}
            </div>
            <button class="restart-btn" onclick="restartGame()">Start New Game</button>
        </div>
    `;
    clearChoices();
    hideEncounterResult();
}

