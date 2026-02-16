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

  // Phone Modal
  private _phoneCallModal: any;
  private _phoneCallerName: HTMLElement;
  private _answerCallBtn: HTMLElement;

  private _audioManager: AudioManager | null = null;

  // Quiz Modal
  private _quizModal: any;
  private _quizQuestion: HTMLElement;
  private _quizOptions: HTMLElement;

  // Thermometer Modal
  private _thermometerModal: any;

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

    this._phoneCallModal = this._getUIElement("phone_call_modal");
    this._phoneCallerName = this._getUIElement("phone-caller-name");
    this._answerCallBtn = this._getUIElement("answer-call-btn");

    this._quizModal = this._getUIElement("quiz_modal");
    this._quizQuestion = this._getUIElement("quiz-question");
    this._quizOptions = this._getUIElement("quiz-options");

    this._thermometerModal = this._getUIElement("thermometer_modal");
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

  public showInstructionModal(speaker: string, text: string) {
    this._dialogueSpeaker.innerText = speaker;
    this._dialogueText.innerText = text;
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

  public showQuizModal(
    question: string,
    options: string[],
    onSelect: (index: number) => void,
  ) {
    this._quizQuestion.innerText = question;
    this._quizOptions.innerHTML = "";

    const optionLetters = ["A", "B", "C", "D", "E", "F"];

    options.forEach((option, index) => {
      const btn = document.createElement("button");
      // New Tech/Tactical Style
      btn.className =
        "group relative w-full text-left p-4 bg-slate-900/50 border border-white/10 hover:border-blue-500 hover:bg-slate-800 transition-all duration-200 flex items-start gap-4";

      btn.innerHTML = `
        <div class="flex-shrink-0 w-6 h-6 rounded bg-slate-800 border border-white/20 flex items-center justify-center font-mono text-xs font-bold text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
          ${optionLetters[index] || index + 1}
        </div>
        <span class="text-sm md:text-base text-slate-300 group-hover:text-white leading-relaxed font-light">${option}</span>
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
