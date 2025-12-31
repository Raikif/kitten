// Audio Controller for Exploding Kittens
// Handles background music and sound effects

class AudioController {
    constructor() {
        this.backsound = null;
        this.soundEffects = {};
        this.isMuted = false;
        this.volume = 0.5;
        this.audioContext = null;
        
        this.init();
    }
    
    init() {
        // Create Audio Context for sound effects
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
        
        // Setup backsound
        this.setupBacksound();
        
        // Load mute preference from localStorage
        const savedMute = localStorage.getItem('gameMuted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        
        const savedVolume = localStorage.getItem('gameVolume');
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
        }
    }
    
    setupBacksound() {
        this.backsound = new Audio('assets/backsound.mp3');
        this.backsound.loop = true;
        this.backsound.volume = this.volume * 0.3; // Background music lebih pelan
        // Note: Backsound will be started manually by host screen only
    }
    
    playBacksound() {
        if (this.backsound && !this.isMuted) {
            this.backsound.play().catch(e => {
                console.log('Autoplay prevented. Click anywhere to start music.');
                // Try again on first user interaction
                document.addEventListener('click', () => {
                    if (!this.isMuted) {
                        this.backsound.play().catch(err => console.log('Cannot play audio:', err));
                    }
                }, { once: true });
            });
        }
    }
    
    pauseBacksound() {
        if (this.backsound) {
            this.backsound.pause();
        }
    }
    
    // Simple beep sound using Web Audio API
    playBeep(frequency = 440, duration = 100, type = 'sine') {
        if (this.isMuted || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }
    
    // Sound Effects
    playCardSound() {
        // Quick ascending beep
        this.playBeep(400, 80, 'sine');
        setTimeout(() => this.playBeep(600, 60, 'sine'), 50);
    }
    
    playDrawSound() {
        // Whoosh sound
        this.playBeep(200, 150, 'sawtooth');
    }
    
    playExplodeSound() {
        // Explosion sound
        if (this.isMuted || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        
        gainNode.gain.setValueAtTime(this.volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
    
    playDefuseSound() {
        // Victory chime
        this.playBeep(523.25, 100, 'sine'); // C
        setTimeout(() => this.playBeep(659.25, 100, 'sine'), 100); // E
        setTimeout(() => this.playBeep(783.99, 150, 'sine'), 200); // G
    }
    
    playButtonClick() {
        this.playBeep(600, 50, 'square');
    }
    
    playTurnChange() {
        // Notification sound
        this.playBeep(800, 100, 'sine');
        setTimeout(() => this.playBeep(1000, 100, 'sine'), 100);
    }
    
    playWinSound() {
        // Victory fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, i) => {
            setTimeout(() => this.playBeep(freq, 200, 'sine'), i * 150);
        });
    }
    
    playJoinSound() {
        // Pleasant ascending tone
        this.playBeep(500, 80, 'sine');
        setTimeout(() => this.playBeep(700, 100, 'sine'), 80);
    }
    
    playErrorSound() {
        // Low buzz
        this.playBeep(200, 200, 'square');
    }
    
    playShuffleSound() {
        // Rapid random beeps
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const freq = 300 + Math.random() * 400;
                this.playBeep(freq, 50, 'square');
            }, i * 40);
        }
    }
    
    playStealSound() {
        // Quick swoosh
        if (this.isMuted || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        
        gainNode.gain.setValueAtTime(this.volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }
    
    // Volume Control
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.backsound) {
            this.backsound.volume = this.volume * 0.3;
        }
        localStorage.setItem('gameVolume', this.volume.toString());
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('gameMuted', this.isMuted.toString());
        
        if (this.isMuted) {
            this.pauseBacksound();
        } else {
            this.playBacksound();
        }
        
        return this.isMuted;
    }
    
    getMuteState() {
        return this.isMuted;
    }
}

// Create global audio controller instance
const audioController = new AudioController();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.audioController = audioController;
}
