export class VoiceControl {
    constructor() {
        this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.recognition = null;
        this.isListening = false;
        this.callback = null;

        if (this.supported) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const result = event.results[last];
                const transcript = result[0].transcript.trim().toLowerCase();
                const isFinal = result.isFinal;
                if (this.callback) this.callback(transcript, isFinal);
            };

            this.recognition.onerror = (event) => {
                console.warn('Voice error:', event.error);
                if (event.error === 'not-allowed') {
                    this.stop();
                    alert('Microphone access denied. Please check your browser settings.');
                }
            };

            this.recognition.onend = () => {
                // Auto-restart if we think we should still be listening
                if (this.isListening) {
                    try {
                        this.recognition.start();
                    } catch(e) {
                        // ignore
                    }
                }
            };
        }
    }

    start(callback) {
        if (!this.supported) return false;
        this.callback = callback;
        this.isListening = true;
        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    stop() {
        if (!this.supported) return;
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) {
            // ignore
        }
    }
}