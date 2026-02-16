import { getQuests, type Quest } from "../quests/quests";

export class QuestManager {
  private _quests: Quest[];

  constructor() {
    this._quests = getQuests();
    if (this._quests.length > 0) {
      this._quests[0].status = "active";
    }
  }

  public getAllQuests = (): Quest[] => this._quests;
  public getQuestById = (id: number): Quest | undefined =>
    this._quests.find((q) => q.id === id);
  public getCurrentQuest = (): Quest | undefined =>
    this._quests.find((q) => q.status === "active" && !q.isFake);

  public activateQuestById = (id: number): void => {
    const quest = this.getQuestById(id);
    if (quest && quest.status === "locked") {
      quest.status = "active";
    }
  };

  /**
   * Complete current quest and return next non-fake quest.
   */
  public completeCurrentQuestAndGetNext = (): Quest | null => {
    const currentQuest = this.getCurrentQuest();
    if (!currentQuest) return null;

    currentQuest.status = "completed";

    const currentIndex = this._quests.findIndex((q) => q.id === currentQuest.id);
    // Find next non-fake quest
    for (let i = currentIndex + 1; i < this._quests.length; i++) {
      if (!this._quests[i].isFake) {
        return this._quests[i];
      }
    }

    return null;
  };

  /**
   * Get count of completed non-fake quests.
   */
  public getCompletedCount = (): number => {
    return this._quests.filter((q) => q.status === "completed" && !q.isFake).length;
  };
}
