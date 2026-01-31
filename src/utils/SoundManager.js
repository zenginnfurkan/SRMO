export const SoundManager = {
    ctx: null,
    bgmNodes: [],
    isMuted: false,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.isMuted;
    },

    // --- SFX (Sound Effects) ---
    playTone(freq, type, duration, vol = 0.1) {
        if (this.isMuted) return;
        try {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { console.error(e); }
    },

    playClick() { this.playTone(800, 'sine', 0.1, 0.05); },

    playGold() {
        // Coin sparkle
        this.playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => this.playTone(1600, 'sine', 0.2, 0.05), 50);
    },

    playError() { this.playTone(150, 'sawtooth', 0.3, 0.05); },

    playTravel() {
        // Caravan departure horn (Low Sawtooth)
        this.playTone(100, 'sawtooth', 3.0, 0.05);
    },

    playUpgrade() {
        this.playTone(400, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(600, 'square', 0.1, 0.05), 100);
        setTimeout(() => this.playTone(800, 'square', 0.3, 0.05), 200);
    },

    // --- BGM (Background Music - Silk Road Ambience) ---
    // Hijaz Kar Scale: D, Eb, F#, G, A, Bb, C#, D
    // Frequencies: 147, 156, 185, 196, 220, 233, 277, 294
    scale: [147, 156, 185, 196, 220, 233, 277, 294],

    startBGM() {
        if (this.isMuted || !this.ctx) return;
        if (this.bgmNodes.length > 0) return; // Already playing

        // 1. Drone (Low D) - Continuous atmospheric hum
        const droneOsc = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();

        droneOsc.type = 'triangle';
        droneOsc.frequency.value = 73.42; // D2 (Low)

        // LFO for drone modulation (make it breathe)
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Very slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.02; // Subtle volume change

        droneGain.gain.value = 0.03; // Base volume

        lfo.connect(lfoGain);
        lfoGain.connect(droneGain.gain);
        droneOsc.connect(droneGain);
        droneGain.connect(this.ctx.destination);

        droneOsc.start();
        lfo.start();

        this.bgmNodes.push(droneOsc, droneGain, lfo, lfoGain);

        // 2. Random Melody Generator (The "Oud" / "Duduk" simulator)
        this.notesInterval = setInterval(() => {
            if (this.isMuted) return;
            // 30% chance to play a note every 2 seconds
            if (Math.random() < 0.4) {
                this.playAtmosphereNote();
            }
        }, 1500);
    },

    playAtmosphereNote() {
        if (!this.ctx) return;

        const noteFreq = this.scale[Math.floor(Math.random() * this.scale.length)];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Sawtooth filtered sounds like a wind instrument or plucked string
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        // Attack and release (Plucked string envelope)
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0); // Long decay

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 2.0);
    },

    stopBGM() {
        this.bgmNodes.forEach(node => {
            try { node.stop(); } catch (e) { }
            try { node.disconnect(); } catch (e) { }
        });
        this.bgmNodes = [];
        if (this.notesInterval) clearInterval(this.notesInterval);
    }
};
