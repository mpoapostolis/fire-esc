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
  readonly questTimeLimit: number;
  readonly cityModel?: string;
}

const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: new Vector3(0, -9.81, 0),
  initialQuestDelay: 3000,
  questCompleteAnimationDelay: 2000,
  questTimeLimit: 120000, // 2 minutes per quest
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
  private _questTimer: number | null = null;
  private _questStartTime: number = 0;

  // Cached values for performance
  private readonly _reusableVector = new Vector3();
  private _cachedCurrentQuest: Quest | null = null;
  private _cachedObjectivePos: Vector3 | null = null;

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
    this._world.setupPostProcessing();
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
    const worldConfig = this._config.cityModel
      ? { cityModel: this._config.cityModel }
      : {};
    this._world = new World(this._scene, worldConfig);
    await this._world.load();
    await this._world.loadCyclist();
    this._world.createQuestFirePoints(this._questManager.getAllQuests());
    this._world.createTeleportButtons(this._questManager.getAllQuests());
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
    this._scene.skipPointerMovePicking = true;
    this._scene.autoClear = false;
    this._scene.autoClearDepthAndStencil = false;
    this._scene.cleanCachedTextureBuffer();
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._player.update();

      // Follow player in normal view, but FIXED in map view
      if (!this._isInCutscene && !this._camera.isMapView) {
        this._camera.camera.target.copyFrom(this._player.capsule.position);
      }

      this._scene.render();
      this._updateQuestProgress();
    });

    window.addEventListener("resize", () => this._engine.resize());
  }

  private _setupUIAndListeners(): void {
    this._uiManager.setAudioManager(this._audioManager);
    this._uiManager.setupListeners({
      onInfo: this._onInfoPressed,
      onMap: this._onMapPressed,
      onInstructionModalClose: this._onInstructionModalClosed,
      onPhoneModalClose: this._onPhoneModalClosed,
      onAnswerCall: this._onAnswerCall,
    });

    // Setup click teleport for map view
    this._scene.onPointerDown = (evt, pickInfo) => {
      if (this._camera.isMapView && pickInfo.hit && pickInfo.pickedMesh) {
        // Check if clicked on a teleport button
        const meshName = pickInfo.pickedMesh.name;
        if (meshName.startsWith('teleportButton-') || meshName.startsWith('numberLabel-')) {
          // Extract quest ID from mesh name
          const questId = parseInt(meshName.split('-')[1]);
          const firePos = this._world.getFirePointPosition(questId);
          if (firePos) {
            const targetPos = firePos.clone();
            targetPos.y = 3;
            this._player.capsule.position.copyFrom(targetPos);
            this._audioManager.playButtonClick();

            // Exit map view and return to normal world view
            this._camera.switchToNormalView();
            this._player.hideMarker();
            this._player.enableControls();
            this._world.setFiresVisible(true);
            this._world.setTeleportButtonsVisible(false);
          }
        }
      }
    };
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
      // Exit map view
      this._camera.switchToNormalView();
      this._player.hideMarker();
      this._player.enableControls();
      this._world.setFiresVisible(true);
      this._world.setTeleportButtonsVisible(false);
    } else {
      // Enter map view
      this._camera.switchToTopDownView();
      this._player.showMarker();
      this._player.disableControls();
      this._world.setFiresVisible(false);
      this._world.setTeleportButtonsVisible(true);
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
      this._startQuestTimer();
    }
    this._gameState = "PLAYING";
  }

  private _handleQuestSuccess(): void {
    this._stopQuestTimer();
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

    // Update timer
    const remainingTime = this._getRemainingTime();
    this._uiManager.updateTimer(remainingTime);

    // Cache current quest to avoid multiple lookups
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) {
      this._uiManager.updateDistance(null);
      this._cachedCurrentQuest = null;
      this._cachedObjectivePos = null;
      return;
    }

    // Update cache only when quest changes
    if (this._cachedCurrentQuest?.id !== currentQuest.id) {
      this._cachedCurrentQuest = currentQuest;
      this._cachedObjectivePos = this._world.getFirePointPosition(currentQuest.id);
    }

    if (!this._cachedObjectivePos) return;

    const playerPos = this._player.capsule.position;
    const distanceSquared = Vector3.DistanceSquared(playerPos, this._cachedObjectivePos);

    // Update fire sound volume based on distance (use squared distance to avoid sqrt)
    const distance = Math.sqrt(distanceSquared);
    this._audioManager.updateFireVolume(distance);

    if (distanceSquared < 25) {
      this._completeActiveQuest(currentQuest);
    } else {
      this._uiManager.updateDistance(distance);
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
    this._world.animateCyclistToPosition(
      playerPosition,
      this._config.questCompleteAnimationDelay
    );
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

  private _startQuestTimer(): void {
    this._stopQuestTimer();
    this._questStartTime = Date.now();
    this._questTimer = window.setTimeout(() => {
      this._onQuestTimerExpired();
    }, this._config.questTimeLimit);
  }

  private _stopQuestTimer(): void {
    if (this._questTimer !== null) {
      clearTimeout(this._questTimer);
      this._questTimer = null;
    }
  }

  private _onQuestTimerExpired(): void {
    this._gameState = "AWAITING_QUEST";
    this._uiManager.showInstructionModal(
      "Time's Up!",
      "You ran out of time! Click 'Try Again' to restart."
    );

    // Add try again button handler
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  private _getRemainingTime(): number {
    if (this._questStartTime === 0) return this._config.questTimeLimit;
    const elapsed = Date.now() - this._questStartTime;
    return Math.max(0, this._config.questTimeLimit - elapsed);
  }
}
