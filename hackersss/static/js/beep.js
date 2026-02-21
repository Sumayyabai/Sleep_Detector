/**
 * beep.js — Alarm Sound Module
 *
 * Uses Web Audio API to generate a loud, attention-grabbing
 * beep pattern when sleeping is detected.
 */

const AlarmModule = (() => {
    let audioCtx = null;
    let isPlaying = false;
    let oscillators = [];
    let intervalId = null;

    /**
     * Initialize the AudioContext (must be called after user interaction)
     */
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    /**
     * Play a single beep tone
     * @param {number} frequency - Tone frequency in Hz
     * @param {number} duration - Duration in milliseconds
     * @param {number} volume - Volume 0.0 to 1.0
     */
    function playTone(frequency, duration, volume = 0.5) {
        if (!audioCtx) initAudio();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

        // Attack
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);

        // Sustain then decay
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + (duration / 1000) - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (duration / 1000));

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration / 1000);

        oscillators.push(oscillator);

        oscillator.onended = () => {
            oscillators = oscillators.filter(o => o !== oscillator);
        };
    }

    /**
     * Play the alarm pattern — alternating high/low tones
     */
    function playAlarmPattern() {
        // Urgent two-tone pattern
        playTone(880, 200, 0.6);   // A5 - high tone
        setTimeout(() => playTone(660, 200, 0.6), 250);  // E5 - low tone
        setTimeout(() => playTone(880, 200, 0.6), 500);  // A5 - high tone
        setTimeout(() => playTone(660, 200, 0.6), 750);  // E5 - low tone
    }

    /**
     * Start the alarm — loops the beep pattern
     */
    function startAlarm() {
        if (isPlaying) return;

        initAudio();
        isPlaying = true;

        // Play immediately
        playAlarmPattern();

        // Repeat every 1.5 seconds
        intervalId = setInterval(() => {
            if (isPlaying) {
                playAlarmPattern();
            }
        }, 1500);

        console.log('[AlarmModule] Alarm started');
    }

    /**
     * Stop the alarm
     */
    function stopAlarm() {
        isPlaying = false;

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        // Stop all active oscillators
        oscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { /* already stopped */ }
        });
        oscillators = [];

        console.log('[AlarmModule] Alarm stopped');
    }

    /**
     * Check if alarm is currently playing
     */
    function isAlarmPlaying() {
        return isPlaying;
    }

    // Public API
    return {
        startAlarm,
        stopAlarm,
        isAlarmPlaying,
        initAudio,
        playTone
    };
})();
