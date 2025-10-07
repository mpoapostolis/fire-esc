import { quests } from "./quests";
import type { Quest } from "./quests";

export class QuestManager {
  public quests: Quest[];
  private currentQuestIndex: number;
  public trackedQuest: Quest | null = null;

  constructor() {
    this.quests = quests;
    // Set initial statuses
    this.quests.forEach((quest, index) => {
      quest.status = index === 0 ? "active" : "locked";
    });
    this.currentQuestIndex = 0;
    this.trackedQuest = this.quests[0]; // Track the first quest by default
  }

  getAllQuests(): Quest[] {
    return this.quests;
  }

  getCurrentQuest(): Quest | null {
    if (this.currentQuestIndex < this.quests.length) {
      return this.quests[this.currentQuestIndex];
    }
    return null;
  }

  setTrackedQuest(quest: Quest) {
    if (quest.status !== "locked") {
      this.trackedQuest = quest;
    }
  }

  submitAnswer(answer: number): boolean {
    const currentQuest = this.getCurrentQuest();
    if (currentQuest && currentQuest.correctAnswer === answer) {
      currentQuest.status = "completed";
      this.currentQuestIndex++;
      const nextQuest = this.getCurrentQuest();
      if (nextQuest) {
        nextQuest.status = "active";
        this.trackedQuest = nextQuest;
      }
      return true;
    }
    return false;
  }

  isGameFinished(): boolean {
    return this.currentQuestIndex >= this.quests.length;
  }
}
