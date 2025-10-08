import * as Tone from "tone";

export class AudioManager {
  private _audioInitialized: boolean = false;
  private _synth: Tone.Synth;
  private _ringtoneLoop: Tone.Loop | null = null;
  private _ringtoneSynth: Tone.Synth | null = null;

  // Background music components
  private _backgroundMusicLoop: Tone.Loop | null = null;
  private _backgroundSynth: Tone.PolySynth | null = null;
  private _backgroundNoise: Tone.Noise | null = null;
  private _ambientSynth: Tone.FMSynth | null = null;

  // Sound effect synths
  private _fxSynth: Tone.Synth | null = null;
  private _bassSynth: Tone.MembraneSynth | null = null;

  constructor() {
    this._synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
    }).toDestination();
  }

  public initializeAudio = (): void => {
    if (!this._audioInitialized) {
      Tone.start();
      this._audioInitialized = true;
      this._setupAudioComponents();
      this._startBackgroundMusic();
      console.log("Audio context started.");
    }
  };

  private _setupAudioComponents(): void {
    // Background music synth with reverb for atmosphere
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
    this._backgroundSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 2, decay: 1, sustain: 0.4, release: 3 }
    }).connect(reverb);
    this._backgroundSynth.volume.value = -20;

    // Ambient noise (fire crackling simulation)
    const noiseFilter = new Tone.Filter(800, "lowpass").toDestination();
    this._backgroundNoise = new Tone.Noise("pink").connect(noiseFilter);
    this._backgroundNoise.volume.value = -30;
    this._backgroundNoise.start();

    // Ambient drone synth
    const ambienceReverb = new Tone.Reverb({ decay: 8, wet: 0.6 }).toDestination();
    this._ambientSynth = new Tone.FMSynth({
      harmonicity: 1.5,
      modulationIndex: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 4, decay: 2, sustain: 0.6, release: 4 }
    }).connect(ambienceReverb);
    this._ambientSynth.volume.value = -25;

    // Sound effects synth
    this._fxSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.8 }
    }).toDestination();

    // Bass synth for impact sounds
    this._bassSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination();
  }

  private _startBackgroundMusic(): void {
    if (!this._backgroundSynth || !this._ambientSynth) return;

    // Tense, atmospheric chord progression
    const chordProgression = [
      ["C3", "Eb3", "G3"],   // Cm
      ["Ab2", "C3", "Eb3"],  // Ab
      ["Bb2", "D3", "F3"],   // Bb
      ["G2", "Bb2", "D3"]    // Gm
    ];

    let chordIndex = 0;

    this._backgroundMusicLoop = new Tone.Loop((time) => {
      const chord = chordProgression[chordIndex];
      this._backgroundSynth?.triggerAttackRelease(chord, "2n", time);

      // Ambient drone note
      this._ambientSynth?.triggerAttackRelease(chord[0], "1m", time);

      chordIndex = (chordIndex + 1) % chordProgression.length;
    }, "4n");

    this._backgroundMusicLoop.start(0);
    Tone.Transport.bpm.value = 80;
    Tone.Transport.start();
  }

  public playQuestCompleteSound = (): void => {
    if (!this._audioInitialized || !this._fxSynth || !this._bassSynth) return;

    const now = Tone.now();

    // Victory fanfare with ascending notes
    const melody = ["C4", "E4", "G4", "C5"];
    melody.forEach((note, i) => {
      this._fxSynth?.triggerAttackRelease(note, "16n", now + i * 0.15);
    });

    // Bass hit for impact
    this._bassSynth.triggerAttackRelease("C2", "8n", now);

    // Final high note
    this._fxSynth?.triggerAttackRelease("E5", "4n", now + 0.6);
  };

  public playRingtone = (): void => {
    if (!this._audioInitialized) return;

    if (this._ringtoneLoop) {
      this._ringtoneLoop.start(0);
      return;
    }

    // Modern ringtone sound with vibrato
    this._ringtoneSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2 }
    }).toDestination();
    this._ringtoneSynth.volume.value = -10;

    this._ringtoneLoop = new Tone.Loop((time) => {
      // Classic ringtone pattern
      this._ringtoneSynth?.triggerAttackRelease("A5", "16n", time);
      this._ringtoneSynth?.triggerAttackRelease("E5", "16n", time + 0.1);
      this._ringtoneSynth?.triggerAttackRelease("A5", "16n", time + 0.3);
      this._ringtoneSynth?.triggerAttackRelease("E5", "16n", time + 0.4);
    }, "2s");

    this._ringtoneLoop.start(0);
  };

  public stopRingtone = (): void => {
    if (this._ringtoneLoop) {
      this._ringtoneLoop.stop(0);
    }
  };

  public stopBackgroundMusic(): void {
    if (this._backgroundMusicLoop) {
      this._backgroundMusicLoop.stop();
    }
    if (this._backgroundNoise) {
      this._backgroundNoise.stop();
    }
  }

  public dispose(): void {
    this.stopBackgroundMusic();
    this.stopRingtone();
    Tone.Transport.stop();

    this._synth?.dispose();
    this._ringtoneSynth?.dispose();
    this._backgroundSynth?.dispose();
    this._backgroundNoise?.dispose();
    this._ambientSynth?.dispose();
    this._fxSynth?.dispose();
    this._bassSynth?.dispose();
  }
}