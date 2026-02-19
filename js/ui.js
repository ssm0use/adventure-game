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

        // Generate star display (scales beyond 5 when boosted by equipment)
        const maxStars = Math.max(5, effectiveValue);
        let starsHTML = '';
        for (let i = 1; i <= maxStars; i++) {
            if (i <= effectiveValue && i > 5) {
                starsHTML += '<span class="star-boosted">★</span>';
            } else if (i <= effectiveValue) {
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
    const slotNames = { head: 'Head', neck: 'Neck', gloves: 'Gloves', hands: 'Hands', body: 'Body', feet: 'Feet', pocket: 'Pocket', backpack: 'Backpack' };

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

    // Consumable
    if (item.consumable) {
        html += `<div class="item-effect item-effect-good">Consumable: removes one curse</div>`;
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
        itemName.textContent = item.consumable ? `${item.name} (1 use)` : item.name;
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

        // Add use button for consumable items
        if (item.consumable) {
            const useBtn = document.createElement('button');
            useBtn.className = 'item-btn item-btn-use';
            useBtn.textContent = 'Use';
            useBtn.onclick = () => {
                useConsumableItem(itemId);
            };
            actions.appendChild(useBtn);
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
 * Renders the active curses list with master clock timer
 */
function renderCurses() {
    const cursesSection = document.getElementById('curses-section');
    const cursesList = document.getElementById('curses-list');

    const activeCurseTypes = Object.keys(GameState.activeCurses);

    // If no curses, hide the section
    if (activeCurseTypes.length === 0) {
        cursesSection.style.display = 'none';
        return;
    }

    cursesSection.style.display = 'block';
    cursesList.innerHTML = '';

    const partLabels = { head: 'Head', arms: 'Arms', body: 'Body', legs: 'Legs' };

    for (const curseType of activeCurseTypes) {
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
        curseStage.textContent = stageText;

        li.appendChild(curseName);
        li.appendChild(curseStage);
        cursesList.appendChild(li);
    }

    // Master clock timer (shared across all curses)
    if (GameState.curseClock > 0) {
        const clockLi = document.createElement('li');
        clockLi.style.cssText = 'background: rgba(139, 0, 0, 0.1); border-color: #8b0000; text-align: center; font-size: 0.85em; color: #6b1010;';
        clockLi.innerHTML = `Curse clock: spreads in <strong>${GameState.curseClock}</strong> move${GameState.curseClock !== 1 ? 's' : ''}`;
        cursesList.appendChild(clockLi);
    }
}

/**
 * Temporary context for encounter-specific story substitutions.
 * Set before calling displayStoryText, cleared automatically after.
 */
let StoryContext = {};

/**
 * Substitutes story variables like {playerName} with actual values
 * @param {string} text - The raw story text
 * @returns {string} Text with variables replaced
 */
function substituteStoryVariables(text) {
    const fullName = GameState.characterName || 'Adventurer';
    const firstName = fullName.split(' ')[0];
    let result = text.replace(/\{playerName\}/g, firstName);

    // Apply any encounter-specific context substitutions
    for (const [key, value] of Object.entries(StoryContext)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return result;
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
        <div class="item-protection-announcement"><strong>✦ ${itemName}</strong> protected you from the <strong>${curseName}</strong>!</div>
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
 * Displays the game over screen based on body map being fully cursed.
 * If a single curse type claimed all 4 body parts, shows a curse-specific ending.
 * Otherwise shows the generic mixed-curse ending with body part descriptions.
 */
function displayBodyMapGameOver() {
    // TODO: Replace with dedicated game over music track
    playEndingMusic('music/farmhouse.mp3');
    const storyArea = document.getElementById('story-text');

    // Check if all 4 body parts are claimed by the same curse
    const curseTypes = new Set(Object.values(GameState.bodyMap).filter(c => c !== null));
    const isSingleCurse = curseTypes.size === 1;
    const dominantCurse = isSingleCurse ? [...curseTypes][0] : null;

    let subtitle, curseDescHTML, gameOverHTML;

    if (isSingleCurse && dominantCurse) {
        // Single curse takeover — use curse-specific ending
        const curseData = CursesData[dominantCurse];
        subtitle = curseData ? `The ${curseData.name} is complete.` : 'The curse has consumed your body entirely.';

        curseDescHTML = ''; // No body-part breakdown needed — the story covers it

        const specificKey = `game_over_${dominantCurse}`;
        const specificText = substituteStoryVariables(getStoryText(specificKey));
        const paragraphs = specificText.split('\n\n').filter(p => p.trim().length > 0);
        gameOverHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
    } else {
        // Mixed curses — show body part descriptions + generic ending
        subtitle = 'The curses have consumed your body entirely.';

        curseDescHTML = '<div class="curse-ending">';
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

        const gameOverText = substituteStoryVariables(getStoryText('game_over'));
        const paragraphs = gameOverText.split('\n\n').filter(p => p.trim().length > 0);
        gameOverHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
    }

    storyArea.innerHTML = `
        <div class="game-end-screen lose">
            <h2>GAME OVER</h2>
            <p class="game-over-subtitle">${subtitle}</p>
            ${curseDescHTML}
            ${gameOverHTML}
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
    indicator.innerHTML = `<p>You've uncovered all the secrets of the <strong>${roomName}</strong>. There's nothing left to find here — but the farm itself is still under the sway of the original curse. The answer lies somewhere else.</p>`;

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
    document.getElementById('hex-map').innerHTML = '';
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
            syncDifficultyUI();
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

// ==========================================
// CONSUMABLE ITEMS
// ==========================================

/**
 * Uses a consumable item from inventory.
 * Each consumable type has its own behavior.
 * @param {string} itemId - The item to use
 */
function useConsumableItem(itemId) {
    const item = ItemsData[itemId];
    if (!item || !item.consumable) return;

    if (itemId === 'potionOfCleansing') {
        usePotionOfCleansing(itemId);
    } else {
        console.warn(`No use handler for consumable: ${itemId}`);
    }
}

/**
 * Uses the Potion of Cleansing to remove one active curse.
 * @param {string} itemId - The potion item ID
 */
function usePotionOfCleansing(itemId) {
    const activeCurseTypes = Object.keys(GameState.activeCurses);

    if (activeCurseTypes.length === 0) {
        // No curses — potion fizzles but is NOT consumed
        const storyArea = document.getElementById('story-text');
        const notice = document.createElement('div');
        notice.className = 'item-protection-announcement';
        notice.innerHTML = `<strong>✦ Potion of Cleansing</strong> — You uncork the potion, but its magic finds nothing to cleanse. The silver liquid fizzles harmlessly and settles back into the vial. Best to save it for when you need it.`;
        storyArea.appendChild(notice);
        return;
    }

    if (activeCurseTypes.length === 1) {
        // Only one curse — remove it automatically
        const curseType = activeCurseTypes[0];
        const curseData = CursesData[curseType];
        removeCurse(curseType);
        removeItemFromInventory(itemId);
        renderInventory();
        renderCurses();
        renderCurseStatus();

        const storyArea = document.getElementById('story-text');
        const notice = document.createElement('div');
        notice.className = 'item-protection-announcement';
        notice.innerHTML = `<strong>✦ Potion of Cleansing</strong> — You drink the silver liquid in one gulp. It burns like cold fire, racing through your veins. The <strong>${curseData.name}</strong> writhes and shrieks as the potion's magic tears it from your body. The vial crumbles to dust in your hand. You are free.`;
        storyArea.appendChild(notice);
        return;
    }

    // Multiple curses — prompt the player to choose
    showCurseChoiceModal(itemId, activeCurseTypes);
}

/**
 * Shows a modal for choosing which curse to cleanse
 * @param {string} itemId - The potion item ID
 * @param {Array<string>} curseTypes - Active curse type IDs
 */
function showCurseChoiceModal(itemId, curseTypes) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Choose a Curse to Cleanse';

    let html = '<p style="margin-bottom: 15px;">The potion can purge one curse. Which affliction will you cleanse?</p>';

    curseTypes.forEach(curseType => {
        const curseData = CursesData[curseType];
        if (!curseData) return;
        const stage = getCurseStage(curseType);
        html += `<div class="save-slot" onclick="confirmCleanseCurse('${itemId}', '${curseType}')">`;
        html += `<div class="save-slot-name" style="color: #cc0000;">${curseData.name}</div>`;
        html += `<div class="save-slot-details">Stage ${stage}/4</div>`;
        html += `</div>`;
    });

    body.innerHTML = html;
    modal.style.display = 'flex';
}

/**
 * Confirms and executes curse cleansing from the modal
 * @param {string} itemId - The potion item ID
 * @param {string} curseType - The curse type to remove
 */
function confirmCleanseCurse(itemId, curseType) {
    closeModal();

    const curseData = CursesData[curseType];
    removeCurse(curseType);
    removeItemFromInventory(itemId);
    renderInventory();
    renderCurses();
    renderCurseStatus();

    const storyArea = document.getElementById('story-text');
    const notice = document.createElement('div');
    notice.className = 'item-protection-announcement';
    notice.innerHTML = `<strong>✦ Potion of Cleansing</strong> — You drink the silver liquid in one gulp. It burns like cold fire, racing through your veins. The <strong>${curseData.name}</strong> writhes and shrieks as the potion's magic tears it from your body. The vial crumbles to dust in your hand. You are free.`;
    storyArea.appendChild(notice);
}

// ==========================================
// GAME SETTINGS
// ==========================================

const FONT_SIZE_STEPS = [
    { label: 'Small',   value: '0.95em' },
    { label: 'Default', value: '1.1em'  },
    { label: 'Large',   value: '1.25em' },
    { label: 'XL',      value: '1.4em'  }
];

let currentFontSizeIndex = 1; // Default

/**
 * Initializes the Game Settings panel interactions
 */
function initGameSettings() {
    // Collapsible header toggle
    const header = document.getElementById('game-settings-header');
    const body = document.getElementById('game-settings-body');
    const chevron = document.getElementById('game-settings-chevron');

    if (header) {
        header.addEventListener('click', () => {
            body.classList.toggle('collapsed');
            chevron.classList.toggle('open');
        });
    }

    // Font size controls
    const decreaseBtn = document.getElementById('font-size-decrease');
    const increaseBtn = document.getElementById('font-size-increase');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            if (currentFontSizeIndex > 0) {
                currentFontSizeIndex--;
                applyFontSize();
            }
        });
    }

    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            if (currentFontSizeIndex < FONT_SIZE_STEPS.length - 1) {
                currentFontSizeIndex++;
                applyFontSize();
            }
        });
    }

    // Difficulty selector
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            GameState.difficulty = e.target.value;
            renderDifficultyLabel();
            console.log('Difficulty set to:', GameState.difficulty);
        });
    });

    applyFontSize();
}

