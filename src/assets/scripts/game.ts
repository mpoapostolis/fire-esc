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
import { CinematicManager } from "./managers/CinematicManager";
import type { Quest } from "./quests/quests";
import { UIManager } from "./managers/UIManager";
import { AudioManager } from "./managers/AudioManager";
import { GameCamera, type idsOfObjects } from "./camera";
import { createJoystick, type JoystickController } from "./joystick";
import { t } from "./i18n";

export type GameState =
  | "SHOWING_WELCOME"
  | "AWAITING_QUEST"
  | "PLAYING"
  | "SHOWING_INSTRUCTIONS"
  | "SHOWING_REWARD" // New: Arrived at point, showing scenario description
  | "PLAYING_QUIZ" // New: Answering quiz
  | "SHOWING_QUIZ_RESULT" // New: Correct answer feedback
  | "SHOWING_QUIZ_FAIL" // New: Wrong answer feedback
  | "SHOWING_SUCCESS";

interface GameConfig {
  readonly gravity: Vector3;
  readonly initialQuestDelay: number;
  readonly questCompleteAnimationDelay: number;
  readonly questTimeLimit: number;
  readonly cityModel?: string;
  readonly onProgress?: (progress: number, status: string) => void;
}

console.log(window?.location?.search);
const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: new Vector3(0, -9.81, 0),
  initialQuestDelay: 3000,
  questCompleteAnimationDelay: 2000,
  questTimeLimit: window?.location?.search === "?test" ? 1_200_000 : 180_000, // 2 minutes per quest
};

export class Game {
  private readonly _engine: Engine;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _scene: Scene;
  private readonly _config: GameConfig;
  private readonly _questManager: QuestManager;
  private readonly _uiManager: UIManager;
  private readonly _audioManager: AudioManager;
  private _cinematicManager!: CinematicManager;

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
  private _isPaused = false;
  private _totalPausedTime: number = 0;
  private _pauseStartTime: number = 0;
  private _pendingTimeouts: number[] = [];

  // Cached values for performance
  private readonly _reusableVector = new Vector3();
  private _cachedCurrentQuest: Quest | null = null;
  private _cachedObjectivePos: Vector3 | null = null;

  private constructor(
    engine: Engine,
    canvas: HTMLCanvasElement,
    config: Partial<GameConfig> = {},
  ) {
    this._engine = engine;
    this._canvas = canvas;
    this._scene = new Scene(this._engine);
    this._config = { ...DEFAULT_GAME_CONFIG, ...config };
    this._uiManager = new UIManager();
    this._audioManager = new AudioManager();
    this._uiManager.setAudioManager(this._audioManager);

    this._questManager = new QuestManager();
  }

  public static async CreateAsync(
    canvas: HTMLCanvasElement,
    config?: Partial<GameConfig>,
  ): Promise<Game> {
    const engine = await this._createEngine(canvas);
    return new Game(engine, canvas, config);
  }

  private static async _createEngine(
    canvas: HTMLCanvasElement,
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
    const reportProgress = (progress: number, status: string) => {
      this._config.onProgress?.(progress, status);
    };

    reportProgress(5, "");
    this._setupAudioTrigger();

    reportProgress(10, "");
    await this._initializePhysics();

    reportProgress(15, "");
    await this._loadWorld();

    reportProgress(60, "");
    await this._setupPlayerAndCamera();

    reportProgress(80, "");
    this._setupCameras();

    reportProgress(85, "");
    this._world.setupPostProcessing();

    reportProgress(90, "");
    this._setupUIAndListeners();

    reportProgress(95, "");
    this._initializeQuests();

    reportProgress(98, "");
    this._optimizeScene();

    reportProgress(100, "");
    this._startRenderLoop();
  }

