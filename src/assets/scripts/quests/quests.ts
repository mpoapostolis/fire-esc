import { getObject, t } from "../i18n";

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  feedback: string;
  failureMessage: string;
  optionFeedback?: string[];
  conclusion?: string;
}

export interface Quest {
  id: number;
  title: string;
  point: { x: number; z: number };
  spawn_point: { x: number; z: number };
  riddle: string;
  successMessage: string;
  changeCameraTarget?: string;
  status: "locked" | "active" | "completed";
  trigger?: "phonecall" | "direct";
  caller?: string;
  isFake?: boolean;
  mapq?: number;
  quiz?: Quiz;
  character?: string;
}

const buildQuestQuiz = (questNum: number, correctIndex: number): Quiz => {
  const key = `quests.quest${questNum}.quiz`;
  const options = getObject<string[]>(`${key}.options`) || [];
  const optionFeedback = getObject<string[]>(`${key}.optionFeedback`) || [];
  const conclusion = t(`${key}.conclusion`);
  return {
    question: t(`${key}.question`),
    options,
    correctIndex,
    feedback: optionFeedback[correctIndex] || "",
    failureMessage: t("game.messages.quizFailMessage"),
    optionFeedback,
    conclusion: conclusion !== `${key}.conclusion` ? conclusion : undefined,
  };
};

export const getQuests = (): Quest[] => [
  // ===== ΚΛΗΣΗ 1: Δημαρχείο - Earthquake drill =====
  {
    id: 1,
    title: "Δημαρχείο",
    point: { x: 4.15, z: 4.73 },
    spawn_point: { x: 3.82, z: -3.84 },
    riddle: t("quests.quest1.riddle"),
    successMessage: t("quests.quest1.successMessage"),
    status: "active",
    mapq: 1,
    caller: t("quests.quest1.caller"),
    quiz: buildQuestQuiz(1, 0),
  },
  // ===== ΚΛΗΣΗ 2: Σπίτι Μαρίας - Earthquake protection =====

  {
    id: 2,
    title: "Σπίτι Μαρίας",
    point: { x: -0.19, z: 26.28 },
    spawn_point: {
      x: -10.24,
      z: 10.98,
    },
    riddle: t("quests.quest2.riddle"),
    successMessage: t("quests.quest2.successMessage"),
    status: "locked",
    mapq: 2,
    caller: t("quests.quest2.caller"),
    quiz: buildQuestQuiz(2, 1),
  },
  // ===== ΚΛΗΣΗ 3: Σπίτι Κωνσταντίνου - Furniture securing =====
  {
    id: 3,
    title: "Σπίτι Κων/νου",
    point: { x: 35.62, z: 39.97 },
    spawn_point: { x: 29.77, z: 35.9 },
    riddle: t("quests.quest3.riddle"),
    successMessage: t("quests.quest3.successMessage"),
    status: "locked",
    mapq: 3,
    caller: t("quests.quest3.caller"),
    quiz: buildQuestQuiz(3, 0),
  },
  // ===== ΚΛΗΣΗ 4: Δρόμος βουνού - Landslide =====
  {
    id: 4,
    title: "Δρόμος Βουνού",
    point: { x: -10.83, z: 23.14 },
    spawn_point: { x: 1.72, z: 19.98 },
    riddle: t("quests.quest4.riddle"),
    successMessage: t("quests.quest4.successMessage"),
    status: "locked",
    mapq: 4,
    caller: t("quests.quest4.caller"),
    quiz: buildQuestQuiz(4, 1),
  },
  // ===== ΚΛΗΣΗ 5: Γειτονιά ηφαιστείου - Evacuation =====
  {
    id: 5,
    title: "Γειτονιά Ηφαιστείου",
    point: { x: 8.22, z: -30.49 },
    spawn_point: { x: 1.49, z: -30.65 },
    riddle: t("quests.quest5.riddle"),
    successMessage: t("quests.quest5.successMessage"),
    status: "locked",
    mapq: 5,
    caller: t("quests.quest5.caller"),
    quiz: buildQuestQuiz(5, 2),
  },
  // ===== ΚΛΗΣΗ 6: Σπίτι Λουκίας - Volcano safety =====
  {
    id: 6,
    title: "Σπίτι Λουκίας",
    point: { x: -38.03, z: -21.88 },
    spawn_point: { x: -41.81, z: -10.01 },
    riddle: t("quests.quest6.riddle"),
    successMessage: t("quests.quest6.successMessage"),
    status: "locked",
    mapq: 6,
    caller: t("quests.quest6.caller"),
    quiz: buildQuestQuiz(6, 1),
  },
  // ===== ΚΛΗΣΗ 7: Αυλή σπιτιού - Post-earthquake safety =====
  {
    id: 7,
    title: "Αυλή Σπιτιού",
    point: { x: -30.48, z: 1.25 },
    spawn_point: { x: -19.03, z: -6.54 },
    riddle: t("quests.quest7.riddle"),
    successMessage: t("quests.quest7.successMessage"),
    status: "locked",
    mapq: 7,
    caller: t("quests.quest7.caller"),
    quiz: buildQuestQuiz(7, 0),
  },
  // ===== ΚΛΗΣΗ 8: Εργοστάσιο - Gas leak after earthquake =====
  {
    id: 8,
    title: "Εργοστάσιο",
    point: { x: 33.61, z: 12.5 },
    spawn_point: { x: 23.28, z: 14.72 },
    riddle: t("quests.quest8.riddle"),
    successMessage: t("quests.quest8.successMessage"),
    status: "locked",
    mapq: 8,
    caller: t("quests.quest8.caller"),
    quiz: buildQuestQuiz(8, 1),
  },
  // ===== ΚΛΗΣΗ 9: Σπίτι Βασιλικής - Emergency kit =====
  {
    id: 9,
    title: "Σπίτι Βασιλικής",
    point: { x: -15.23, z: -44.09 },
    spawn_point: { x: -7.57, z: -44.32 },
    riddle: t("quests.quest9.riddle"),
    successMessage: t("quests.quest9.successMessage"),
    status: "locked",
    mapq: 9,
    caller: t("quests.quest9.caller"),
    quiz: buildQuestQuiz(9, 1),
  },
  // ===== ΚΛΗΣΗ 10: Δρόμος γειτονιάς - Downed power lines =====
  {
    id: 10,
    title: "Δρόμος Γειτονιάς",
    point: { x: -10.33, z: 3.29 },
    spawn_point: { x: -8.97, z: -9.01 },
    riddle: t("quests.quest10.riddle"),
    successMessage: t("quests.quest10.successMessage"),
    status: "locked",
    mapq: 10,
    caller: t("quests.quest10.caller"),
    quiz: buildQuestQuiz(10, 2),
  },
];
