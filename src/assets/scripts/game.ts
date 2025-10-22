import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  type EngineOptions,
  type IWebGPUEngineOptions,
  Camera,
  PointerEventTypes,
  type PickingInfo,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { QuestManager } from "./managers/QuestManager";
import type { Quest } from "./quests/quests";
import { UIManager } from "./managers/UIManager";
import { AudioManager } from "./managers/AudioManager";
import { GameCamera, type idsOfObjects } from "./camera";
import { createJoystick, type JoystickController } from "./joystick";
import { t } from "./i18n";

type GameState =
  | "SHOWING_WELCOME"
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
  questTimeLimit: 120_000, // 2 minutes per quest
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
  private _movementJoystick: JoystickController | null = null;
  private _pendingQuest: Quest | null = null;
  private _completedQuest: Quest | null = null;
  private _gameState: GameState = "SHOWING_WELCOME";
  private _isInCutscene = false;
  private _questTimer: number | null = null;
  private _questStartTime: number = 0;
  private _hasShownWelcome = false;

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
    // Load cyclist on-demand when needed for quests
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
      const view = this._camera.getView;

      // Follow player in normal view, but FIXED in map view or cutscene
      if (!this._isInCutscene && view === "word_view") {
        this._camera.camera.target.copyFrom(this._player.capsule.position);
      }

      // Update compass to show camera direction (alpha is the horizontal rotation for ArcRotateCamera)
      this._uiManager.updateCompass(this._camera.camera.alpha + Math.PI / 2);

      this._scene.render();
      this._updateQuestProgress();
    });

    window.addEventListener("resize", () => this._engine.resize());
  }

  private _setupUIAndListeners(): void {
    this._uiManager.setAudioManager(this._audioManager);
    this._uiManager.setupListeners({
      onInfo: this._onInfoPressed,
      onHelp: this._onHelpPressed,
      onMap: this._onMapPressed,
      onInstructionModalClose: this._onInstructionModalClosed,
      onPhoneModalClose: this._onPhoneModalClosed,
      onAnswerCall: this._onAnswerCall,
    });

    // Initialize mobile joystick for character movement
    this._movementJoystick = createJoystick();
    this._player.setJoysticks(this._movementJoystick, null);

    // Setup click teleport for map view
    this._camera.onMapClick(this._handleMapClick.bind(this));
  }

  private _initializeQuests(): void {
    // Show welcome modal immediately
    this._showWelcomeModal();

    const firstQuest = this._questManager.getAllQuests()[0];
    if (firstQuest) {
      // Store the first quest to start after welcome modal closes
      this._pendingQuest = firstQuest;
    }
  }

  private _showWelcomeModal(): void {
    this._gameState = "SHOWING_WELCOME";
    this._uiManager.showInstructionModal("", t("game.messages.welcome"));
  }

  private _startQuest(quest: Quest): void {
    this._pendingQuest = quest;
    this._gameState = "SHOWING_INSTRUCTIONS";

    // If quest starts with cyclist animation
    if (
      quest.changeCameraTarget === "cyclist" &&
      quest.trigger !== "phonecall"
    ) {
      // {x: 27.368310928344727, z: -15.06584644317627}
      // Load and animate cyclist
      this._world.loadCyclist().then(() => {
        this._player.capsule.position.copyFrom(
          new Vector3(29.499107360839844, 1, -11.207662582397461)
        );

        const cyclistMesh = this._scene.getMeshByName("cyclistRoot");
        if (cyclistMesh) {
          const playerPosition = new Vector3(
            28.499107360839844,
            1.5,
            -10.207662582397461
          );
          this._isInCutscene = true;
          this._world.animateCyclistToPosition(playerPosition, 3000);
          this._camera.camera.setTarget(cyclistMesh.position);

          // After cyclist animation, show the riddle
          setTimeout(() => {
            this._world.disposeCyclist();
            this._isInCutscene = false;
            // Reset camera target back to player
            this._camera.camera.setTarget(this._player.capsule.position);
            this._uiManager.showInstructionModal(
              t("game.modals.message"),
              quest.riddle
            );
          }, 3000);
        }
      });
    }
    // If quest starts with camera position target
    else if (quest.changeCameraTarget && quest.trigger !== "phonecall") {
      this._isInCutscene = true;
      this._player.disableControls();
      this._camera.switchToObjectView(quest.changeCameraTarget as idsOfObjects);

      // Disable camera controls during cutscene
      this._camera.camera.detachControl();

      // // After 3 seconds, return camera and show riddle
      setTimeout(() => {
        this._isInCutscene = false;
        this._camera.switchToNormalView();
        this._player.enableControls();
        this._uiManager.showInstructionModal(
          t("game.modals.sign"),
          quest.riddle
        );
      }, 3000);
    } else if (quest.trigger === "phonecall") {
      this._audioManager.playRingtone();
      if (quest.id === 3) {
        this._uiManager.showPhoneCallModal(quest.caller ?? "Unknown");
      } else {
        this._uiManager.showPhoneCallModal(quest.caller ?? "Unknown");
      }
    } else if (quest.id === 5) {
      this._uiManager.showInstructionModal(
        t("game.modals.lastMission"),
        quest.riddle
      );
    } else if (quest.id === 6) {
      this._uiManager.showInstructionModal(
        t("game.modals.gameEnd"),
        quest.riddle
      );
    } else {
      this._uiManager.showInstructionModal(
        t("game.modals.nextMission"),
        quest.riddle
      );
    }
  }

  private _onInfoPressed = (): void => {
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) return;

    // If quest has camera target, animate to it
    if (currentQuest.changeCameraTarget === "cyclist") {
      // Load and animate cyclist
      this._world.loadCyclist().then(() => {
        this._uiManager.showInstructionModal(
          currentQuest.caller ?? t("game.modals.sign"),
          currentQuest.riddle
        );
      });
    }
    // If quest has camera position target
    else if (currentQuest.changeCameraTarget) {
      const id = currentQuest.changeCameraTarget as idsOfObjects;
      this._isInCutscene = true;
      this._player.disableControls();

      // Switch to map view and position camera MUCH closer
      this._camera.switchToObjectView(id);
      this._camera.camera.detachControl();

      // After 3 seconds, return camera and show riddle
      setTimeout(() => {
        this._isInCutscene = false;
        this._camera.switchToNormalView();
        this._camera.camera.attachControl(this._canvas, true);
        this._player.enableControls();
        this._uiManager.showInstructionModal(
          currentQuest.caller ?? t("game.modals.sign"),
          currentQuest.riddle
        );
      }, 3000);
    } else {
      // No camera animation, just show modal
      this._uiManager.showInstructionModal(
        currentQuest.caller ?? "ΕΠΙΓΡΑΦΗ",
        currentQuest.riddle
      );
    }
  };

  private _onHelpPressed = (): void => {
    this._uiManager.showInfoModal();
  };

  private _onMapPressed = (): void => {
    if (this._camera.getView === "map_view") {
      // Exit map view - show fire in world view
      this._camera.switchToNormalView();
      this._player.hideMarker();
      this._player.enableControls();
      this._world.setTeleportButtonsVisible(false);

      // Show the current active quest fire
      const currentQuest = this._questManager.getCurrentQuest();
      if (currentQuest) {
        this._world.showFireAtPoint(currentQuest.id);
      }
    } else {
      // Enter map view - HIDE ALL FIRES
      this._camera.switchToMapView();
      this._player.showMarker();
      this._player.disableControls();
      this._world.hideAllFires(); // HIDE FIRES IN MAP VIEW!
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
    if (this._gameState === "SHOWING_WELCOME") {
      this._handleWelcomeClosed();
    } else if (this._gameState === "SHOWING_INSTRUCTIONS") {
      this._handleInstructionsClosed();
    } else if (this._gameState === "SHOWING_SUCCESS") {
      this._handleQuestSuccess();
    }
  };

  private _handleWelcomeClosed(): void {
    this._hasShownWelcome = true;
    this._gameState = "AWAITING_QUEST";
    // Wait 3 seconds after welcome modal closes, then start first quest
    setTimeout(() => {
      if (this._pendingQuest) {
        this._startQuest(this._pendingQuest);
      }
    }, 3000);
  }

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
    this._gameState = "AWAITING_QUEST";
    const nextQuest = this._questManager.completeCurrentQuestAndGetNext();

    // Wait 3 seconds before starting next quest
    setTimeout(() => {
      this._completedQuest = null;

      if (nextQuest) {
        this._startQuest(nextQuest);
      } else {
        this._showGameOver();
      }
    }, 3000);
  }

  private _showGameOver(): void {
    this._gameState = "AWAITING_QUEST";
    this._uiManager.showInstructionModal(
      t("game.modals.gameOver"),
      t("game.modals.congratulations")
    );
  }

  private _handleMapClick(pickInfo: PickingInfo): void {
    if (!pickInfo.hit) return;

    const pickedMesh = pickInfo.pickedMesh;
    const pickedPoint = pickInfo.pickedPoint;

    if (
      pickedMesh &&
      (pickedMesh.name.startsWith("teleportButton-") ||
        pickedMesh.name.startsWith("numberLabel-"))
    ) {
      const questId = parseInt(pickedMesh.name.split("-")[1]);
      const quests = this._questManager.getAllQuests();
      const currentQest = this._questManager.getCurrentQuest();

      const quest = quests.find((q) => q.id === questId);
      const isCorrect = quest?.id === currentQest?.id;
      if (quest && quest.spawn_point) {
        if (quest.isFake || !isCorrect) {
          // Teleport player
          const pos = new Vector3(quest.spawn_point.x, 5, quest.spawn_point.z);
          const targetPos = pos.clone();
          targetPos.y = 3;
          this._player.capsule.position.copyFrom(targetPos);
          this._audioManager.playButtonClick();

          this._camera.switchToNormalView();
          this._player.hideMarker();
          this._player.enableControls();
          this._world.setTeleportButtonsVisible(false);
          // Show "False alarm!" modal
          this._uiManager.showInstructionModal(
            t("game.modals.falseAlarm"),
            t("game.messages.falseAlarmMessage")
          );
          this._questStartTime -= 30_000;
        } else {
          // Original teleport logic for real quests
          const pos = new Vector3(quest.spawn_point.x, 5, quest.spawn_point.z);
          const targetPos = pos.clone();
          targetPos.y = 3;
          this._player.capsule.position.copyFrom(targetPos);
          this._audioManager.playButtonClick();

          this._camera.switchToNormalView();
          this._player.hideMarker();
          this._player.enableControls();
          this._world.setTeleportButtonsVisible(false);
        }
        const currentQuest = this._questManager.getCurrentQuest();
        if (currentQuest) {
          this._world.showFireAtPoint(currentQuest.id);
        }
      }
    }
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
      this._cachedObjectivePos = this._world.getFirePointPosition(
        currentQuest.id
      );
    }

    if (!this._cachedObjectivePos) return;

    const playerPos = this._player.capsule.position;
    const distanceSquared = Vector3.DistanceSquared(
      playerPos,
      this._cachedObjectivePos
    );

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
    this._completedQuest = quest;

    // IMMEDIATELY hide the fire and stop sound
    this._world.hideAllFires();
    this._audioManager.stopFireSound();

    // Play completion sound and update UI
    this._audioManager.playQuestCompleteSound();
    this._uiManager.updateDistance(-1);

    // Show success modal
    this._uiManager.showInstructionModal(
      t("game.modals.success"),
      quest.successMessage
    );
  }

  private _onQuestAdvanced(currentQuest: Quest): void {
    this._camera.switchToMapView();
    this._player.showMarker();
    this._player.disableControls();
    this._world.hideAllFires(); // Make sure NO fires show in map view
    this._world.setTeleportButtonsVisible(true);
    // Don't show fire here - it will be shown when player exits map view
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
      t("game.modals.timeUp"),
      t("game.modals.tryAgain")
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
