export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.tickBuffer = null;
        this.landBuffer = null;
        this.isMuted = false;
        
        this.loadSound('tick.mp3').then(buf => this.tickBuffer = buf);
        this.loadSound('landing.mp3').then(buf => this.landBuffer = buf);
    }

    async loadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("Error loading sound:", url, e);
            return null;
        }
    }

    playTick(velocity) {
        if (!this.tickBuffer || this.isMuted) return;
        // Pitch shift based on velocity for realism
        const source = this.ctx.createBufferSource();
        source.buffer = this.tickBuffer;
        // Map velocity to playback rate (0.8 to 1.2)
        const rate = 0.8 + Math.min(velocity / 20, 0.4); 
        source.playbackRate.value = rate;
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0.3; // softer ticks
        
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
    }

    playLand() {
        if (!this.landBuffer || this.isMuted) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.landBuffer;
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0.6;
        
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
    }

    speak(text) {
        if (this.isMuted) return;
        // Cancel previous speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}