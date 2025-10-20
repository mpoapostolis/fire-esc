import type { AudioManager } from "./AudioManager";
import { t } from "../i18n";

export class UIManager {
  // --- UI Elements ---
  private _hudDistance: HTMLElement;
  private _hudTimer: HTMLElement;
  private _infoButton: HTMLElement;
  private _helpButton: HTMLElement;
  private _mapButton: HTMLElement;
  private _waypoint: HTMLElement;
  private _compassNeedle: HTMLElement;

  // Instruction Modal
  private _infoModal: any;
  private _dialogueModal: any;
  private _dialogueSpeaker: HTMLElement;
  private _dialogueText: HTMLElement;

  // Phone Modal
  private _phoneCallModal: any;
  private _phoneCallerName: HTMLElement;
  private _answerCallBtn: HTMLElement;

  private _audioManager: AudioManager | null = null;

  // GAME JUICE!
  private _score: number = 0;
  private _comboMultiplier: number = 1;
  private _scoreDisplay: HTMLElement | null = null;

  constructor() {
    this._hudDistance = this._getUIElement("hud-distance");
    this._hudTimer = this._getUIElement("hud-timer");
    this._infoButton = this._getUIElement("info-button");
    this._helpButton = this._getUIElement("help-button");
    this._mapButton = this._getUIElement("map-button");
    this._waypoint = this._getUIElement("waypoint");
    this._compassNeedle = this._getUIElement("compass-needle");

    this._infoModal = this._getUIElement("info-modal");
    this._dialogueModal = this._getUIElement("dialogue_modal");
    this._dialogueSpeaker = this._getUIElement("dialogue-speaker");
    this._dialogueText = this._getUIElement("dialogue-text");

    this._phoneCallModal = this._getUIElement("phone_call_modal");
    this._phoneCallerName = this._getUIElement("phone-caller-name");
    this._answerCallBtn = this._getUIElement("answer-call-btn");
  }

  public setAudioManager(audioManager: AudioManager): void {
    this._audioManager = audioManager;
  }

