import * as Tone from "tone";

export class AudioManager {
  private _audioInitialized: boolean = false;
  private _synth: any;
  private _ringtoneLoop: Tone.Loop | null = null;

  constructor() {
    this._synth = new Tone.Synth().toDestination();
  }

  public initializeAudio = (): void => {
    if (!this._audioInitialized) {
      Tone.start();
      this._audioInitialized = true;
      console.log("Audio context started.");
    }
  };

  public playQuestCompleteSound = (): void => {
    if (!this._audioInitialized || !this._synth) return;
    const now = Tone.now();
    this._synth.triggerAttackRelease("C4", "8n", now);
    this._synth.triggerAttackRelease("E4", "8n", now + 0.2);
    this._synth.triggerAttackRelease("G4", "8n", now + 0.4);
  };

  public playRingtone = (): void => {
    if (!this._audioInitialized) return;
    if (this._ringtoneLoop) {
      this._ringtoneLoop.start(0);
      Tone.Transport.start();
      return;
    }

    const ringtoneSynth = new Tone.Synth().toDestination();
    this._ringtoneLoop = new Tone.Loop((time) => {
      ringtoneSynth.triggerAttackRelease("G5", "8n", time);
      ringtoneSynth.triggerAttackRelease("E5", "8n", time + 0.5);
    }, "2s"); // A two-second loop

    this._ringtoneLoop.start(0);
    Tone.Transport.start();
  };

  public stopRingtone = (): void => {
    if (this._ringtoneLoop) {
      this._ringtoneLoop.stop(0);
      Tone.Transport.stop();
    }
  };
}