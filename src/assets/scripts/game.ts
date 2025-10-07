import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  type IWebGPUEngineOptions,
  type EngineOptions,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { QuestManager } from "./quests/QuestManager";
import type { Quest } from "./quests/quests";

export class Game {
  private _scene: Scene;
  private _engine: Engine;
  private _world: World;
  private _player: Player;
  private _questManager: QuestManager;

  // ΒΕΛΤΙΣΤΟΠΟΙΗΣΗ: Σταθερό αντικείμενο για μηδενική εισαγωγή για μείωση του Garbage Collection.
  private readonly _zeroInput = { x: 0, y: 0 };

  // --- HTML UI Elements ---
  private _hudQuestTitle: HTMLElement;
  private _hudQuestObjective: HTMLElement;
  private _hudDistance: HTMLElement;
  private _questLogPanel: HTMLElement;
  private _questListContainer: HTMLElement;
  private _detailsQuestTitle: HTMLElement;
  private _detailsQuestRiddle: HTMLElement;
  private _detailsSuccessMessage: HTMLElement;
  private _detailsSuccessText: HTMLElement;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine);
    this._questManager = new QuestManager();
  }

  public static async CreateAsync(canvas: HTMLCanvasElement): Promise<Game> {
    // ΒΕΛΤΙΣΤΟΠΟΙΗΣΗ: Προσθήκη powerPreference για χρήση της κάρτας γραφικών υψηλής απόδοσης.
    const engineOptions: EngineOptions & IWebGPUEngineOptions = {
      antialias: true,
      powerPreference: "high-performance",
    };

    let engine: Engine;
    if (await WebGPUEngine.IsSupportedAsync) {
      console.log("Η WebGPU υποστηρίζεται. Αρχικοποίηση WebGPUEngine.");
      const webGPUEngine = new WebGPUEngine(canvas, engineOptions);
      await webGPUEngine.initAsync();
      engine = webGPUEngine;
    } else {
      console.log("Η WebGPU δεν υποστηρίζεται. Επιστροφή σε WebGL.");
      engine = new Engine(canvas, true, engineOptions);
    }
    return new Game(engine);
  }

  public async run(): Promise<void> {
    const havokPlugin = await getHavokPlugin();
    this._scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

    this._world = new World(this._scene);
    await this._world.load();
    this._world.createFirePoints(11);

    this._player = new Player(this._scene, this._world.camera);
    await this._player.load();

    this._setupUI();
    this.initializeQuests();

    // ΒΕΛΤΙΣΤΟΠΟΙΗΣΗ: "Παγώνουμε" τον έλεγχο των υλικών για καλύτερη απόδοση.
    this._scene.blockMaterialDirtyMechanism = true;

    let lastQuest = this._questManager.getCurrentQuest();

    this._engine.runRenderLoop(() => {
      this._player.setInputVector(this._zeroInput); // Επαναχρησιμοποίηση του σταθερού αντικειμένου

      this._player.update();
      this._scene.render();

      // ΚΑΛΥΤΕΡΗ ΟΡΓΑΝΩΣΗ: Η λογική των quests μεταφέρεται σε δική της μέθοδο.
      this._updateQuestProgress();

      const currentQuest = this._questManager.getCurrentQuest();
      if (lastQuest !== currentQuest) {
        this.onQuestAdvanced(currentQuest);
        lastQuest = currentQuest;
      }
    });

    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }

  private _isKeyboardInputActive(): boolean {
    return false;
  }

  // ΚΑΛΥΤΕΡΗ ΟΡΓΑΝΩΣΗ & ΣΤΑΘΕΡΟΤΗΤΑ: Μέθοδος για την εύρεση UI στοιχείων με έλεγχο σφαλμάτων.
  private _getUIElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Το στοιχείο του UI με id "${id}" δεν βρέθηκε.`);
    }
    return element as T;
  }

  private _setupUI(): void {
    // Χρήση της νέας, ασφαλούς μεθόδου για την ανάκτηση των στοιχείων.
    this._hudQuestTitle = this._getUIElement("hud-quest-title");
    this._hudQuestObjective = this._getUIElement("hud-quest-objective");
    this._hudDistance = this._getUIElement("hud-distance");
    this._questLogPanel = this._getUIElement("quest-log-panel");
    this._questListContainer = this._getUIElement("quest-list-container");
    this._detailsQuestTitle = this._getUIElement("details-quest-title");
    this._detailsQuestRiddle = this._getUIElement("details-quest-riddle");
    this._detailsSuccessMessage = this._getUIElement("details-success-message");
    this._detailsSuccessText = this._getUIElement("details-success-text");

    const questLogToggle = this._getUIElement("quest-log-toggle");
    questLogToggle.addEventListener("click", () => {
      this.renderQuestList();
      this._questLogPanel.classList.toggle("hidden");
    });

    const questLogClose = this._getUIElement("quest-log-close");
    questLogClose.addEventListener("click", () => {
      this._questLogPanel.classList.add("hidden");
    });
  }

  private initializeQuests(): void {
    const firstQuest = this._questManager.getCurrentQuest();
    this.onQuestAdvanced(firstQuest);
  }

  // Νέα μέθοδος αποκλειστικά για την παρακολούθηση της προόδου των αποστολών.
  private _updateQuestProgress(): void {
    const currentQuest = this._questManager.getCurrentQuest();
    if (currentQuest && currentQuest.status === "active") {
      const objectivePos = this._world.getFirePointPosition(
        currentQuest.correctAnswer
      );
      if (objectivePos) {
        const playerPos = this._player.capsule.position;
        const distanceSq = Vector3.DistanceSquared(playerPos, objectivePos);

        if (distanceSq < 25) {
          // 5*5 = 25
          this.completeActiveQuest();
          this._hudDistance.innerText = "";
        } else {
          this._hudDistance.innerText = `${Math.sqrt(distanceSq).toFixed(0)}m`;
        }
      }
    } else {
      this._hudDistance.innerText = "";
    }
  }

  private onQuestAdvanced(quest: Quest | null): void {
    this._world.hideAllFires();
    if (quest) {
      this._hudQuestTitle.innerText = quest.title;
      this._hudQuestObjective.innerText = quest.riddle;
      this._world.showFireAtPoint(quest.correctAnswer);
    } else {
      this._hudQuestTitle.innerText = "Όλες οι Αποστολές Ολοκληρώθηκαν!";
      this._hudQuestObjective.innerText = "Έσωσες την πόλη!";
      this._hudDistance.innerText = "";
    }
  }

  private renderQuestList(): void {
    this._questListContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const quests = this._questManager.getAllQuests();

    quests.forEach((quest) => {
      const questItem = document.createElement("div");
      questItem.className =
        "p-4 rounded-lg cursor-pointer border-2 border-transparent";
      questItem.innerHTML = `<h3 class="text-2xl">${quest.title}</h3>`;

      switch (quest.status) {
        case "completed":
          questItem.classList.add("text-gray-500");
          break;
        case "active":
          questItem.classList.add("quest-item-active");
          break;
        case "locked":
          questItem.classList.add("text-gray-700");
          break;
      }

      questItem.addEventListener("click", () => this.renderQuestDetails(quest));
      fragment.appendChild(questItem);
    });

    this._questListContainer.appendChild(fragment);
  }

  private renderQuestDetails(quest: Quest): void {
    this._detailsQuestTitle.innerText = quest.title;
    this._detailsQuestRiddle.innerText = quest.riddle;
    this._detailsSuccessMessage.classList.add("hidden");
  }

  private completeActiveQuest(): void {
    const currentQuest = this._questManager.getCurrentQuest();
    if (!currentQuest || currentQuest.status !== "active") return;

    this._questManager.submitAnswer(currentQuest.correctAnswer);
    this.renderQuestDetails(currentQuest);

    this._detailsSuccessMessage.classList.remove("hidden");
    this._detailsSuccessText.innerText = currentQuest.successMessage;
    this._questLogPanel.classList.remove("hidden");
    this.renderQuestList();
  }
}
