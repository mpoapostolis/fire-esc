export class UIManager {
  // --- UI Elements ---
  private _hudDistance: HTMLElement;
  private _infoButton: HTMLElement;
  private _mapButton: HTMLElement;

  // Instruction Modal
  private _dialogueModal: any;
  private _dialogueSpeaker: HTMLElement;
  private _dialogueText: HTMLElement;

  // Phone Modal
  private _phoneCallModal: any;
  private _phoneCallerName: HTMLElement;
  private _answerCallBtn: HTMLElement;

  constructor() {
    this._hudDistance = this._getUIElement("hud-distance");
    this._infoButton = this._getUIElement("info-button");
    this._mapButton = this._getUIElement("map-button");

    this._dialogueModal = this._getUIElement("dialogue_modal");
    this._dialogueSpeaker = this._getUIElement("dialogue-speaker");
    this._dialogueText = this._getUIElement("dialogue-text");

    this._phoneCallModal = this._getUIElement("phone_call_modal");
    this._phoneCallerName = this._getUIElement("phone-caller-name");
    this._answerCallBtn = this._getUIElement("answer-call-btn");
  }

  private _getUIElement = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`UI element with id "${id}" not found.`);
    return element as T;
  };

  public setupListeners(callbacks: {
    onInfo: () => void;
    onMap: () => void;
    onInstructionModalClose: () => void;
    onPhoneModalClose: () => void;
    onAnswerCall: () => void;
  }) {
    this._infoButton.addEventListener("click", callbacks.onInfo);
    this._mapButton.addEventListener("click", callbacks.onMap);
    this._dialogueModal.addEventListener(
      "close",
      callbacks.onInstructionModalClose
    );
    this._phoneCallModal.addEventListener("close", callbacks.onPhoneModalClose);
    this._answerCallBtn.addEventListener("click", callbacks.onAnswerCall);
  }

  public showInstructionModal(speaker: string, text: string) {
    this._dialogueSpeaker.innerText = speaker;
    this._dialogueText.innerText = text;
    this._dialogueModal.showModal();
  }

  public showPhoneCallModal(caller: string) {
    this._phoneCallerName.innerText = caller;
    this._phoneCallModal.showModal();
  }

  public hidePhoneCallModal() {
    this._phoneCallModal.close();
  }

  public updateDistance(distance: number | null) {
    if (distance === null) {
      this._hudDistance.innerText = "No objective";
    } else if (distance < 0) {
      this._hudDistance.innerText = "✓";
    } else {
      this._hudDistance.innerText = `${distance.toFixed(0)}m`;
    }
  }
}
