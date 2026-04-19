// Simple sound utility using Web Audio API
class SoundManager {
  private context: AudioContext | null = null;
  private initPromise: Promise<void> | null = null;

  private async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.context) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.context = new AudioContextClass();
          }
        } catch (e) {
          console.error("AudioContext not supported", e);
        }
      }
      
      if (this.context && this.context.state === 'suspended') {
        try {
          await this.context.resume();
        } catch (e) {
          console.warn("Failed to resume AudioContext", e);
        }
      }
    })();

    return this.initPromise;
  }

  async playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) {
    await this.init();
    if (!this.context || this.context.state !== 'running') {
      // Try one more time to resume if it's still suspended
      if (this.context && this.context.state === 'suspended') {
        await this.context.resume();
      }
      if (!this.context || this.context.state !== 'running') return;
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playGrab() {
    this.playTone(440, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(660, 'sine', 0.1, 0.1), 50);
  }

  playRelease() {
    this.playTone(660, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(440, 'sine', 0.1, 0.1), 50);
  }

  playReboot() {
    this.playTone(220, 'square', 0.1, 0.05);
    setTimeout(() => this.playTone(440, 'square', 0.1, 0.05), 100);
    setTimeout(() => this.playTone(880, 'square', 0.2, 0.05), 200);
  }

  playHelmet() {
    this.playTone(330, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(440, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(554, 'sine', 0.2, 0.1), 200);
  }

  playSuccess() {
    this.playTone(523.25, 'sine', 0.1, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.1), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.1), 200); // G5
  }

  playCrash() {
    this.playTone(100, 'sawtooth', 0.3, 0.2);
    setTimeout(() => this.playTone(50, 'sawtooth', 0.5, 0.2), 50);
  }

  playError() {
    this.playTone(150, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(100, 'square', 0.2, 0.1), 100);
  }

  playDevice() {
    this.playTone(880, 'sine', 0.05, 0.1);
    setTimeout(() => this.playTone(1760, 'sine', 0.05, 0.1), 50);
  }

  private bgmOsc: OscillatorType = 'sine';
  private bgmInterval: any = null;

  async startBGM() {
    await this.init();
    if (!this.context) return;
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    if (this.bgmInterval) return;

    let step = 0;
    const notes = [261.63, 293.66, 329.63, 392.00]; // C4, D4, E4, G4

    this.bgmInterval = setInterval(() => {
      if (!this.context || this.context.state !== 'running') return;
      const freq = notes[step % notes.length];
      
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      
      gain.gain.setValueAtTime(0.01, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.context.destination);

      osc.start();
      osc.stop(this.context.currentTime + 0.5);
      
      step++;
    }, 600);
  }
}

export const soundManager = new SoundManager();
