import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  type EngineOptions,
  type IWebGPUEngineOptions,
  Camera,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { QuestManager } from "./managers/QuestManager";
import type { Quest } from "./quests/quests";
import { UIManager } from "./managers/UIManager";
import { AudioManager } from "./managers/AudioManager";
import { GameCamera } from "./camera";

type GameState =
  | "AWAITING_QUEST"
  | "PLAYING"
  | "SHOWING_INSTRUCTIONS"
  | "SHOWING_SUCCESS";

interface GameConfig {
  readonly gravity: Vector3;
  readonly initialQuestDelay: number;
  readonly questCompleteAnimationDelay: number;
}

const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: new Vector3(0, -9.81, 0),
  initialQuestDelay: 3000,
  questCompleteAnimationDelay: 2000,
};

export class Game {
  private readonly _engine: Engine;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _scene: Scene;
  private readonly _config: GameConfig;
  private readonly _questManager: QuestManager;
  private readonly _uiManager: UIManager;
  private readonly _audioManager: AudioManager;

  private _world: World;
  private _player: Player;
  private _camera: GameCamera;
  private _pendingQuest: Quest | null = null;
  private _gameState: GameState = "AWAITING_QUEST";
  private _isInCutscene = false;

  private constructor(
    engine: Engine,
    canvas: HTMLCanvasElement,
    config: Partial<GameConfig> = {}
  ) {
    this._engine = engine;
    this._canvas = canvas;
    this._scene = new Scene(this._engine);
    this._config = { ...DEFAULT_GAME_CONFIG, ...config };
    this._questManager = new QuestManager();
    this._uiManager = new UIManager();
    this._audioManager = new AudioManager();
  }

  public static async CreateAsync(
    canvas: HTMLCanvasElement,
    config?: Partial<GameConfig>
  ): Promise<Game> {
    const engine = await this._createEngine(canvas);
    return new Game(engine, canvas, config);
  }

  private static async _createEngine(
    canvas: HTMLCanvasElement
  ): Promise<Engine> {
    const engineOptions: EngineOptions & IWebGPUEngineOptions = {
      antialias: true,
      powerPreference: "high-performance",
    };

    if (await WebGPUEngine.IsSupportedAsync) {
      const engine = new WebGPUEngine(canvas, engineOptions);
      await engine.initAsync();
      return engine;
    }

    return new Engine(canvas, true, engineOptions);
  }

  public async run(): Promise<void> {
    this._setupAudioTrigger();
    await this._initializePhysics();
    await this._loadWorld();
    await this._setupPlayerAndCamera();
    this._setupCameras();
    this._setupUIAndListeners();
    this._initializeQuests();
    this._optimizeScene();
    this._startRenderLoop();
  }

  private _setupAudioTrigger(): void {
    this._canvas.addEventListener(
      "pointerdown",
      this._audioManager.initializeAudio,
      { once: true }
    );
  }

  private async _initializePhysics(): Promise<void> {
    const havokPlugin = await getHavokPlugin();
    this._scene.enablePhysics(this._config.gravity, havokPlugin);
  }

  private async _loadWorld(): Promise<void> {
    this._world = new World(this._scene);
    await this._world.load();
    await this._world.loadCyclist();
    this._world.createQuestFirePoints(this._questManager.getAllQuests());
  }

  private async _setupPlayerAndCamera(): Promise<void> {
    this._camera = new GameCamera(this._scene);
    this._player = new Player(this._scene, this._camera.camera);
    await this._player.load();
  }

  private _setupCameras(): void {
    this._scene.activeCamera = this._camera.camera;
  }

