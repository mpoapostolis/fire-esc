import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  type EngineOptions,
  type IWebGPUEngineOptions,
  type PickingInfo,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { QuestManager } from "./managers/QuestManager";
import type { Quest } from "./quests/quests";
import { UIManager } from "./managers/UIManager";
import { AudioManager } from "./managers/AudioManager";
import { GameCamera } from "./camera";
import { createJoystick, type JoystickController } from "./joystick";
import { t } from "./i18n";

export type GameState =
  | "SHOWING_WELCOME"
  | "SHOWING_GAME_INSTRUCTIONS"
  | "AWAITING_QUEST"
  | "PLAYING"
  | "SHOWING_INSTRUCTIONS"
  | "SHOWING_REWARD"
  | "PLAYING_QUIZ"
  | "SHOWING_QUIZ_RESULT"
  | "SHOWING_QUIZ_FAIL"
  | "SHOWING_SUCCESS"
  | "SHOWING_MAP_ERROR";

interface GameConfig {
  readonly gravity: Vector3;
  readonly initialQuestDelay: number;
  readonly questCompleteAnimationDelay: number;
  readonly questTimeLimit: number;
  readonly cityModel?: string;
  readonly onProgress?: (progress: number, status: string) => void;
}

const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: new Vector3(0, -9.81, 0),
  initialQuestDelay: 3000,
  questCompleteAnimationDelay: 2000,
  questTimeLimit: 4 * 60 * 1000, // 4 lepta
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
  private _posCapureIndex = 0; // dev tool: tracks which quest to update on P press
  private _gameState: GameState = "SHOWING_WELCOME";
  private _questTimer: number | null = null;
  private _questStartTime: number = 0;
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
    this._world = new World(this._scene, {});
    await this._world.load();
    this._world.createQuestFirePoints(this._questManager.getAllQuests());
    this._world.createTeleportButtons(this._questManager.getAllQuests());
    this._world.createPointLabels(this._questManager.getAllQuests());
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
      const anyModalOpen = !!document.querySelector("dialog[open]");
      if (anyModalOpen) {
        this._player.disableControls();
      } else if (this._gameState === "PLAYING" || this._gameState === "AWAITING_QUEST") {
        this._player.enableControls();
      }
      this._player.update(this._gameState);

      if (this._camera.getView === "word_view") {
        this._camera.camera.target.copyFrom(this._player.capsule.position);
      }

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

    // Initialize mobile joystick
    this._movementJoystick = createJoystick();
    this._player.setJoysticks(this._movementJoystick, null);

    // Setup click for map view
    this._camera.onMapClick(this._handleMapClick.bind(this));

    let arr = [];
    window.addEventListener("keydown", (e) => {
      if (e.key === "p" || e.key === "P") {
        const pos = this._player.capsule.position;
        const x = parseFloat(pos.x.toFixed(2));
        const z = parseFloat(pos.z.toFixed(2));
        arr.push({ point: { x, z }, spawn_point: { x: x, z: z } });

        console.log(arr);
      }
    });
  }

  private _initializeQuests(): void {
    this._showWelcomeModal();
    this._uiManager.showGameHUD();

    const firstQuest = this._questManager.getAllQuests()[0];
    if (firstQuest) {
      this._pendingQuest = firstQuest;
    }
  }

  private _showWelcomeModal(): void {
    this._gameState = "SHOWING_WELCOME";
    this._uiManager.showInstructionModal("", t("game.messages.welcome"));
  }

  private _startQuest(quest: Quest): void {
    this._pendingQuest = quest;

    // Invalidate cache for distance
    this._cachedCurrentQuest = null;
    this._cachedObjectivePos = null;

    // Phone rings first, then scenario shown after answering
    this._gameState = "AWAITING_QUEST";
    this._audioManager.playRingtone();
    const callerName = quest.caller || quest.title;
    this._uiManager.showPhoneCallModal(callerName);
  }

  private _onInfoPressed = (): void => {
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) return;
    this._uiManager.showInstructionModal(
      `${t('game.modals.riddle')} ${currentQuest.id}`,
      currentQuest.riddle,
    );
  };

  private _onHelpPressed = (): void => {
    this._pauseGame();
    this._uiManager.showInfoModal();
  };

  private _onHelpModalClosed = (): void => {
    this._resumeGame();
  };

  private _onThermometerModalClosed = (): void => {};

  private _onMapPressed = (): void => {
    if (this._camera.getView === "map_view") {
      this._camera.switchToNormalView();
      this._player.hideMarker();
      this._player.enableControls();
      this._world.setTeleportButtonsVisible(false);
      const cq = this._questManager.getCurrentQuest();
      if (cq) this._world.showFirePoint(cq.id);
    } else {
      this._camera.switchToMapView();
      this._player.showMarker();
      this._player.disableControls();
      this._world.setTeleportButtonsVisible(true);
      this._world.hideAllFirePoints();
    }
  };

  private _onAnswerCall = (): void => {
    this._audioManager.stopRingtone();
    this._uiManager.hidePhoneCallModal();
  };

  private _onPhoneModalClosed = (): void => {
    this._audioManager.stopRingtone();

    // After answering the call, show the scenario
    if (this._pendingQuest) {
      this._gameState = "SHOWING_INSTRUCTIONS";
      const sceneNum = this._pendingQuest.id;
      const speaker = `${t('game.modals.scene')} ${sceneNum} - ${this._pendingQuest.title}`;
      this._uiManager.showInstructionModal(speaker, this._pendingQuest.riddle);
    } else {
      this._gameState = "PLAYING";
    }
  };

  private _onInstructionModalClosed = (): void => {
    if (this._gameState === "SHOWING_WELCOME") {
      this._handleWelcomeClosed();
    } else if (this._gameState === "SHOWING_GAME_INSTRUCTIONS") {
      this._handleGameInstructionsClosed();
    } else if (this._gameState === "SHOWING_INSTRUCTIONS") {
      this._handleInstructionsClosed();
    } else if (this._gameState === "SHOWING_REWARD") {
      this._handleRewardClosed();
    } else if (this._gameState === "SHOWING_QUIZ_RESULT") {
      this._handleQuestSuccess();
    } else if (this._gameState === "SHOWING_QUIZ_FAIL") {
      this._handleQuizRetry();
    } else if (this._gameState === "SHOWING_MAP_ERROR") {
      // Wrong point - stay in world view, player can use map button to go back
      this._gameState = "PLAYING";
    } else if (this._gameState === "SHOWING_SUCCESS") {
      this._handleQuestSuccess();
    }
  };

  private _handleWelcomeClosed(): void {
    this._gameState = "SHOWING_GAME_INSTRUCTIONS";
    this._uiManager.showInstructionModal("", t("game.messages.gameInstructions"), false);
  }

  private _handleGameInstructionsClosed(): void {
    this._gameState = "AWAITING_QUEST";
    // Start the global timer once
    this._startQuestTimer();
    this._delayedAction(() => {
      if (this._pendingQuest) {
        this._startQuest(this._pendingQuest);
      }
    }, 2000);
  }

  private async _handleInstructionsClosed(): Promise<void> {
    if (this._pendingQuest) {
      this._questManager.activateQuestById(this._pendingQuest.id);
      this._pendingQuest = null;
    }
    this._gameState = "PLAYING";

    // Open map for player to choose location
    this._camera.switchToMapView();
    this._player.showMarker();
    this._player.disableControls();
    this._world.setTeleportButtonsVisible(true);
  }

  private _handleRewardClosed(): void {
    if (this._completedQuest && this._completedQuest.quiz) {
      this._startQuiz(this._completedQuest);
    } else {
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
      quest.riddle,
    );
  }

  private _onQuizAnswer(index: number, quest: Quest): void {
    if (!quest.quiz) return;
    this._uiManager.hideQuizModal();

    const feedbackText = quest.quiz.optionFeedback?.[index] ||
      (index === quest.quiz.correctIndex ? quest.quiz.feedback : quest.quiz.failureMessage);

    if (index === quest.quiz.correctIndex) {
      this._gameState = "SHOWING_QUIZ_RESULT";
      const conclusion = quest.quiz.conclusion ? `\n\n${quest.quiz.conclusion}` : "";
      this._uiManager.showInstructionModal(
        t("game.modals.success"),
        feedbackText + conclusion,
      );
    } else {
      this._gameState = "SHOWING_QUIZ_FAIL";
      this._uiManager.showInstructionModal(
        t("game.modals.fail"),
        feedbackText,
      );
    }
  }

  private _handleQuizRetry(): void {
    if (this._completedQuest) {
      this._startQuiz(this._completedQuest);
    }
  }

  private _handleQuestSuccess(): void {
    this._gameState = "AWAITING_QUEST";
    this._completedQuest = null;
    this._world.hideAllFirePoints();

    const nextQuest = this._questManager.completeCurrentQuestAndGetNext();

    this._delayedAction(() => {
      if (nextQuest) {
        this._startQuest(nextQuest);
      } else {
        this._stopQuestTimer();
        this._showGameOver();
      }
    }, 2000);
  }

  private _showGameOver(): void {
    this._gameState = "AWAITING_QUEST";
    this._uiManager.showInstructionModal(
      t("game.modals.gameOver"),
      t("game.modals.congratulations"),
    );
  }

  private _handleMapClick(pickInfo: PickingInfo): void {
    if (!pickInfo.hit || this._gameState !== "PLAYING") return;

    const pickedMesh = pickInfo.pickedMesh;
    if (
      !pickedMesh ||
      (!pickedMesh.name.startsWith("teleportButton-") &&
        !pickedMesh.name.startsWith("numberLabel-"))
    )
      return;

    const questId = parseInt(pickedMesh.name.split("-")[1]);
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) return;

    // Get the clicked quest to find its position
    const clickedQuest = this._questManager.getQuestById(questId);
    if (!clickedQuest) return;

    this._audioManager.playButtonClick();

    this._camera.switchToNormalView();
    this._player.hideMarker();
    this._player.enableControls();
    this._world.setTeleportButtonsVisible(false);
    // Show marker in third person
    this._world.showFirePoint(currentQuest.id);

    if (questId === currentQuest.id) {
      // Teleport player to spawn_point (set separately from fire point in quests.ts)
      const spawnX = clickedQuest.spawn_point.x;
      const spawnZ = clickedQuest.spawn_point.z;
      const groundY = this._world.getGroundHeightAt(spawnX, spawnZ);
      const targetPos = new Vector3(spawnX, groundY + 2, spawnZ);
      this._player.capsule.position.copyFrom(targetPos);
      this._player.enableControls();
    } else {
      // Wrong point - teleport there, show error
      const wrongX = clickedQuest.point.x;
      const wrongZ = clickedQuest.point.z;
      const wrongGroundY = this._world.getGroundHeightAt(wrongX, wrongZ);
      const targetPos = new Vector3(wrongX, wrongGroundY + 2, wrongZ);
      this._player.capsule.position.copyFrom(targetPos);
      this._gameState = "SHOWING_MAP_ERROR";
      this._uiManager.showInstructionModal(
        t("game.modals.falseAlarm"),
        t("game.messages.falseAlarmMessage"),
      );
    }
  }

  private _updateQuestProgress(): void {
    // Always update timer
    const remainingTime = this._getRemainingTime();
    this._uiManager.updateTimer(remainingTime);

    if (this._gameState !== "PLAYING" || this._isPaused) return;

    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest) {
      this._uiManager.updateDistance(null);
      return;
    }

    // Update cache only when quest changes
    if (this._cachedCurrentQuest?.id !== currentQuest.id) {
      this._cachedCurrentQuest = currentQuest;
      this._cachedObjectivePos = this._world.getFirePointPosition(
        currentQuest.id,
      );
    }

    if (!this._cachedObjectivePos) {
      this._uiManager.updateDistance(null);
      return;
    }

    // Only check distance in world view
    if (this._camera.getView !== "word_view") return;

    const playerPos = this._player.capsule.position;
    const dx = playerPos.x - this._cachedObjectivePos.x;
    const dz = playerPos.z - this._cachedObjectivePos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    this._uiManager.updateDistance(distance);
    this._audioManager.updateFireVolume(distance);

    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < 16) {
      this._completeActiveQuest(currentQuest);
    }
  }

  private _completeActiveQuest(quest: Quest): void {
    this._completedQuest = quest;
    this._audioManager.stopFireSound();
    this._audioManager.playQuestCompleteSound();

    if (quest.quiz) {
      this._startQuiz(quest);
    } else {
      this._gameState = "SHOWING_REWARD";
      this._uiManager.showInstructionModal(
        t("game.modals.success"),
        quest.successMessage,
      );
    }
  }

  // Timer management
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
        lastCheckTime = Date.now();
        const timeoutId = window.setTimeout(checkAndExecute, 100);
        this._pendingTimeouts.push(timeoutId);
        return;
      }

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
}
