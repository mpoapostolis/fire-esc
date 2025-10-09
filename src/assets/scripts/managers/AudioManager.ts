import * as Tone from "tone";

export class AudioManager {
  private _audioInitialized: boolean = false;
  private _synth: Tone.Synth;
  private _ringtoneLoop: Tone.Loop | null = null;
  private _ringtoneSynth: Tone.Synth | null = null;

  // Background music components
  private _backgroundMusicLoop: Tone.Loop | null = null;
  private _leadSynth: Tone.Synth | null = null;
  private _bassSynth: Tone.Synth | null = null;
  private _padSynth: Tone.PolySynth | null = null;

  // Fire sound effects
  private _fireNoise: Tone.Noise | null = null;
  private _fireVolume: Tone.Volume | null = null;
  private _fireFilter: Tone.Filter | null = null;

  // Sound effect synths
  private _fxSynth: Tone.Synth | null = null;
  private _impactSynth: Tone.MembraneSynth | null = null;
  private _uiSynth: Tone.Synth | null = null;

  constructor() {
    this._synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
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
    // Dreamy indie lead - square wave for that retro/chiptune feel
    const leadReverb = new Tone.Reverb({ decay: 4, wet: 0.6 }).toDestination();
    const leadDelay = new Tone.FeedbackDelay("8n", 0.3).connect(leadReverb);
    this._leadSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.8 },
    }).connect(leadDelay);
    this._leadSynth.volume.value = -28;

    // Punchy bass - triangle wave for warmth
    const bassFilter = new Tone.Filter(800, "lowpass").toDestination();
    this._bassSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 0.6 },
    }).connect(bassFilter);
    this._bassSynth.volume.value = -30;

    // Lush pads - sawtooth for richness
    const padReverb = new Tone.Reverb({ decay: 8, wet: 0.7 }).toDestination();
    const padChorus = new Tone.Chorus(2, 2.5, 0.5).connect(padReverb);
    this._padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 1.5, decay: 0.5, sustain: 0.9, release: 2.5 },
    }).connect(padChorus);
    this._padSynth.volume.value = -32;

    // Crackling fire with character
    this._fireVolume = new Tone.Volume(-35).toDestination();
    this._fireFilter = new Tone.Filter(800, "lowpass").connect(
      this._fireVolume
    );
    const fireFilter2 = new Tone.Filter(150, "highpass").connect(
      this._fireFilter
    );
    this._fireNoise = new Tone.Noise("brown").connect(fireFilter2);
    this._fireNoise.start();

    // Crisp UI sounds - triangle for softer clicks
    this._uiSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.15 },
    }).toDestination();
    this._uiSynth.volume.value = -12;

    // Bright FX synth - pulse wave for character
    const fxReverb = new Tone.Reverb({ decay: 2, wet: 0.4 }).toDestination();
    this._fxSynth = new Tone.Synth({
      oscillator: { type: "pulse", width: 0.4 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 },
    }).connect(fxReverb);
    this._fxSynth.volume.value = -14;

    // Punchy impact - for satisfying game feel
    this._impactSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.8 },
    }).toDestination();
    this._impactSynth.volume.value = -12;
  }

  private _startBackgroundMusic(): void {
    if (!this._leadSynth || !this._bassSynth || !this._padSynth) return;

    // Catchy indie game melody - more memorable and upbeat
    const melody = [
      "E5", null, "G5", null, "A5", null, "G5", "E5",
      null, "D5", null, "E5", null, null, null, null,
      "E5", null, "G5", null, "B5", null, "A5", "G5",
      null, "E5", null, "G5", null, null, null, null,
      "C5", null, "E5", null, "G5", null, "E5", "C5",
      null, "D5", null, "E5", null, null, null, null,
      "G5", null, "A5", null, "B5", null, "C6", "B5",
      "A5", null, "G5", null, "E5", null, null, null
    ];

    // Groovy bass line with movement
    const bassLine = [
      "C2", null, null, "C3", null, "C2", null, null,
      "C2", null, null, "G2", null, null, null, null,
      "A1", null, null, "A2", null, "A1", null, null,
      "A1", null, null, "E2", null, null, null, null,
      "F2", null, null, "F2", null, "F2", null, null,
      "G2", null, null, "G2", null, null, null, null,
      "C2", null, null, "C3", null, "C2", null, "G2",
      null, null, "C2", null, null, null, null, null
    ];

    // Rich indie chords
    const chords = [
      ["C3", "E3", "G3", "B3"],
      ["A2", "C3", "E3", "A3"],
      ["F2", "A2", "C3", "F3"],
      ["G2", "B2", "D3", "G3"]
    ];

    let melodyIndex = 0;
    let bassIndex = 0;
    let chordIndex = 0;

    this._backgroundMusicLoop = new Tone.Loop((time) => {
      // Catchy melody with character
      const note = melody[melodyIndex];
      if (note) {
        this._leadSynth?.triggerAttackRelease(note, "8n", time);
      }
      melodyIndex = (melodyIndex + 1) % melody.length;

      // Groovy bass
      const bassNote = bassLine[bassIndex];
      if (bassNote) {
        this._bassSynth?.triggerAttackRelease(bassNote, "8n", time);
      }
      bassIndex = (bassIndex + 1) % bassLine.length;

      // Lush pads for atmosphere
      if (melodyIndex % 16 === 0) {
        this._padSynth?.triggerAttackRelease(chords[chordIndex], "2m", time);
        chordIndex = (chordIndex + 1) % chords.length;
      }
    }, "16n");

    this._backgroundMusicLoop.start(0);
    Tone.Transport.bpm.value = 95; // Upbeat indie tempo
    Tone.Transport.start();
  }

  public playQuestCompleteSound = (): void => {
    if (!this._audioInitialized || !this._fxSynth || !this._impactSynth) return;

    const now = Tone.now();

    // Satisfying indie game victory jingle
    const victoryMelody = ["E5", "G5", "C6", "E6", "G6"];
    victoryMelody.forEach((note, i) => {
      this._fxSynth?.triggerAttackRelease(note, "16n", now + i * 0.12);
    });

    // Punchy bass hits for impact
    this._impactSynth?.triggerAttackRelease("C2", "8n", now);
    this._impactSynth?.triggerAttackRelease("C2", "16n", now + 0.24);
    this._impactSynth?.triggerAttackRelease("C1", "8n", now + 0.48);
  };

  public playButtonClick = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    // Satisfying click sound
    this._uiSynth.triggerAttackRelease("E5", "32n");
  };

  public playModalOpen = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    const now = Tone.now();
    // Upward swoop
    this._uiSynth.triggerAttackRelease("C5", "64n", now);
    this._uiSynth.triggerAttackRelease("E5", "64n", now + 0.04);
    this._uiSynth.triggerAttackRelease("G5", "64n", now + 0.08);
  };

  public playModalClose = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    const now = Tone.now();
    // Downward swoop
    this._uiSynth.triggerAttackRelease("G5", "64n", now);
    this._uiSynth.triggerAttackRelease("E5", "64n", now + 0.04);
    this._uiSynth.triggerAttackRelease("C5", "64n", now + 0.08);
  };

  public updateFireVolume(distance: number): void {
    if (!this._fireVolume) return;

    // Max fire sound at 0-10m, fade out by 50m
    const maxDistance = 50;
    const minDistance = 10;

    if (distance <= minDistance) {
      this._fireVolume.volume.value = -10;
    } else if (distance >= maxDistance) {
      this._fireVolume.volume.value = -60;
    } else {
      // Logarithmic falloff for realistic spatial audio
      const normalized = (distance - minDistance) / (maxDistance - minDistance);
      this._fireVolume.volume.value = -10 - normalized * 50;
    }
  }

  public playRingtone = (): void => {
    if (!this._audioInitialized) return;

    if (this._ringtoneLoop) {
      this._ringtoneLoop.start(0);
      return;
    }

    // Catchy indie game ringtone - square wave for character
    this._ringtoneSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.2 },
    }).toDestination();
    this._ringtoneSynth.volume.value = -8;

    this._ringtoneLoop = new Tone.Loop((time) => {
      // Fun melodic ringtone pattern
      this._ringtoneSynth?.triggerAttackRelease("E6", "16n", time);
      this._ringtoneSynth?.triggerAttackRelease("G6", "16n", time + 0.12);
      this._ringtoneSynth?.triggerAttackRelease("E6", "16n", time + 0.24);
      this._ringtoneSynth?.triggerAttackRelease("C6", "8n", time + 0.36);
      this._ringtoneSynth?.triggerAttackRelease("D6", "16n", time + 0.6);
      this._ringtoneSynth?.triggerAttackRelease("E6", "8n", time + 0.72);
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
    if (this._fireNoise) {
      this._fireNoise.stop();
    }
  }

  public dispose(): void {
    this.stopBackgroundMusic();
    this.stopRingtone();
    Tone.Transport.stop();

    this._synth?.dispose();
    this._ringtoneSynth?.dispose();
    this._leadSynth?.dispose();
    this._bassSynth?.dispose();
    this._padSynth?.dispose();
    this._fireNoise?.dispose();
    this._fireVolume?.dispose();
    this._fireFilter?.dispose();
    this._fxSynth?.dispose();
    this._impactSynth?.dispose();
    this._uiSynth?.dispose();
  }
}
