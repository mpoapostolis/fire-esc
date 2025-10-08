import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  type EngineOptions,
  type IWebGPUEngineOptions,
  Matrix,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { QuestManager } from "./managers/QuestManager";
import type { Quest } from "./quests/quests";
import { UIManager } from "./managers/UIManager";
import { AudioManager } from "./managers/AudioManager";

type GameState =
  | "AWAITING_QUEST"
  | "PLAYING"
  | "SHOWING_INSTRUCTIONS"
  | "SHOWING_SUCCESS";

export class Game {
  private _scene: Scene;
  private _engine: Engine;
  private _canvas: HTMLCanvasElement;
  private _world: World;
  private _player: Player;
  private _questManager: QuestManager;
  private _uiManager: UIManager;
  private _audioManager: AudioManager;

  private _pendingQuest: Quest | null = null;
  private _missedCall: Quest | null = null;
  private _gameState: GameState = "AWAITING_QUEST";

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this._engine = engine;
    this._canvas = canvas;
    this._scene = new Scene(this._engine);
    this._questManager = new QuestManager();
    this._uiManager = new UIManager();
    this._audioManager = new AudioManager();
  }

  public static async CreateAsync(canvas: HTMLCanvasElement): Promise<Game> {
    const engineOptions: EngineOptions & IWebGPUEngineOptions = {
      antialias: true,
      powerPreference: "high-performance",
    };
    let engine: Engine;
    if (await WebGPUEngine.IsSupportedAsync) {
      engine = new WebGPUEngine(canvas, engineOptions);
      await (engine as WebGPUEngine).initAsync();
    } else {
      engine = new Engine(canvas, true, engineOptions);
    }
    return new Game(engine, canvas);
  }

  public async run(): Promise<void> {
    this._canvas.addEventListener(
      "pointerdown",
      this._audioManager.initializeAudio,
      {
        once: true,
      }
    );
    const havokPlugin = await getHavokPlugin();
    this._scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

    this._world = new World(this._scene);
    await this._world.load();
    this._world.createQuestFirePoints(this._questManager.getAllQuests());

    this._player = new Player(this._scene, this._world.camera);
    await this._player.load();

    this._setupUIAndListeners();
    this.initializeQuests();

    this._scene.blockMaterialDirtyMechanism = true;

    this._engine.runRenderLoop(() => {
      this._player.update();
      this._scene.render();
      this._updateQuestProgress();
    });
    window.addEventListener("resize", () => this._engine.resize());
  }

  private _setupUIAndListeners = (): void => {
    this._uiManager.setupListeners({
      onInfo: this.onInfoPressed,
      onMap: () => alert("Map is coming soon!"),
      onInstructionModalClose: this.onInstructionModalClosed,
      onPhoneModalClose: this.onPhoneModalClosed,
      onAnswerCall: this.onAnswerCall,
    });
  };

  private initializeQuests = (): void => {
    const firstQuest = this._questManager.getAllQuests()[0];
    if (firstQuest) {
      setTimeout(() => {
        this.startQuest(firstQuest);
      }, 3000); // 3-second delay for realism
    }
  };

  private startQuest(quest: Quest) {
    this._pendingQuest = quest;
    this._gameState = "SHOWING_INSTRUCTIONS";

    if (quest.trigger === "phonecall") {
      this._audioManager.playRingtone();
      this._uiManager.showPhoneCallModal(quest.caller || "Unknown");
    } else {
      this._uiManager.showInstructionModal("New Objective", quest.riddle);
    }
  }

  private onInfoPressed = () => {
    const currentQuest = this._questManager.getCurrentQuest();
    if (currentQuest) {
      this._uiManager.showInstructionModal(
        currentQuest.caller || "Current Objective",
        currentQuest.riddle
      );
    }
  };

  private onAnswerCall = () => {
    this._audioManager.stopRingtone();
    this._uiManager.hidePhoneCallModal();
    if (this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller || "Objective",
        this._pendingQuest.riddle
      );
    }
  };

  private onPhoneModalClosed = () => {
    this._audioManager.stopRingtone();
    // If the modal was closed while a quest was pending, just show the instructions for it.
    if (this._gameState === "SHOWING_INSTRUCTIONS" && this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller || "Objective",
        this._pendingQuest.riddle
      );
    } else {
      // If no quest was pending, just go back to playing.
      this._gameState = "PLAYING";
    }
  };

  private onInstructionModalClosed = () => {
    if (this._gameState === "SHOWING_INSTRUCTIONS") {
      if (this._pendingQuest) {
        this._questManager.activateQuestById(this._pendingQuest.id);
        this.onQuestAdvanced(this._pendingQuest);
        this._pendingQuest = null;
      }
      this._gameState = "PLAYING";
    } else if (this._gameState === "SHOWING_SUCCESS") {
      const nextQuest = this._questManager.completeCurrentQuestAndGetNext();
      if (nextQuest) {
        this.startQuest(nextQuest);
      } else {
        this._gameState = "AWAITING_QUEST"; // Game over
        this._uiManager.showInstructionModal(
          "Game Over",
          "Congratulations! You have saved the city from the fire!"
        );
      }
    }
  };

  private _updateQuestProgress = (): void => {
    if (this._gameState !== "PLAYING") {
      return;
    }

    const currentQuest = this._questManager.getCurrentQuest();
    if (currentQuest) {
      const objectivePos = this._world.getFirePointPosition(currentQuest.id);
      if (objectivePos) {
        const playerPos = this._player.capsule.position;
        const distance = Vector3.DistanceSquared(playerPos, objectivePos);
        if (distance < 25) {
          this.completeActiveQuest(currentQuest);
        } else {
          this._uiManager.updateDistance(Math.sqrt(distance));
        }
      }
    } else {
      this._uiManager.updateDistance(null);
    }
  };

  private completeActiveQuest = (quest: Quest): void => {
    this._gameState = "SHOWING_SUCCESS";
    this._audioManager.playQuestCompleteSound();
    this._uiManager.updateDistance(-1);
    const q = this._questManager.getCurrentQuest();
    if (q?.cinematicTarget) {
    }
    this._uiManager.showInstructionModal(
      "Quest Complete!",
      quest.successMessage
    );
  };

  private onQuestAdvanced = (currentQuest: Quest | null): void => {
    this._world.hideAllFires();
    if (currentQuest) {
      this._world.showFireAtPoint(currentQuest.id);
    }
  };
}
