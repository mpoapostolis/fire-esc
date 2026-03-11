import type { AudioManager } from "./AudioManager";
import { t } from "../i18n";

export class UIManager {
  // --- UI Elements ---
  private _hudDistance: HTMLElement;
  private _hudTimer: HTMLElement;
  private _infoButton: HTMLElement;
  private _helpButton: HTMLElement;
  private _mapButton: HTMLElement;
  private _hudTopBar: HTMLElement;
  private _hudBottomBar: HTMLElement;

  // Instruction Modal
  private _infoModal: any;
  private _dialogueModal: any;
  private _dialogueSpeaker: HTMLElement;
  private _dialogueText: HTMLElement;
  private _dialogueUrgent: HTMLElement;

  // Phone Modal
  private _phoneCallModal: any;
  private _phoneCallerName: HTMLElement;
  private _answerCallBtn: HTMLElement;

  private _audioManager: AudioManager | null = null;

  // Quiz Modal
  private _quizModal: any;
  private _quizQuestion: HTMLElement;
  private _quizOptions: HTMLElement;
  private _quizRiddle: HTMLElement;

  // Thermometer Modal
  private _thermometerModal: any;

  // Proximity panel
  private _proximityPanel: HTMLElement;
  private _proximityRiddleText: HTMLElement;

  constructor() {
    this._hudDistance = this._getUIElement("hud-distance");
    this._hudTimer = this._getUIElement("hud-timer");
    this._infoButton = this._getUIElement("info-button");
    this._helpButton = this._getUIElement("help-button");
    this._mapButton = this._getUIElement("map-button");
    this._hudTopBar = this._getUIElement("hud-top-bar");
    this._hudBottomBar = this._getUIElement("hud-bottom-bar");

    this._infoModal = this._getUIElement("info-modal");
    this._dialogueModal = this._getUIElement("dialogue_modal");
    this._dialogueSpeaker = this._getUIElement("dialogue-speaker");
    this._dialogueText = this._getUIElement("dialogue-text");
    this._dialogueUrgent = this._getUIElement("dialogue-urgent");

    this._phoneCallModal = this._getUIElement("phone_call_modal");
    this._phoneCallerName = this._getUIElement("phone-caller-name");
    this._answerCallBtn = this._getUIElement("answer-call-btn");

    this._quizModal = this._getUIElement("quiz_modal");
    this._quizQuestion = this._getUIElement("quiz-question");
    this._quizOptions = this._getUIElement("quiz-options");
    this._quizRiddle = this._getUIElement("quiz-riddle");

    this._thermometerModal = this._getUIElement("thermometer_modal");
    this._proximityPanel = this._getUIElement("proximity-panel");
    this._proximityRiddleText = this._getUIElement("proximity-riddle-text");
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
    onHelpModalClose?: () => void;
    onThermometerModalClose?: () => void;
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

    this._dialogueModal.addEventListener(
      "close",
      callbacks.onInstructionModalClose,
    );
    this._phoneCallModal.addEventListener("close", callbacks.onPhoneModalClose);

    if (callbacks.onHelpModalClose) {
      this._infoModal.addEventListener("close", callbacks.onHelpModalClose);
    }

    if (callbacks.onThermometerModalClose) {
      this._thermometerModal.addEventListener(
        "close",
        callbacks.onThermometerModalClose,
      );
    }

    this._answerCallBtn.addEventListener("click", () => {
      this._audioManager?.playButtonClick();
      callbacks.onAnswerCall();
    });
  }

  public showInstructionModal(speaker: string, text: string, showUrgent = true) {
    this._dialogueSpeaker.innerText = speaker;
    this._dialogueText.innerText = text;
    this._dialogueUrgent.style.display = showUrgent ? "" : "none";
    this._dialogueModal.showModal();
  }

  public showInfoModal() {
    this._infoModal.showModal();
  }

  public showGameHUD() {
    this._hudTopBar.style.display = "flex";
    this._hudBottomBar.style.display = "flex";
  }

  public showPhoneCallModal(caller: string) {
    this._phoneCallerName.innerText = caller;
    this._phoneCallModal.showModal();
  }

  public hidePhoneCallModal() {
    this._phoneCallModal.close();
  }

  public showProximityPanel(riddle: string): void {
    this._proximityRiddleText.innerText = riddle;
    this._proximityPanel.style.display = "block";
  }

  public hideProximityPanel(): void {
    this._proximityPanel.style.display = "none";
  }

  public showQuizModal(
    question: string,
    options: string[],
    onSelect: (index: number) => void,
    riddle?: string,
  ) {
    this._quizQuestion.innerText = question;
    this._quizOptions.innerHTML = "";

    if (riddle) {
      this._quizRiddle.innerHTML = `<div class="quiz-riddle-tag">📖 ΓΡΙΦΟΣ</div>`;
      this._quizRiddle.appendChild(document.createTextNode(riddle));
      this._quizRiddle.classList.remove("hidden");
    } else {
      this._quizRiddle.classList.add("hidden");
    }

    options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option-btn";
      btn.innerHTML = `
        <span class="quiz-option-letter">${index + 1}</span>
        <span class="quiz-option-text">${option}</span>
      `;

      btn.onclick = () => {
        this._audioManager?.playButtonClick();
        onSelect(index);
      };
      this._quizOptions.appendChild(btn);
    });

    this._quizModal.showModal();
  }

  public hideQuizModal() {
    this._quizModal.close();
  }

  public updateDistance(distance: number | null) {
    if (distance === null) {
      this._hudDistance.innerText = t("ui.status.noObjective");
    } else if (distance < 0) {
      this._hudDistance.innerText = t("ui.status.completed");
    } else {
      this._hudDistance.innerText = t("ui.status.distanceFormat", {
        distance: distance.toFixed(0),
      });
    }
  }

  public updateTimer(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this._hudTimer.innerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Change color when time is running out (less than 30 seconds)
    if (totalSeconds < 30) {
      this._hudTimer.classList.add("text-red-400");
    } else {
      this._hudTimer.classList.remove("text-red-400");
    }
  }

  public updateCompass(rotationY: number) {
    // Compass removed per user request
  }

  public showThermometerModal() {
    this._thermometerModal.showModal();
  }

  public hideThermometerModal() {
    this._thermometerModal.close();
  }
}
