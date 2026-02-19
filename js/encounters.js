/**
 * ENCOUNTERS MODULE
 *
 * This module handles all stat checks, dice rolling, and encounter resolution.
 * It uses a d20 system where:
 * - Roll: 1d20 + (Stat Value - 2)
 * - Success: Roll >= Difficulty Threshold
 */

/**
 * Rolls a die with the specified number of sides
 * @param {number} sides - Number of sides on the die (default 20)
 * @returns {number} The roll result
 */
function rollDie(sides = 20) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Formats a stat value as star HTML, with boosted stars (above 5) in green
 * @param {number} statValue - The effective stat value
 * @returns {string} HTML string of stars
 */
function formatStarDisplay(statValue) {
    let stars = '';
    for (let i = 1; i <= statValue; i++) {
        if (i > 5) {
            stars += '<span class="star-boosted">★</span>';
        } else {
            stars += '★';
        }
    }
    return stars;
}

/**
 * Performs a stat check
 * @param {string} statName - The stat to check ('grit', 'keenEye', 'charm')
 * @param {number} difficulty - The difficulty threshold (10 = easy, 15 = medium, 20 = hard)
 * @returns {Object} Result object with roll details
 */
function performStatCheck(statName, difficulty) {
    // Get the effective stat value (includes equipment bonuses)
    const statValue = getEffectiveStat(statName);

    // Calculate modifier: (Stat Value - 2)
    // A 2-star stat has +0, 3-star has +1, 4-star has +2, 5-star has +3
    const modifier = statValue - 2;

    // Roll the die
    const dieRoll = rollDie(20);

    // Calculate total
    const total = dieRoll + modifier;

    // Determine success
    const success = total >= difficulty;

    // Build result object
    const result = {
        statName: statName,
        statValue: statValue,
        dieRoll: dieRoll,
        modifier: modifier,
        total: total,
        difficulty: difficulty,
        success: success
    };

    console.log(`Stat check: ${statName} (${statValue}) - Rolled ${dieRoll} + ${modifier} = ${total} vs DC ${difficulty} - ${success ? 'SUCCESS' : 'FAILURE'}`);

    return result;
}

/**
 * Performs a passive Keen Eye check for hidden areas
 * This is used when entering a room to automatically check for hidden areas
 * @param {number} threshold - The difficulty threshold for the check
 * @returns {Object} Result object
 */
function performPassiveKeenEyeCheck(threshold) {
    const keenEyeValue = getEffectiveStat('keenEye');

    // Passive check: if Keen Eye is high enough, automatic success
    // Otherwise, roll with advantage (roll twice, take higher)
    if (keenEyeValue >= threshold) {
        return {
            success: true,
            automatic: true,
            keenEyeValue: keenEyeValue,
            threshold: threshold
        };
    }

    // Roll with advantage (two rolls, take the higher one)
    const modifier = keenEyeValue - 2;
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    const bestRoll = Math.max(roll1, roll2);
    const total = bestRoll + modifier;
    const success = total >= threshold;

    console.log(`Passive Keen Eye check: Rolled ${roll1} and ${roll2}, using ${bestRoll} + ${modifier} = ${total} vs ${threshold} - ${success ? 'SUCCESS' : 'FAILURE'}`);

    return {
        success: success,
        automatic: false,
        keenEyeValue: keenEyeValue,
        roll1: roll1,
        roll2: roll2,
        bestRoll: bestRoll,
        modifier: modifier,
        total: total,
        threshold: threshold
    };
}

/**
 * Formats a stat check result for display to the player
 * @param {Object} result - The result from performStatCheck()
 * @returns {string} HTML formatted string
 */
function formatCheckResult(result) {
    const statDisplayNames = {
        grit: 'Grit',
        keenEye: 'Keen Eye',
        charm: 'Charm'
    };

    const statDisplay = statDisplayNames[result.statName] || result.statName;
    const stars = formatStarDisplay(result.statValue);

    const difficultyName = getDifficultyName(result.difficulty);

    let html = `<h3>🎲 ${statDisplay.toUpperCase()} CHECK</h3>`;
    html += `<div class="roll-display ${result.success ? 'roll-success' : 'roll-failure'}">`;
    html += `<p><strong>You rolled:</strong> ${result.dieRoll} + ${result.modifier} (${statDisplay} ${stars}) = <strong>${result.total}</strong></p>`;
    html += `<p><strong>Required:</strong> ${result.difficulty} (${difficultyName})</p>`;
    html += `<p><strong>Result:</strong> ${result.success ? '✓ SUCCESS' : '✗ FAILURE'}</p>`;
    html += `</div>`;

    return html;
}

/**
 * Checks if an event's requirements are met
 * @param {Object} event - The event object from rooms.json
 * @returns {boolean} True if requirements are met
 */
