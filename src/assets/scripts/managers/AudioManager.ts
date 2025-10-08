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
    // Lead
    const leadReverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
    this._leadSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    }).connect(leadReverb);
    this._leadSynth.volume.value = -18;

    // Bass
    this._bassSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.5 },
    }).toDestination();
    this._bassSynth.volume.value = -20;

    // Pads
    const padReverb = new Tone.Reverb({ decay: 3, wet: 0.4 }).toDestination();
    this._padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.7, release: 1 },
    }).connect(padReverb);
    this._padSynth.volume.value = -22;

    // Subtle fire crackling
    this._fireVolume = new Tone.Volume(-50).toDestination();
    this._fireFilter = new Tone.Filter(600, "lowpass").connect(
      this._fireVolume
    );
    const fireFilter2 = new Tone.Filter(200, "highpass").connect(
      this._fireFilter
    );
    this._fireNoise = new Tone.Noise("pink").connect(fireFilter2);
    this._fireNoise.start();

    // Soft UI click
    this._uiSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.2 },
    }).toDestination();
    this._uiSynth.volume.value = -18;

    // Gentle sound effects synth
    this._fxSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 1 },
    }).toDestination();
    this._fxSynth.volume.value = -20;

    // Soft impact synth
    this._impactSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 1 },
    }).toDestination();
    this._impactSynth.volume.value = -18;
  }

  private _startBackgroundMusic(): void {
    if (!this._leadSynth || !this._bassSynth || !this._padSynth) return;

    // Simple calm melody
    const melody = [
      "C5", null, null, "E5", null, null, "G5", null,
      null, null, "E5", null, null, null, null, null,
      "D5", null, null, "F5", null, null, "A5", null,
      null, null, "F5", null, null, null, null, null,
      "E5", null, null, "G5", null, null, "C6", null,
      null, null, "G5", null, null, null, null, null,
      "D5", null, null, "G5", null, null, "B4", null,
      null, null, "C5", null, null, null, null, null
    ];

    // Simple bass
    const bassLine = [
      "C2", null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null,
      "F2", null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null,
      "C2", null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null,
      "G2", null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null
    ];

    // Simple chords
    const chords = [
      ["C3", "E3", "G3"],
      ["F3", "A3", "C4"],
      ["C3", "E3", "G3"],
      ["G3", "B3", "D4"]
    ];

    let melodyIndex = 0;
    let bassIndex = 0;
    let chordIndex = 0;

    this._backgroundMusicLoop = new Tone.Loop((time) => {
      // Calm melody
      const note = melody[melodyIndex];
      if (note) {
        this._leadSynth?.triggerAttackRelease(note, "4n", time);
      }
      melodyIndex = (melodyIndex + 1) % melody.length;

      // Gentle bass
      const bassNote = bassLine[bassIndex];
      if (bassNote) {
        this._bassSynth?.triggerAttackRelease(bassNote, "2n", time);
      }
      bassIndex = (bassIndex + 1) % bassLine.length;

      // Soft pads
      if (melodyIndex % 16 === 0) {
        this._padSynth?.triggerAttackRelease(chords[chordIndex], "4m", time);
        chordIndex = (chordIndex + 1) % chords.length;
      }
    }, "16n");

    this._backgroundMusicLoop.start(0);
    Tone.Transport.bpm.value = 70; // Calm tempo
    Tone.Transport.start();
  }

  public playQuestCompleteSound = (): void => {
    if (!this._audioInitialized || !this._fxSynth || !this._impactSynth) return;

    const now = Tone.now();

    // Victory fanfare with ascending notes
    const melody = ["C4", "E4", "G4", "C5"];
    melody.forEach((note, i) => {
      this._fxSynth?.triggerAttackRelease(note, "16n", now + i * 0.15);
    });

    // Bass hit for impact
    this._impactSynth.triggerAttackRelease("C2", "8n", now);

    // Final high note
    this._fxSynth?.triggerAttackRelease("E5", "4n", now + 0.6);
  };

  public playButtonClick = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    this._uiSynth.triggerAttackRelease("C5", "32n");
  };

  public playModalOpen = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    const now = Tone.now();
    this._uiSynth.triggerAttackRelease("E5", "64n", now);
    this._uiSynth.triggerAttackRelease("G5", "64n", now + 0.05);
  };

  public playModalClose = (): void => {
    if (!this._audioInitialized || !this._uiSynth) return;
    const now = Tone.now();
    this._uiSynth.triggerAttackRelease("G5", "64n", now);
    this._uiSynth.triggerAttackRelease("E5", "64n", now + 0.05);
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

    // Modern ringtone sound with vibrato
    this._ringtoneSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2 },
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