/**
 * Applies the current font size step to story text
 */
function applyFontSize() {
    const storyText = document.getElementById('story-text');
    const label = document.getElementById('font-size-label');
    const decreaseBtn = document.getElementById('font-size-decrease');
    const increaseBtn = document.getElementById('font-size-increase');

    const step = FONT_SIZE_STEPS[currentFontSizeIndex];

    if (storyText) {
        storyText.style.fontSize = step.value;
    }
    if (label) {
        label.textContent = step.label;
    }
    if (decreaseBtn) {
        decreaseBtn.disabled = currentFontSizeIndex <= 0;
    }
    if (increaseBtn) {
        increaseBtn.disabled = currentFontSizeIndex >= FONT_SIZE_STEPS.length - 1;
    }
}

/**
 * Syncs the difficulty radio buttons to match GameState.difficulty
 */
function syncDifficultyUI() {
    const radio = document.querySelector(`input[name="difficulty"][value="${GameState.difficulty}"]`);
    if (radio) {
        radio.checked = true;
    }
    renderDifficultyLabel();
}

/**
 * Renders a subtle difficulty label below the character section
 */
function renderDifficultyLabel() {
    let label = document.getElementById('difficulty-label');
    if (!label) {
        label = document.createElement('div');
        label.id = 'difficulty-label';
        const charSection = document.getElementById('character-section');
        charSection.appendChild(label);
    }
    const names = { story: 'Story Mode', default: 'Default', hard: 'Hard' };
    label.textContent = names[GameState.difficulty] || 'Default';
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
    // TODO: Replace with dedicated victory music track
    playEndingMusic('music/farmhouse.mp3');
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

