// ============================================
// SISTEMA DE ÁUDIO - Música de fundo
// ============================================

const AudioSystem = {
    musicContext: null,
    musicNodes: [],
    isPlaying: false,
    gainNode: null,
    musicInterval: null,
    
    // Notas musicais
    NOTES: {
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
        G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
        D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
    },
    
    // Melodia de fazenda
    FARM_MELODY: [
        { note: 'C4', duration: 0.3 }, { note: 'E4', duration: 0.3 },
        { note: 'G4', duration: 0.3 }, { note: 'C5', duration: 0.4 },
        { note: 'B4', duration: 0.3 }, { note: 'G4', duration: 0.3 },
        { note: 'E4', duration: 0.3 }, { note: 'D4', duration: 0.4 },
        { note: 'C4', duration: 0.3 }, { note: 'E4', duration: 0.3 },
        { note: 'G4', duration: 0.3 }, { note: 'C5', duration: 0.4 },
        { note: 'D5', duration: 0.3 }, { note: 'C5', duration: 0.3 },
        { note: 'G4', duration: 0.3 }, { note: 'E4', duration: 0.4 },
        { note: 'F4', duration: 0.3 }, { note: 'A4', duration: 0.3 },
        { note: 'C5', duration: 0.3 }, { note: 'F5', duration: 0.4 },
        { note: 'E5', duration: 0.3 }, { note: 'C5', duration: 0.3 },
        { note: 'A4', duration: 0.3 }, { note: 'G4', duration: 0.4 },
        { note: 'G4', duration: 0.3 }, { note: 'B4', duration: 0.3 },
        { note: 'D5', duration: 0.3 }, { note: 'G5', duration: 0.4 },
        { note: 'F5', duration: 0.3 }, { note: 'D5', duration: 0.3 },
        { note: 'B4', duration: 0.3 }, { note: 'C5', duration: 0.6 }
    ],
    
    init: function() {
        if (!this.musicContext) {
            this.musicContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.musicContext.createGain();
            this.gainNode.gain.value = 0.3;
            this.gainNode.connect(this.musicContext.destination);
        }
        if (this.musicContext.state === 'suspended') {
            this.musicContext.resume();
        }
    },
    
    playNote: function(frequency, duration, time) {
        if (!this.musicContext) return;
        try {
            const oscillator = this.musicContext.createOscillator();
            const gainNode = this.musicContext.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
            oscillator.connect(gainNode);
            gainNode.connect(this.gainNode);
            oscillator.start(time);
            oscillator.stop(time + duration);
            
            if (Math.random() > 0.7) {
                const delayGain = this.musicContext.createGain();
                delayGain.gain.value = 0.05;
                const delay = this.musicContext.createDelay(0.5);
                delay.delayTime.value = 0.1;
                gainNode.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(this.gainNode);
            }
            
            this.musicNodes.push(oscillator);
            setTimeout(() => {
                const idx = this.musicNodes.indexOf(oscillator);
                if (idx > -1) this.musicNodes.splice(idx, 1);
            }, (duration + 0.1) * 1000);
        } catch(e) {
            // Silencia erros
        }
    },
    
    playMelody: function() {
        if (!this.isPlaying) return;
        if (!this.musicContext) return;
        
        let time = this.musicContext.currentTime + 0.05;
        
        this.FARM_MELODY.forEach((note, index) => {
            const freq = this.NOTES[note.note];
            if (freq) {
                this.playNote(freq, note.duration, time);
                time += note.duration + 0.05;
                
                // Harmonia ocasional
                if (index % 4 === 0 && Math.random() > 0.6) {
                    const harmonyNote = this.getHarmonyNote(note.note);
                    if (harmonyNote) {
                        const harmonyFreq = this.NOTES[harmonyNote];
                        this.playNote(harmonyFreq, note.duration * 0.7, time - note.duration - 0.02);
                    }
                }
            }
        });
        
        const totalDuration = this.FARM_MELODY.reduce((sum, n) => sum + n.duration + 0.05, 0);
        this.musicInterval = setTimeout(() => {
            if (this.isPlaying) this.playMelody();
        }, (totalDuration + 0.5) * 1000);
    },
    
    getHarmonyNote: function(note) {
        const harmonyMap = {
            'C4': 'E4', 'E4': 'G4', 'G4': 'C5', 'C5': 'G4',
            'D4': 'F4', 'F4': 'A4', 'A4': 'C5', 'D5': 'F5',
            'G4': 'B4', 'B4': 'D5', 'F5': 'D5', 'E5': 'C5'
        };
        return harmonyMap[note] || null;
    },
    
    toggle: function() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        this.updateButton();
    },
    
    start: function() {
        try {
            this.init();
            this.isPlaying = true;
            if (this.musicInterval) {
                clearTimeout(this.musicInterval);
                this.musicInterval = null;
            }
            setTimeout(() => {
                if (this.isPlaying) this.playMelody();
            }, 200);
            this.showToast('🎵 Música ligada!');
        } catch(e) {
            this.showToast('Erro ao iniciar música.');
        }
    },
    
    stop: function() {
        this.isPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
        this.musicNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        this.musicNodes = [];
        this.showToast('🔇 Música desligada');
    },
    
    updateButton: function() {
        const btn = document.getElementById('music-toggle');
        if (btn) {
            btn.className = `icon-btn ${this.isPlaying ? 'music-on' : 'music-off'}`;
            btn.innerHTML = this.isPlaying ? '🔊 Música' : '🔇 Música';
        }
    },
    
    showToast: function(msg) {
        // Será sobrescrito pelo sistema de toasts do jogo
        if (window.toast) window.toast(msg);
        else console.log(msg);
    }
};