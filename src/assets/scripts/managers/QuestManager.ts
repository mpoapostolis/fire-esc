import { quests, type Quest } from "../quests/quests";

export class QuestManager {
  private _quests: Quest[];

  constructor() {
    this._quests = JSON.parse(JSON.stringify(quests));
    // Ενεργοποιούμε το πρώτο quest μόνο αν δεν περιμένει κάποιο trigger
    if (this._quests.length > 0 && !this._quests[0].trigger) {
      this._quests[0].status = "active";
    }
  }

  public getAllQuests = (): Quest[] => this._quests;
  public getQuestById = (id: number): Quest | undefined =>
    this._quests.find((q) => q.id === id);
  public getCurrentQuest = (): Quest | undefined =>
    this._quests.find((q) => q.status === "active");

  /**
   * Ενεργοποιεί ένα quest με βάση το ID του, αν είναι κλειδωμένο.
   */
  public activateQuestById = (id: number): void => {
    const quest = this.getQuestById(id);
    if (quest && quest.status === "locked") {
      quest.status = "active";
      console.log(`Quest "${quest.title}" is now active.`);
    }
  };

  /**
   * Ολοκληρώνει το τρέχον quest και επιστρέφει το επόμενο για να αποφασίσει το Game.ts τι θα κάνει.
   * @returns Το επόμενο quest αν υπάρχει, αλλιώς null.
   */
  public completeCurrentQuestAndGetNext = (): Quest | null => {
    const currentQuest = this.getCurrentQuest();
    if (!currentQuest) return null;

    currentQuest.status = "completed";

    const nextQuestIndex =
      this._quests.findIndex((q) => q.id === currentQuest.id) + 1;
    if (nextQuestIndex < this._quests.length) {
      return this._quests[nextQuestIndex];
    }

    return null; // Δεν υπάρχουν άλλα quests
  };
}