  private _setupAudioTrigger(): void {
    this._canvas.addEventListener(
      "pointerdown",
      this._audioManager.initializeAudio,
      { once: true },
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

    // Initialize CinematicManager after _world and _player are created
    this._cinematicManager = new CinematicManager(
      this._scene,
      this._world,
      this._uiManager,
      this._player,
    );
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
      this._player.enableControls();
      this._player.update(this._gameState);

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
      onHelpModalClose: this._onHelpModalClosed,
      onThermometerModalClose: this._onThermometerModalClosed,
    });

    // Initialize mobile joystick for character movement
    this._movementJoystick = createJoystick();
    this._player.setJoysticks(this._movementJoystick, null);

    // Setup click teleport for map view
    this._camera.onMapClick(this._handleMapClick.bind(this));

    // POINT SELECTION TOOL - Press P to log current position
    window.addEventListener("keydown", (e) => {
      if (e.key === "p" || e.key === "P") {
        const pos = this._player.capsule.position;
        console.log("======================");
        console.log("📍 POSITION CAPTURED:");
        console.log(
          `point: { x: ${pos.x.toFixed(2)}, z: ${pos.z.toFixed(2)} }`,
        );
        console.log(
          `spawn_point: { x: ${pos.x.toFixed(2)}, z: ${pos.z.toFixed(2)} }`,
        );
        console.log("======================");

        // Show on screen notification
        const notification = document.createElement("div");
        notification.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(34, 211, 238, 0.95);
          color: white;
          padding: 20px 40px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: bold;
          z-index: 9999;
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.8);
          animation: fadeOut 2s forwards;
        `;
        notification.innerHTML = `📍 Position Captured!<br><small>x: ${pos.x.toFixed(2)}, z: ${pos.z.toFixed(2)}</small>`;
        document.body.appendChild(notification);

        const style = document.createElement("style");
        style.textContent =
          "@keyframes fadeOut { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }";
        document.head.appendChild(style);

        setTimeout(() => notification.remove(), 2000);
      }
    });
  }

  private _initializeQuests(): void {
    // Show welcome modal immediately
    this._showWelcomeModal();
    this._uiManager.showGameHUD();

    const firstQuest = this._questManager.getAllQuests()[0];
    if (firstQuest) {
      // Store the first quest to start after welcome modal closes
      this._pendingQuest = firstQuest;
    }

    // DON'T load any characters at start - only show when quest is active
  }

  private _showWelcomeModal(): void {
    this._gameState = "SHOWING_WELCOME";
    this._uiManager.showInstructionModal("", t("game.messages.welcome"));
  }

  private _startQuest(quest: Quest): void {
    this._pendingQuest = quest;
    this._gameState = "SHOWING_INSTRUCTIONS";

    // Quest 2 - Show thermometer warning first
    if (quest.id === 2) {
      this._uiManager.showThermometerModal();
      return;
    }

    // Skater Cinematic (Quest 3)
    if (quest.changeCameraTarget === "skater") {
      this._isInCutscene = true;

      this._cinematicManager.playCinematic({
        cameraTarget: "skate", // Use skate.glb file
        spawnPoint: new Vector3(10.5, 2.3, -39.4),
        targetPosition: new Vector3(9, 2.3, -21),
        riddle: quest.riddle,
        onComplete: () => {
          this._isInCutscene = false;
          // Reset camera is handled by CinematicManager or manual reset here if needed
          this._scene.activeCamera = this._camera.camera;
          this._camera.camera.setTarget(this._player.capsule.position);

          this._uiManager.showInstructionModal(
            quest.caller ?? t("game.modals.message"),
            quest.riddle,
          );
        },
      });
      return; // Stop processing other quest logic
    }
    // Cyclist Cinematic (Legacy / Quest 1?)
    else if (
      quest.changeCameraTarget === "cyclist" &&
      quest.trigger !== "phonecall"
    ) {
      this._isInCutscene = true;
      this._cinematicManager.playCinematic({
        cameraTarget: "cyclist",
        spawnPoint: new Vector3(27.073823928833008, 1.5, 17.194150924682617),
        targetPosition: new Vector3(quest.point.x, 2, quest.point.z),
        riddle: quest.riddle,
        onComplete: () => {
          this._isInCutscene = false;
          // Reset camera
          this._scene.activeCamera = this._camera.camera;
          this._camera.camera.setTarget(this._player.capsule.position);

          this._uiManager.showInstructionModal(
            t("game.modals.message"),
            quest.riddle,
          );
        },
      });
    }
    // If quest starts with camera position target
    else if (quest.changeCameraTarget && quest.trigger !== "phonecall") {
      this._isInCutscene = true;
      this._player.disableControls();
      this._camera.switchToObjectView(quest.changeCameraTarget as idsOfObjects);
      this._camera.camera.detachControl();

      this._delayedAction(() => {
        this._isInCutscene = false;
        this._camera.switchToNormalView();
        this._player.enableControls();
        this._uiManager.showInstructionModal(
          t("game.modals.sign"),
          quest.riddle,
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
        quest.riddle,
      );
    } else if (quest.id === 6) {
      this._uiManager.showInstructionModal(
        t("game.modals.gameEnd"),
        quest.riddle,
      );
    } else {
      this._uiManager.showInstructionModal(
        t("game.modals.nextMission"),
        quest.riddle,
      );
    }
  }

  private _onInfoPressed = (): void => {
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) return;

    if (currentQuest.changeCameraTarget === "cyclist") {
      // Just show info, no cinematic replay for info press
      this._uiManager.showInstructionModal(
        currentQuest.caller ?? t("game.modals.sign"),
        currentQuest.riddle,
      );
    } else if (currentQuest.changeCameraTarget) {
      const id = currentQuest.changeCameraTarget as idsOfObjects;
      this._isInCutscene = true;
      this._player.disableControls();

      this._camera.switchToObjectView(id);
      this._camera.camera.detachControl();

      setTimeout(() => {
        this._isInCutscene = false;
        this._camera.switchToNormalView();
        this._camera.camera.attachControl(this._canvas, true);
        this._player.enableControls();
        this._uiManager.showInstructionModal(
          currentQuest.caller ?? t("game.modals.sign"),
          currentQuest.riddle,
        );
      }, 3000);
    } else {
      this._uiManager.showInstructionModal(
        currentQuest.caller ?? "ΕΠΙΓΡΑΦΗ",
        currentQuest.riddle,
      );
    }
  };

  private _onHelpPressed = (): void => {
    this._pauseGame();
    this._uiManager.showInfoModal();
  };

  private _onHelpModalClosed = (): void => {
    this._resumeGame();
  };

  private _onThermometerModalClosed = (): void => {
    // After thermometer modal closes, show the riddle for Quest 2
    if (this._pendingQuest && this._pendingQuest.id === 2) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller ?? t("game.modals.sign"),
        this._pendingQuest.riddle,
      );
    }
  };

  private _onMapPressed = (): void => {
    if (this._camera.getView === "map_view") {
      this._camera.switchToNormalView();
      this._player.hideMarker();
      this._player.enableControls();
      this._world.setTeleportButtonsVisible(false);

      const currentQuest = this._questManager.getCurrentQuest();
      if (currentQuest) {
        this._world.loadQuestCharacter(currentQuest);
      }
    } else {
      this._camera.switchToMapView();
      this._player.showMarker();
      this._player.disableControls();
      this._world.hideAllFires(); // Hides characters too
      this._world.setTeleportButtonsVisible(true);
    }
  };

  private _onAnswerCall = (): void => {
    this._audioManager.stopRingtone();
    this._uiManager.hidePhoneCallModal();
    if (this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller ?? "Objective",
        this._pendingQuest.riddle,
      );
    }
  };

  private _onPhoneModalClosed = (): void => {
    this._audioManager.stopRingtone();
    if (this._gameState === "SHOWING_INSTRUCTIONS" && this._pendingQuest) {
      this._uiManager.showInstructionModal(
        this._pendingQuest.caller ?? "Objective",
        this._pendingQuest.riddle,
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
    } else if (this._gameState === "SHOWING_REWARD") {
      this._handleRewardClosed();
    } else if (this._gameState === "SHOWING_QUIZ_RESULT") {
      this._handleQuestSuccess(); // Flow continues to absolute success
    } else if (this._gameState === "SHOWING_QUIZ_FAIL") {
      this._handleQuizRetry();
    } else if (this._gameState === "SHOWING_SUCCESS") {
      this._handleQuestSuccess();
    }
  };

  private _handleWelcomeClosed(): void {
    this._hasShownWelcome = true;
    this._gameState = "AWAITING_QUEST";
    this._delayedAction(() => {
      if (this._pendingQuest) {
        this._startQuest(this._pendingQuest);
      }
    }, 3000);
  }

  private async _handleInstructionsClosed(): Promise<void> {
    if (this._pendingQuest) {
      this._questManager.activateQuestById(this._pendingQuest.id);
      await this._onQuestAdvanced(this._pendingQuest);
      this._pendingQuest = null;
      this._startQuestTimer();
    }
    this._gameState = "PLAYING";
  }

  private _handleRewardClosed(): void {
    // Reward message closed. Check if we have a quiz.
    if (this._completedQuest && this._completedQuest.quiz) {
      this._startQuiz(this._completedQuest);
    } else {
      // No quiz, just finish it.
      this._handleQuestSuccess();
    }
  }

  private _startQuiz(quest: Quest): void {
    if (!quest.quiz) return;
    this._gameState = "PLAYING_QUIZ";
    this._uiManager.showQuizModal(
      quest.quiz.question,
      quest.quiz.options,
      (index) => this._onQuizAnswer(index, quest),
    );
  }

  private _onQuizAnswer(index: number, quest: Quest): void {
    if (!quest.quiz) return;
    this._uiManager.hideQuizModal();

    if (index === quest.quiz.correctIndex) {
      // Correct!
      this._gameState = "SHOWING_QUIZ_RESULT";
      this._uiManager.showInstructionModal(
        t("game.modals.success"),
        quest.quiz.feedback,
      );
    } else {
      // Wrong!
      this._gameState = "SHOWING_QUIZ_FAIL";
      this._uiManager.showInstructionModal(
        t("game.modals.fail"),
        quest.quiz.failureMessage || t("game.messages.quizFailMessage"),
      );
    }
  }

  private _handleQuizRetry(): void {
    // Retry the quiz for the current quest
    if (this._completedQuest) {
      this._startQuiz(this._completedQuest);
    }
  }

  private _handleQuestSuccess(): void {
    this._stopQuestTimer();
    this._gameState = "AWAITING_QUEST";

    // Remove the character from the completed quest
    if (this._completedQuest) {
      this._world.removeQuestCharacter(this._completedQuest.id);
    }

    const nextQuest = this._questManager.completeCurrentQuestAndGetNext();

    this._delayedAction(() => {
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
      t("game.modals.congratulations"),
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
          this._player.enableControls(); // FIX: Re-enable controls after teleport
          this._world.setTeleportButtonsVisible(false); // Clean up Map UI
          this._player.enableControls();
          this._world.setTeleportButtonsVisible(false);
          // Show "False alarm!" modal
          this._uiManager.showInstructionModal(
            t("game.modals.falseAlarm"),
            t("game.messages.falseAlarmMessage"),
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
          this._world.loadQuestCharacter(currentQuest);
        }
      }
    }
  }

  private _updateQuestProgress(): void {
    if (this._gameState !== "PLAYING" || this._isPaused) return;

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
        currentQuest.id,
      );
    }

    if (!this._cachedObjectivePos) return;

    const playerPos = this._player.capsule.position;
    const distanceSquared = Vector3.DistanceSquared(
      playerPos,
      this._cachedObjectivePos,
    );

    // Update fire sound volume based on distance (use squared distance to avoid sqrt)
    const distance = Math.sqrt(distanceSquared);
    this._audioManager.updateFireVolume(distance);

    if (distanceSquared < 4) {
      this._completeActiveQuest(currentQuest);
    } else {
      this._uiManager.updateDistance(distance);
    }
  }

  private _completeActiveQuest(quest: Quest): void {
    // OLD: this._gameState = "SHOWING_SUCCESS";
    // NEW: Show reward first
    this._gameState = "SHOWING_REWARD";
    this._completedQuest = quest;

    // IMMEDIATELY hide the fire and stop sound
    this._world.hideAllFires();
    this._audioManager.stopFireSound();

    // Load character when player arrives
    this._world.loadQuestCharacter(quest);

    // Play completion sound and update UI
    this._audioManager.playQuestCompleteSound();
    this._uiManager.updateDistance(-1);

    // Show reward/arrival success modal
    this._uiManager.showInstructionModal(
      t("game.modals.success"),
      quest.successMessage,
    );
  }

  private async _onQuestAdvanced(currentQuest: Quest): Promise<void> {
    // Load character for this quest if it doesn't have a cinematic
    if (currentQuest.character && !currentQuest.changeCameraTarget) {
      await this._world.loadQuestCharacter(currentQuest);
    }

    // ALWAYS open map after quest - player needs to CHOOSE location based on riddle!
    // This is the core game mechanic!
    this._camera.switchToMapView();
    this._player.showMarker();
    this._player.disableControls();
    this._world.hideAllFires(); // Make sure NO characters show in map view
    this._world.setTeleportButtonsVisible(true);
  }

  private _startQuestTimer(): void {
    this._stopQuestTimer();
    this._questStartTime = Date.now();
    this._totalPausedTime = 0;
    this._pauseStartTime = 0;
    this._isPaused = false;
    this._checkQuestTimer();
  }

  private _checkQuestTimer(): void {
    const remainingTime = this._getRemainingTime();

    if (remainingTime <= 0 && !this._isPaused) {
      this._onQuestTimerExpired();
      return;
    }

    // Check again in 100ms
    this._questTimer = window.setTimeout(() => {
      this._checkQuestTimer();
    }, 100);
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
      t("game.modals.tryAgain"),
    );

    // Add try again button handler
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  private _getRemainingTime(): number {
    if (this._questStartTime === 0) return this._config.questTimeLimit;
    const elapsed = Date.now() - this._questStartTime - this._totalPausedTime;
    return Math.max(0, this._config.questTimeLimit - elapsed);
  }

  private _delayedAction(callback: () => void, delay: number): void {
    let remainingTime = delay;
    let lastCheckTime = Date.now();

    const checkAndExecute = () => {
      if (this._isPaused) {
        // If paused, just wait and check again without counting down time
        lastCheckTime = Date.now(); // Reset to current time so we don't count pause time
        const timeoutId = window.setTimeout(checkAndExecute, 100);
        this._pendingTimeouts.push(timeoutId);
        return;
      }

      // Calculate how much time actually passed while not paused
      const now = Date.now();
      const elapsed = now - lastCheckTime;
      lastCheckTime = now;
      remainingTime -= elapsed;

      if (remainingTime <= 0) {
        callback();
      } else {
        const timeoutId = window.setTimeout(
          checkAndExecute,
          Math.min(100, remainingTime),
        );
        this._pendingTimeouts.push(timeoutId);
      }
    };

    const timeoutId = window.setTimeout(checkAndExecute, Math.min(100, delay));
    this._pendingTimeouts.push(timeoutId);
  }

  private _pauseGame(): void {
    if (this._isPaused) return;
    this._isPaused = true;
    this._pauseStartTime = Date.now();
  }

  private _resumeGame(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    const pauseDuration = Date.now() - this._pauseStartTime;
    this._totalPausedTime += pauseDuration;
  }

  private _clearAllTimeouts(): void {
    this._pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this._pendingTimeouts = [];
  }
}
