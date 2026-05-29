// ─── voice.js — Voice input via Web Speech API ───────────────────────────────
// Records speech and appends the transcript to the textarea.
// No fetch(), no localStorage. Pure browser API wrapper.

let recognition = null;
let isListening = false;

/**
 * Check if voice input is supported in this browser.
 * @returns {boolean}
 */
export function isVoiceSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Toggle voice recording on/off.
 * Appends recognised text to the textarea.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLButtonElement}   btn          - The mic button to update visually
 * @param {function}            onTranscript - Called with (text) after each result
 */
export function toggleVoice(textarea, btn, onTranscript) {
    if (!isVoiceSupported()) {
        return;
    }

    if (isListening) {
        stopVoice(btn);
        return;
    }

    startVoice(textarea, btn, onTranscript);
}

function startVoice(textarea, btn, onTranscript) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();

    recognition.continuous = true; // keep recording until stopped
    recognition.interimResults = true; // show partial results
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
        isListening = true;
        btn.classList.add('mic-active');
        btn.title = 'Stop recording';
        btn.textContent = '🔴';
    };

    recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
                finalTranscript += t + ' ';
            } else {
                interim += t;
            }
        }

        // Show combined in textarea
        const base = textarea.dataset.voiceBase || '';
        textarea.value = base + finalTranscript + interim;
        if (onTranscript) {
            onTranscript(textarea.value);
        }
    };

    recognition.onerror = (e) => {
        console.error('Voice error:', e.error);
        stopVoice(btn);
    };

    recognition.onend = () => {
        if (isListening) {
            recognition.start();
        } // auto-restart if still active
    };

    // Snapshot existing text so we append rather than replace
    textarea.dataset.voiceBase = textarea.value ? textarea.value + ' ' : '';
    recognition.start();
}

function stopVoice(btn) {
    isListening = false;
    if (recognition) {
        recognition.onend = null; // prevent auto-restart
        recognition.stop();
        recognition = null;
    }
    if (btn) {
        btn.classList.remove('mic-active');
        btn.title = 'Voice input';
        btn.textContent = '🎤';
    }
}