  private _getUIElement = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`UI element with id "${id}" not found.`);
    return element as T;
  };

  public setupListeners(callbacks: {
    onInfo: () => void;
    onHelp: () => void;
    onMap: () => void;
    onInstructionModalClose: () => void;
    onPhoneModalClose: () => void;
    onAnswerCall: () => void;
  }) {
    this._infoButton.addEventListener("click", () => {
      this._audioManager?.playButtonClick();
      callbacks.onInfo();
    });

    this._helpButton.addEventListener("click", () => {
      this._audioManager?.playButtonClick();
      callbacks.onHelp();
    });

    this._mapButton.addEventListener("click", () => {
      this._audioManager?.playButtonClick();
      callbacks.onMap();
    });

    this._dialogueModal.addEventListener("close", callbacks.onInstructionModalClose);
    this._phoneCallModal.addEventListener("close", callbacks.onPhoneModalClose);

    this._answerCallBtn.addEventListener("click", () => {
      this._audioManager?.playButtonClick();
      callbacks.onAnswerCall();
    });
  }

  public showInstructionModal(speaker: string, text: string) {
    this._dialogueSpeaker.innerText = speaker;
    this._dialogueText.innerText = text;
    this._dialogueModal.showModal();
  }

  public showInfoModal() {
    this._infoModal.showModal();
  }

  public showPhoneCallModal(caller: string) {
    this._phoneCallerName.innerText = caller;
    this._phoneCallModal.showModal();
  }

  public hidePhoneCallModal() {
    this._phoneCallModal.close();
  }

  public updateWaypoint(position: { x: number; y: number } | null) {
    if (position) {
      this._waypoint.classList.remove("hidden");
      this._waypoint.style.left = `${position.x}px`;
      this._waypoint.style.top = `${position.y}px`;
    } else {
      this._waypoint.classList.add("hidden");
    }
  }

  public updateDistance(distance: number | null) {
    if (distance === null) {
      this._hudDistance.innerText = t("ui.status.noObjective");
    } else if (distance < 0) {
      this._hudDistance.innerText = t("ui.status.completed");
    } else {
      this._hudDistance.innerText = t("ui.status.distanceFormat", { distance: distance.toFixed(0) });
    }
  }

  public updateTimer(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this._hudTimer.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Change color when time is running out (less than 30 seconds)
    if (totalSeconds < 30) {
      this._hudTimer.classList.add('text-red-400');
    } else {
      this._hudTimer.classList.remove('text-red-400');
    }
  }

  public updateCompass(rotationY: number) {
    // Convert camera rotation (in radians) to degrees
    // Babylon uses Y-axis rotation where 0 is facing +Z, rotating CCW
    // We need to convert this to compass bearing where 0° is North
    const degrees = (rotationY * 180 / Math.PI) % 360;

    // Rotate the needle (negative because CSS rotates clockwise, compass bearing is clockwise from North)
    this._compassNeedle.style.transform = `rotate(${degrees}deg)`;
  }

  // ========== GAME JUICE METHODS ========== //

  /**
   * Screen shake effect - pure game juice!
   */
  public screenShake(intensity: number = 10, duration: number = 300): void {
    const canvas = document.getElementById('renderCanvas');
    if (!canvas) return;

    const startTime = Date.now();
    const originalTransform = canvas.style.transform;

    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        canvas.style.transform = originalTransform;
        return;
      }

      const progress = 1 - (elapsed / duration); // Fade out
      const x = (Math.random() - 0.5) * intensity * progress;
      const y = (Math.random() - 0.5) * intensity * progress;
      canvas.style.transform = `translate(${x}px, ${y}px)`;

      requestAnimationFrame(shake);
    };

    shake();
  }

  /**
   * Show floating score popup
   */
  public showScorePopup(points: number, x: number, y: number): void {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      font-size: 48px;
      font-weight: bold;
      color: #fbbf24;
      text-shadow: 0 0 20px rgba(251, 191, 36, 0.8),
                   2px 2px 4px rgba(0, 0, 0, 0.9);
      pointer-events: none;
      z-index: 9999;
      animation: scoreFloat 1.5s ease-out forwards;
    `;

    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 1500);
  }

  /**
   * Show HUGE combo multiplier text
   */
  public showComboMultiplier(multiplier: number): void {
    const combo = document.createElement('div');
    combo.className = 'combo-multiplier';
    combo.innerHTML = `<div style="font-size: 32px;">COMBO</div><div style="font-size: 64px;">x${multiplier}</div>`;
    combo.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-weight: bold;
      color: #ff6b35;
      text-shadow: 0 0 30px rgba(255, 107, 53, 1),
                   3px 3px 6px rgba(0, 0, 0, 1);
      pointer-events: none;
      z-index: 9999;
      animation: comboZoom 1s ease-out forwards;
      text-align: center;
    `;

    document.body.appendChild(combo);
    setTimeout(() => combo.remove(), 1000);
  }

  /**
   * Pulse an element for attention
   */
  public pulseElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.animation = 'pulse 0.5s ease-in-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);
  }

  /**
   * Flash screen with color (damage, success, etc.)
   */
  public flashScreen(color: string = 'rgba(255, 255, 255, 0.3)', duration: number = 200): void {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${color};
      pointer-events: none;
      z-index: 9998;
      animation: fadeOut ${duration}ms ease-out forwards;
    `;

    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), duration);
  }

  /**
   * Show dramatic countdown warning
   */
  public showCountdownWarning(): void {
    this._hudTimer.style.animation = 'pulse 1s ease-in-out infinite';
    this.flashScreen('rgba(255, 0, 0, 0.2)', 500);
  }

  /**
   * Add confetti celebration effect
   */
  public celebrateSuccess(): void {
    // Create multiple confetti pieces
    for (let i = 0; i < 50; i++) {
      setTimeout(() => this._createConfetti(), i * 20);
    }

    // Flash green for success
    this.flashScreen('rgba(0, 255, 100, 0.3)', 300);
  }

  private _createConfetti(): void {
    const confetti = document.createElement('div');
    const colors = ['#fbbf24', '#ff6b35', '#f72585', '#4cc9f0', '#4ade80'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${randomColor};
      left: ${Math.random() * 100}vw;
      top: -20px;
      pointer-events: none;
      z-index: 9999;
      animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;

    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }

  /**
   * Add score and show it
   */
  public addScore(basePoints: number, questNumber: number): void {
    const points = basePoints * this._comboMultiplier;
    this._score += points;
    this._comboMultiplier++;

    // Show score popup in center
    this.showScorePopup(points, window.innerWidth / 2, window.innerHeight / 2);

    if (this._comboMultiplier > 1) {
      setTimeout(() => this.showComboMultiplier(this._comboMultiplier), 300);
    }
  }

  /**
   * Get current score
   */
  public getScore(): number {
    return this._score;
  }

  /**
   * Reset combo multiplier
   */
  public resetCombo(): void {
    this._comboMultiplier = 1;
  }
}
