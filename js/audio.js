/**
 * AUDIO MODULE
 *
 * Manages background music playback for the game.
 * Each room can specify a music track in rooms.json via the "music" field.
 * Music crossfades when changing tracks between rooms.
 * Mute preference is stored in localStorage (persists across sessions and save slots).
 */

const AUDIO_MUTE_KEY = 'cursedFarmAudioMuted';
const CROSSFADE_MS = 1000;
const DEFAULT_VOLUME = 0.4;

let audioElement = null;
let currentTrackSrc = null;
let isMuted = true; // Start muted by default (avoids autoplay restrictions)
let fadeInterval = null;

/**
 * Initializes the audio system.
 * Creates the audio element and restores mute preference from localStorage.
 */
function initAudio() {
    audioElement = document.createElement('audio');
    audioElement.loop = true;
    audioElement.volume = DEFAULT_VOLUME;

    // Restore saved mute preference (default to muted if no preference saved)
    const saved = localStorage.getItem(AUDIO_MUTE_KEY);
    isMuted = saved === null ? true : saved === 'true';

    audioElement.muted = isMuted;
    updateAudioToggleUI();

    // Set up toggle button listener
    const toggleBtn = document.getElementById('audio-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleMute);
    }
}

/**
 * Plays the music track associated with a room.
 * If the room has no music field, fades out the current track.
 * If the same track is already playing, does nothing.
 * @param {string} roomId - The room ID to play music for
 */
function playRoomMusic(roomId) {
    if (!audioElement) return;

    const room = RoomsData[roomId];
    const trackSrc = room && room.music ? room.music : null;

    // Same track already playing — do nothing
    if (trackSrc === currentTrackSrc) return;

    if (!trackSrc) {
        // No music for this room — fade out
        fadeOut(() => {
            audioElement.pause();
            audioElement.removeAttribute('src');
            currentTrackSrc = null;
        });
        return;
    }

    // Different track — crossfade
    fadeOut(() => {
        audioElement.loop = true;
        audioElement.src = trackSrc;
        currentTrackSrc = trackSrc;
        audioElement.play().catch(err => {
            // Autoplay blocked or file not found — silently ignore
            console.log('Audio playback failed:', err.message);
        });
        fadeIn();
    });
}

/**
 * Toggles the mute state and persists the preference.
 */
function toggleMute() {
    isMuted = !isMuted;
    audioElement.muted = isMuted;
    localStorage.setItem(AUDIO_MUTE_KEY, isMuted);
    updateAudioToggleUI();

    // If unmuting and we have a track loaded but paused, resume playback
    if (!isMuted && currentTrackSrc && audioElement.paused) {
        audioElement.play().catch(err => {
            console.log('Audio playback failed:', err.message);
        });
    }
}

/**
 * Updates the toggle button icon to reflect current mute state.
 */
function updateAudioToggleUI() {
    const toggleBtn = document.getElementById('audio-toggle');
    if (!toggleBtn) return;
    toggleBtn.textContent = isMuted ? '\u{1F507}' : '\u{1F50A}';
    toggleBtn.title = isMuted ? 'Turn music on' : 'Turn music off';
}

/**
 * Fades the audio volume out over CROSSFADE_MS, then calls the callback.
 * @param {Function} callback - Called when fade completes
 */
function fadeOut(callback) {
    if (fadeInterval) clearInterval(fadeInterval);

    if (!currentTrackSrc || audioElement.paused) {
        audioElement.volume = 0;
        callback();
        return;
    }

    const steps = 20;
    const stepTime = CROSSFADE_MS / 2 / steps;
    const volumeStep = audioElement.volume / steps;

    fadeInterval = setInterval(() => {
        audioElement.volume = Math.max(0, audioElement.volume - volumeStep);
        if (audioElement.volume <= 0.01) {
            clearInterval(fadeInterval);
            fadeInterval = null;
            audioElement.volume = 0;
            callback();
        }
    }, stepTime);
}

/**
 * Stops room music and plays a one-shot ending track (victory or game over).
 * The track does not loop.
 * @param {string} trackSrc - Path to the ending music file
 */
function playEndingMusic(trackSrc) {
    if (!audioElement) return;

    fadeOut(() => {
        audioElement.loop = false;
        audioElement.src = trackSrc;
        currentTrackSrc = trackSrc;
        audioElement.play().catch(err => {
            console.log('Audio playback failed:', err.message);
        });
        fadeIn();
    });
}

/**
 * Fades the audio volume in over CROSSFADE_MS.
 */
function fadeIn() {
    if (fadeInterval) clearInterval(fadeInterval);

    audioElement.volume = 0;
    const steps = 20;
    const stepTime = CROSSFADE_MS / 2 / steps;
    const volumeStep = DEFAULT_VOLUME / steps;

    fadeInterval = setInterval(() => {
        audioElement.volume = Math.min(DEFAULT_VOLUME, audioElement.volume + volumeStep);
        if (audioElement.volume >= DEFAULT_VOLUME - 0.01) {
            clearInterval(fadeInterval);
            fadeInterval = null;
            audioElement.volume = DEFAULT_VOLUME;
        }
    }, stepTime);
}
