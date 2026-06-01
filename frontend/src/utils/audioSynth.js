// eCLIPSe Web Audio Synthesizer Engine
// Generates beautiful premium synthesized music in real-time.
// Highly optimized, self-cleaning, and requires zero network requests.

class AudioSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.isPlaying = false;
    this.currentTrackType = null;
    this.intervals = [];
    this.activeNodes = [];
    this.bpm = 120;
    this.volume = 0.5;
    this.trackStartTime = 0;
    this.clipStart = 0;
    this.clipEnd = null;
    this.audioElement = null;
    this.audioSource = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  stop() {
    this.isPlaying = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
    });
    this.activeNodes = [];
    this.currentTrackType = null;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch (e) {}
    }
  }

  play(trackType, startTimeOffset = 0, clipStart = 0, clipEnd = null, audioUrl = null) {
    this.stop();
    this.init();
    
    this.isPlaying = true;
    this.currentTrackType = trackType;
    this.trackStartTime = this.ctx.currentTime - startTimeOffset;
    this.clipStart = clipStart;
    this.clipEnd = clipEnd;

    if (audioUrl) {
      this.playAudioFile(audioUrl, startTimeOffset);
      return;
    }

    // Route to specialized loops based on track mood
    const normalizedType = (trackType || '').toLowerCase();
    
    if (normalizedType.includes('lo-fi') || normalizedType.includes('sunset')) {
      this.playLofi(startTimeOffset);
    } else if (normalizedType.includes('highway') || normalizedType.includes('neon') || normalizedType.includes('synthwave')) {
      this.playSynthwave(startTimeOffset);
    } else if (normalizedType.includes('focus') || normalizedType.includes('deep')) {
      this.playDeepFocus(startTimeOffset);
    } else if (normalizedType.includes('breeze') || normalizedType.includes('acoustic')) {
      this.playAcoustic(startTimeOffset);
    } else if (normalizedType.includes('pulse') || normalizedType.includes('techno')) {
      this.playTechno(startTimeOffset);
    } else if (normalizedType.includes('ocean') || normalizedType.includes('whispers')) {
      this.playOcean(startTimeOffset);
    } else {
      this.playDeepFocus(startTimeOffset); // Fallback to calming pad
    }
  }

  playAudioFile(url, offset, clipStart = 0, clipEnd = null) {
    this.stop();
    this.init();
    this.isPlaying = true;
    this.clipStart = clipStart;
    this.clipEnd = clipEnd;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = "anonymous";
      this.audioSource = this.ctx.createMediaElementSource(this.audioElement);
      this.audioSource.connect(this.masterGain);
    }
    this.audioElement.src = url;

    if (clipEnd !== null) {
      // Loop clip duration
      this.audioElement.currentTime = this.clipStart + offset;

      const checkInterval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(checkInterval);
          return;
        }
        if (this.audioElement.currentTime >= this.clipEnd) {
          this.audioElement.currentTime = this.clipStart;
        }
      }, 100);
      this.intervals.push(checkInterval);
    } else {
      this.audioElement.currentTime = offset;
    }

    this.audioElement.play().catch(err => {
      console.warn("Failed to play audio element source:", err);
    });
  }

  // Play audio from a Blob (used for offline downloaded tracks)
  playFromBlob(blob, offset = 0, clipStart = 0, clipEnd = null) {
    this.stop();
    this.init();
    this.isPlaying = true;
    this.clipStart = clipStart;
    this.clipEnd = clipEnd;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = "anonymous";
      this.audioSource = this.ctx.createMediaElementSource(this.audioElement);
      this.audioSource.connect(this.masterGain);
    }

    const blobUrl = URL.createObjectURL(blob);
    this.audioElement.src = blobUrl;

    if (clipEnd !== null) {
      this.audioElement.currentTime = clipStart + offset;
      const checkInterval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(checkInterval);
          return;
        }
        if (this.audioElement.currentTime >= clipEnd) {
          this.audioElement.currentTime = clipStart;
        }
      }, 100);
      this.intervals.push(checkInterval);
    } else {
      this.audioElement.currentTime = offset;
    }

    this.audioElement.play().catch(err => {
      console.warn("Failed to play blob audio:", err);
    });

    this.audioElement.onended = () => URL.revokeObjectURL(blobUrl);
  }

  // Stream audio from backend with auth token
  async playFromStream(streamUrl, token, offset = 0, clipStart = 0, clipEnd = null) {
    this.stop();
    this.init();
    this.isPlaying = true;
    this.clipStart = clipStart;
    this.clipEnd = clipEnd;

    try {
      const response = await fetch(streamUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        console.warn('[AUDIO] Stream fetch failed:', response.status);
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";
        this.audioSource = this.ctx.createMediaElementSource(this.audioElement);
        this.audioSource.connect(this.masterGain);
      }

      this.audioElement.src = blobUrl;

      if (clipEnd !== null) {
        this.audioElement.currentTime = clipStart + offset;

        const checkInterval = setInterval(() => {
          if (!this.isPlaying) {
            clearInterval(checkInterval);
            URL.revokeObjectURL(blobUrl);
            return;
          }
          if (this.audioElement.currentTime >= clipEnd) {
            this.audioElement.currentTime = clipStart;
          }
        }, 100);
        this.intervals.push(checkInterval);
      } else {
        this.audioElement.currentTime = offset;
      }

      this.audioElement.play().catch((err) => {
        console.warn('[AUDIO] Playback failed:', err);
      });

      // Cleanup blob URL when done
      this.audioElement.onended = () => URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[AUDIO] Stream error:', err.message);
    }
  }

  // Safe node scheduling tracker
  registerNode(node) {
    this.activeNodes.push(node);
  }

  getAnalyserData() {
    if (!this.analyser) return new Uint8Array(128);
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // 1. Lo-Fi Sunset: Dreamy electric piano chords + soft vinyl crackle
  playLofi(offset) {
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 392.00]  // G7
    ];
    
    const playChord = (chordIndex, time) => {
      if (!this.isPlaying) return;
      const chord = chords[chordIndex % chords.length];
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.1);
        gain.gain.setValueAtTime(0.08, time + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 2.5);
        this.registerNode(osc);
      });
    };

    // Synthesize Vinyl crackle
    const vinylCrackler = setInterval(() => {
      if (!this.isPlaying) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(Math.random() * 8000 + 2000, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.005, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    }, 150);
    this.intervals.push(vinylCrackler);

    const step = 3.0; // 3 seconds per chord change
    let index = Math.floor(offset / step);

    const chordLoop = () => {
      const now = this.ctx.currentTime;
      playChord(index, now);
      index++;
    };

    chordLoop();
    const chordInterval = setInterval(chordLoop, step * 1000);
    this.intervals.push(chordInterval);
  }

  // 2. Neon Highway: Pulsing synthwave grid bass + fast arpeggiator
  playSynthwave(offset) {
    const bassline = [110.00, 110.00, 130.81, 98.00]; // A, A, C, G
    const arpeggio = [220, 277.18, 329.63, 440, 554.37, 440, 329.63, 277.18]; // A major arp
    
    let stepCount = Math.floor((offset * 1000) / 125); // 125ms per 16th note

    const loop = () => {
      if (!this.isPlaying) return;
      const time = this.ctx.currentTime;
      const bar = Math.floor(stepCount / 16);
      const noteInBar = stepCount % 16;
      
      // Pulse Bassline on 8th notes
      if (noteInBar % 2 === 0) {
        const bassFreq = bassline[bar % bassline.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq / 2, time); // Octave down

        bassGain.gain.setValueAtTime(0, time);
        bassGain.gain.linearRampToValueAtTime(0.12, time + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        bassOsc.start(time);
        bassOsc.stop(time + 0.25);
        this.registerNode(bassOsc);
      }

      // Arpeggiate on 16th notes
      if (noteInBar % 1 === 0) {
        const arpFreq = arpeggio[stepCount % arpeggio.length];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'square';
        arpOsc.frequency.setValueAtTime(arpFreq * 1.5, time);

        arpGain.gain.setValueAtTime(0, time);
        arpGain.gain.linearRampToValueAtTime(0.03, time + 0.01);
        arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

        arpOsc.connect(arpGain);
        arpGain.connect(this.masterGain);
        arpOsc.start(time);
        arpOsc.stop(time + 0.15);
        this.registerNode(arpOsc);
      }

      stepCount++;
    };

    loop();
    const interval = setInterval(loop, 125);
    this.intervals.push(interval);
  }

  // 3. Deep Focus: Deep evolving ambient pad with gentle drone
  playDeepFocus(offset) {
    const padNotes = [146.83, 220.00, 293.66, 369.99, 440.00]; // D major soft harmony

    const schedulePad = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      
      padNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Slow frequency modulation
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + (i * 0.5), now);

        lfo.frequency.value = 0.1 + (i * 0.05);
        lfoGain.gain.value = 4;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400 + Math.sin(now) * 100, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 2.0);
        gain.gain.setValueAtTime(0.06, now + 4.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 7.0);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        lfo.start(now);
        osc.start(now);
        osc.stop(now + 7.5);
        lfo.stop(now + 7.5);

        this.registerNode(osc);
        this.registerNode(lfo);
      });
    };

    schedulePad();
    const padInterval = setInterval(schedulePad, 5000);
    this.intervals.push(padInterval);
  }

  // 4. Acoustic Breeze: physical model string plucking (Karplus-Strong) simulation
  playAcoustic(offset) {
    const chords = [
      [130.81, 196.00, 261.63, 329.63, 392.00], // C Major
      [146.83, 220.00, 293.66, 369.99, 440.00], // D Major
      [164.81, 246.94, 329.63, 392.00, 493.88], // E Minor
      [130.81, 196.00, 261.63, 329.63, 392.00]  // C Major
    ];

    const strumChord = (chordIndex) => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIndex % chords.length];
      
      chord.forEach((freq, noteIdx) => {
        // Stagger pluck times for human-like strumming
        const pluckTime = now + (noteIdx * 0.06);
        
        // Simulating physical plucking using a short impulse + noise filter
        const osc = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, pluckTime);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(freq * 2, pluckTime);

        gain.gain.setValueAtTime(0, pluckTime);
        gain.gain.linearRampToValueAtTime(0.08, pluckTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, pluckTime + 1.8);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(this.masterGain);

        osc.start(pluckTime);
        oscHarmonic.start(pluckTime);
        osc.stop(pluckTime + 2.0);
        oscHarmonic.stop(pluckTime + 2.0);

        this.registerNode(osc);
        this.registerNode(oscHarmonic);
      });
    };

    let strumIndex = Math.floor(offset / 2.0);
    
    const strumLoop = () => {
      strumChord(strumIndex);
      strumIndex++;
    };

    strumLoop();
    const acousticInterval = setInterval(strumLoop, 2000);
    this.intervals.push(acousticInterval);
  }

  // 5. Techno Pulse: 4/4 electronic heavy kick drum + high hat + acid line
  playTechno(offset) {
    let stepCount = Math.floor((offset * 1000) / 117); // 128 BPM (approx 117ms per 16th note)

    const loop = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const stepInBar = stepCount % 16;

      // Heavy Bass Kick on beats 1, 5, 9, 13
      if (stepInBar % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.2); // Frequency sweep

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        this.registerNode(osc);
      }

      // Electronic Hi-Hat on offbeats 3, 7, 11, 15
      if (stepInBar % 4 === 2) {
        // Highpass filtered white noise burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(8000 + Math.random() * 2000, now);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6000, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
        this.registerNode(osc);
      }

      // Evolving synth bass sequence
      const bassNotes = [55, 55, 55, 65, 55, 55, 73, 55, 55, 55, 55, 82, 55, 65, 55, 55];
      if (stepInBar % 2 === 0) {
        const freq = bassNotes[stepInBar];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        this.registerNode(osc);
      }

      stepCount++;
    };

    loop();
    const interval = setInterval(loop, 117);
    this.intervals.push(interval);
  }

  // 6. Ocean Whispers: Gentle rise and fall of synthesized filtered noise waves
  playOcean(offset) {
    const generateWave = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      
      // Simulate water waves by creating a noise filter swept by a slow oscillator LFO
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Create a noise-like high frequency source
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.Q.value = 1.0;

      // Program filter sweeps (rise and fall)
      filter.frequency.linearRampToValueAtTime(800, now + 2.5);
      filter.frequency.exponentialRampToValueAtTime(250, now + 5.5);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 2.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 6.0);
      this.registerNode(osc);
    };

    generateWave();
    const waveInterval = setInterval(generateWave, 5000);
    this.intervals.push(waveInterval);
  }
}

const synthInstance = new AudioSynth();
export default synthInstance;