  private _optimizeScene(): void {
    this._scene.blockMaterialDirtyMechanism = true;
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._player.update();

      if (!this._isInCutscene) {
        this._camera.camera.target.copyFrom(this._player.capsule.position);
      }

      this._scene.render();
      this._updateQuestProgress();
    });

    window.addEventListener("resize", () => this._engine.resize());
  }


  private _setupUIAndListeners(): void {
    this._uiManager.setupListeners({
      onInfo: this._onInfoPressed,
      onMap: this._onMapPressed,
      onInstructionModalClose: this._onInstructionModalClosed,
      onPhoneModalClose: this._onPhoneModalClosed,
      onAnswerCall: this._onAnswerCall,
    });
  }

  private _initializeQuests(): void {
    const firstQuest = this._questManager.getAllQuests()[0];
    if (firstQuest) {
      setTimeout(() => {
        this._startQuest(firstQuest);
      }, this._config.initialQuestDelay);
    }
  }

  private _startQuest(quest: Quest): void {
    this._pendingQuest = quest;
    this._gameState = "SHOWING_INSTRUCTIONS";

    if (quest.trigger === "phonecall") {
      this._audioManager.playRingtone();
      this._uiManager.showPhoneCallModal(quest.caller ?? "Unknown");
    } else {
      this._uiManager.showInstructionModal("New Objective", quest.riddle);
    }
  }

  private _onInfoPressed = (): void => {
    const currentQuest = this._questManager.getCurrentQuest();
    if (currentQuest) {
      this._uiManager.showInstructionModal(
        currentQuest.caller ?? "Current Objective",
        currentQuest.riddle
      );
    }
  };

  private _onMapPressed = (): void => {
    if (this._camera.isMapView) {
      this._camera.switchToNormalView();
    } else {
      this._camera.switchToTopDownView();
    }
  };

  private _onAnswerCall = (): void => {
    this._audioManager.stopRingtone();
    this._uiManager.hidePhoneCallModal();
    if (this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller ?? "Objective",
        this._pendingQuest.riddle
      );
    }
  };

  private _onPhoneModalClosed = (): void => {
    this._audioManager.stopRingtone();
    if (this._gameState === "SHOWING_INSTRUCTIONS" && this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller ?? "Objective",
        this._pendingQuest.riddle
      );
    } else {
      this._gameState = "PLAYING";
    }
  };

  private _onInstructionModalClosed = (): void => {
    if (this._gameState === "SHOWING_INSTRUCTIONS") {
      this._handleInstructionsClosed();
    } else if (this._gameState === "SHOWING_SUCCESS") {
      this._handleQuestSuccess();
    }
  };

  private _handleInstructionsClosed(): void {
    if (this._pendingQuest) {
      this._questManager.activateQuestById(this._pendingQuest.id);
      this._onQuestAdvanced(this._pendingQuest);
      this._pendingQuest = null;
    }
    this._gameState = "PLAYING";
  }

  private _handleQuestSuccess(): void {
    const nextQuest = this._questManager.completeCurrentQuestAndGetNext();
    if (nextQuest) {
      this._startQuest(nextQuest);
    } else {
      this._showGameOver();
    }
  }

  private _showGameOver(): void {
    this._gameState = "AWAITING_QUEST";
    this._uiManager.showInstructionModal(
      "Game Over",
      "Congratulations! You have saved the city from the fire!"
    );
  }

  private _updateQuestProgress(): void {
    if (this._gameState !== "PLAYING") return;

    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) {
      this._uiManager.updateDistance(null);
      return;
    }

    const objectivePos = this._world.getFirePointPosition(currentQuest.id);
    if (!objectivePos) return;

    const playerPos = this._player.capsule.position;
    const distanceSquared = Vector3.DistanceSquared(playerPos, objectivePos);

    if (distanceSquared < 25) {
      this._completeActiveQuest(currentQuest);
    } else {
      this._uiManager.updateDistance(Math.sqrt(distanceSquared));
    }
  }

  private _completeActiveQuest(quest: Quest): void {
    this._gameState = "SHOWING_SUCCESS";
    this._audioManager.playQuestCompleteSound();
    this._uiManager.updateDistance(-1);

    if (quest.changeCameraTarget === "cyclist" && this._world.cyclistCamera) {
      this._showQuestCompleteWithCinematic(quest);
    } else {
      this._showQuestCompleteModal(quest);
    }
  }

  private _showQuestCompleteWithCinematic(quest: Quest): void {
    const cyclistMesh = this._scene.getMeshByName("cyclistRoot");
    if (!cyclistMesh) {
      this._showQuestCompleteModal(quest);
      return;
    }

    const playerPosition = this._player.capsule.position.clone();

    this._isInCutscene = true;
    this._world.animateCyclistToPosition(playerPosition, this._config.questCompleteAnimationDelay);
    this._camera.camera.setTarget(cyclistMesh.position);

    setTimeout(() => {
      this._showQuestCompleteModal(quest);
      this._world.disposeCyclist();
      this._isInCutscene = false;
    }, this._config.questCompleteAnimationDelay);
  }

  private _showQuestCompleteModal(quest: Quest): void {
    this._uiManager.showInstructionModal(
      "Quest Complete!",
      quest.successMessage
    );
  }

  private _onQuestAdvanced(currentQuest: Quest): void {
    this._world.hideAllFires();
    this._world.showFireAtPoint(currentQuest.id);
  }
}