function checkEventRequirements(event) {
    if (!event.requirements) {
        return true; // No requirements means always available
    }

    const req = event.requirements;

    // Check visit count requirement
    if (req.visitCount !== undefined) {
        const currentVisits = getCurrentRoomVisitCount();
        if (currentVisits < req.visitCount) {
            return false;
        }
    }

    // Check if player must have a specific item
    if (req.hasItem && !hasItem(req.hasItem)) {
        return false;
    }

    // Check if player must have ALL items in a list
    if (req.hasItems && !req.hasItems.every(id => hasItem(id))) {
        return false;
    }

    // Check if player must NOT have a specific item
    if (req.missingItem && hasItem(req.missingItem)) {
        return false;
    }

    // Check if player must have a specific flag
    if (req.hasFlag && !hasFlag(req.hasFlag)) {
        return false;
    }

    // Check if player must NOT have a specific flag
    if (req.missingFlag && hasFlag(req.missingFlag)) {
        return false;
    }

    // Check if a specific event must have been completed
    if (req.completedEvent && !isEventCompleted(req.completedEvent)) {
        return false;
    }

    // All requirements met
    return true;
}

/**
 * Checks if a search action's requirements are met
 * @param {Object} search - The search object from rooms.json
 * @returns {boolean} True if requirements are met
 */
function checkSearchRequirements(search) {
    if (!search.requirements) {
        return true;
    }

    const req = search.requirements;

    // Check if player must have a specific item
    if (req.hasItem && !hasItem(req.hasItem)) {
        return false;
    }

    // Check if player must have a specific flag
    if (req.hasFlag && !hasFlag(req.hasFlag)) {
        return false;
    }

    // Check if a specific event must have been completed
    if (req.completedEvent && !isEventCompleted(req.completedEvent)) {
        return false;
    }

    return true;
}

/**
 * Resolves an encounter with a stat check
 * @param {Object} event - The event object containing the check
 * @returns {Object} Complete result including story outcomes
 */
function resolveEncounter(event) {
    const check = event.check;

    // Perform the stat check
    const checkResult = performStatCheck(check.stat, check.difficulty);

    // Prepare the result object
    const result = {
        checkResult: checkResult,
        storyKey: checkResult.success ? check.successStory : check.failureStory,
        success: checkResult.success
    };

    // Apply success effects if any
    if (checkResult.success && check.successEffect) {
        if (check.successEffect.flag) {
            setFlag(check.successEffect.flag);
            result.flagSet = check.successEffect.flag;
        }
        if (check.successEffect.items) {
            result.rewardItems = check.successEffect.items;
        }
    }

    // Apply failure effects if any
    if (!checkResult.success && check.failureEffect) {
        if (check.failureEffect.curse) {
            const curseResult = applyCurse(check.failureEffect.curse);
            result.curseApplied = curseResult;
        }
    }

    return result;
}

/**
 * Formats an encounter preview showing the player what they're up against
 * before they commit to rolling the dice.
 * @param {Object} event - The event object containing the check
 * @returns {string} HTML formatted preview string
 */
function formatEncounterPreview(event) {
    const check = event.check;
    const statDisplayNames = {
        grit: 'Grit',
        keenEye: 'Keen Eye',
        charm: 'Charm'
    };

    const statDisplay = statDisplayNames[check.stat] || check.stat;
    const statValue = getEffectiveStat(check.stat);
    const modifier = statValue - 2;
    const stars = formatStarDisplay(statValue);
    const difficultyName = getDifficultyName(check.difficulty);
    const minRollNeeded = check.difficulty - modifier;

    // Calculate success chance (d20 range is 1-20)
    let successChance;
    if (minRollNeeded <= 1) {
        successChance = 95; // Only a natural 1 fails (we treat nat 1 as always fail for flavor)
    } else if (minRollNeeded > 20) {
        successChance = 0; // Impossible even with nat 20
    } else {
        successChance = Math.round((21 - minRollNeeded) / 20 * 100);
    }

    const modifierSign = modifier >= 0 ? '+' : '';

    let html = `<h3>\uD83C\uDFB2 ${statDisplay.toUpperCase()} CHECK</h3>`;
    html += `<div class="encounter-preview">`;
    html += `<p class="preview-difficulty">This is a <strong>${difficultyName}</strong> challenge (DC ${check.difficulty}).</p>`;
    html += `<p class="preview-stat"><strong>Your ${statDisplay}:</strong> ${stars} (${modifierSign}${modifier} modifier)</p>`;
    html += `<p class="preview-mechanic">You'll roll a <strong>20-sided die</strong> and add your ${statDisplay} modifier to the result.</p>`;

    if (minRollNeeded > 20) {
        html += `<p class="preview-needed"><strong>You need:</strong> Impossible with your current stats!</p>`;
    } else if (minRollNeeded <= 1) {
        html += `<p class="preview-needed"><strong>You need:</strong> Any roll will do - you've got this!</p>`;
    } else {
        html += `<p class="preview-needed"><strong>You need:</strong> A ${minRollNeeded} or higher on the die to succeed.</p>`;
    }

    html += `<p class="preview-chance"><strong>Chance of success:</strong> ${successChance}%</p>`;
    html += `</div>`;

    return html;
}

/**
 * Gets difficulty name from number
 * @param {number} difficulty
 * @returns {string}
 */
function getDifficultyName(difficulty) {
    if (difficulty <= 10) return 'Easy';
    if (difficulty <= 15) return 'Medium';
    return 'Hard';
}
