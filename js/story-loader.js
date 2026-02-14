/**
 * STORY LOADER MODULE
 *
 * This module is responsible for loading and parsing the story.txt file.
 * It reads the text file and converts it into a JavaScript object where
 * each story block (identified by [blockName] tags) becomes a key-value pair.
 *
 * Format in story.txt:
 * [blockName]
 * Story text goes here...
 * [END]
 */

// Global object to store all story text
const StoryText = {};

/**
 * Loads the story.txt file and parses it into the StoryText object
 * @returns {Promise} Resolves when story is loaded
 */
async function loadStoryText() {
    try {
        const response = await fetch('data/story.txt');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const textContent = await response.text();

        if (!textContent || textContent.trim().length === 0) {
            throw new Error('Story file is empty');
        }

        parseStoryText(textContent);
        console.log('Story text loaded successfully:', Object.keys(StoryText).length, 'blocks');

        // Verify critical story blocks exist
        const criticalBlocks = ['game_intro', 'farmhouse_arrival', 'game_over', 'game_win'];
        const missing = criticalBlocks.filter(block => !StoryText[block]);
        if (missing.length > 0) {
            console.error('Missing critical story blocks:', missing);
        }
    } catch (error) {
        console.error('Error loading story text:', error);
        // Provide fallback content for critical blocks
        StoryText['error'] = 'Failed to load story content. Please refresh the page.';
        StoryText['game_intro'] = 'Welcome to the Cursed Farm Adventure! You have arrived at an old farm looking for work...';
        StoryText['game_over'] = 'You have been transformed completely. The curse has claimed another victim.';
        StoryText['game_win'] = 'You have broken the curse! The farm is free at last.';
    }
}

/**
 * Parses the raw story text file into blocks
 * Looks for patterns like [blockName]...[END]
 * @param {string} textContent - The raw text from story.txt
 */
function parseStoryText(textContent) {
    // Regular expression to match [blockName]content[END] patterns
    const blockPattern = /\[([^\]]+)\]([\s\S]*?)\[END\]/g;

    let match;
    while ((match = blockPattern.exec(textContent)) !== null) {
        const blockName = match[1].trim();
        const blockContent = match[2].trim();

        // Store in the global StoryText object
        StoryText[blockName] = blockContent;
    }
}

/**
 * Retrieves a story block by its key
 * @param {string} key - The story block identifier (e.g., 'farmhouse_arrival')
 * @returns {string} The story text, or an error message if not found
 */
function getStoryText(key) {
    if (StoryText[key]) {
        return StoryText[key];
    } else {
        console.warn(`Story block not found: ${key}`);
        return `[Story block "${key}" not found. This might be a bug.]`;
    }
}

/**
 * Check if a story block exists
 * @param {string} key - The story block identifier
 * @returns {boolean} True if the block exists
 */
function hasStoryText(key) {
    return StoryText.hasOwnProperty(key);
}
