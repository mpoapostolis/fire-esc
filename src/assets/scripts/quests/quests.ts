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
  // ===== ΚΛΗΣΗ 1: Δημαρχείο (Town Hall) - Earthquake drill =====
  {
    id: 1,
    title: t("quests.quest1.title"),
    point: { x: -20.72, z: 55.7 },
    spawn_point: { x: -15.15, z: 52.36 },
    riddle: t("quests.quest1.riddle"),
    successMessage: t("quests.quest1.successMessage"),
    status: "active",
    mapq: 1,
    caller: t("quests.quest1.caller"),
    quiz: buildQuestQuiz(1, 0),
  },
  // ===== ΚΛΗΣΗ 2: Σπίτι Μαρίας (Maria's House) - Earthquake protection =====
  {
    id: 2,
    title: t("quests.quest2.title"),
    point: { x: 5.58, z: 1.92 },
    spawn_point: { x: 9.74, z: -6.23 },
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
    title: t("quests.quest3.title"),
    point: { x: 19.25, z: -13.32 },
    spawn_point: { x: 20.45, z: -20.49 },
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
    title: t("quests.quest4.title"),
    point: { x: 1.52, z: 20.31 },
    spawn_point: { x: 8.29, z: 17.48 },
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
    title: t("quests.quest5.title"),
    point: { x: 10.9, z: 35.45 },
    spawn_point: { x: 10.83, z: 28.19 },
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
    title: t("quests.quest6.title"),
    point: { x: -40.25, z: -45.3 },
    spawn_point: { x: -31.26, z: -44.36 },
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
    title: t("quests.quest7.title"),
    point: { x: -18.11, z: 17.29 },
    spawn_point: { x: -20.69, z: 10.82 },
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
    title: t("quests.quest8.title"),
    point: { x: 42.66, z: 54.11 },
    spawn_point: { x: 35.39, z: 53.93 },
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
    title: t("quests.quest9.title"),
    point: { x: -44.88, z: -0.41 },
    spawn_point: { x: -39.61, z: 6.03 },
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
    title: t("quests.quest10.title"),
    point: { x: 40.93, z: 1 },
    spawn_point: { x: 39.62, z: -5.8 },
    riddle: t("quests.quest10.riddle"),
    successMessage: t("quests.quest10.successMessage"),
    status: "locked",
    mapq: 10,
    caller: t("quests.quest10.caller"),
    quiz: buildQuestQuiz(10, 2),
  },
  // ===== FAKE POINTS =====
  {
    id: 11,
    title: t("quests.quest11.title"),
    point: { x: 21.31, z: 13.38 },
    spawn_point: { x: 21.31, z: 13.38 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 11,
  },
  {
    id: 12,
    title: t("quests.quest12.title"),
    point: { x: 33.91, z: 6.52 },
    spawn_point: { x: 33.91, z: 6.52 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 12,
  },
  {
    id: 13,
    title: t("quests.quest13.title"),
    point: { x: 35.16, z: -41.93 },
    spawn_point: { x: 35.16, z: -41.93 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 13,
  },
  {
    id: 14,
    title: t("quests.quest14.title"),
    point: { x: -4.56, z: 46.73 },
    spawn_point: { x: -4.56, z: 46.73 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 14,
  },
  {
    id: 15,
    title: t("quests.quest15.title"),
    point: { x: -4.56, z: 46.73 },
    spawn_point: { x: -4.56, z: 46.73 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 15,
  },
  {
    id: 16,
    title: t("quests.quest16.title"),
    point: { x: 32.51, z: -25.58 },
    spawn_point: { x: 32.51, z: -25.58 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 16,
  },
  {
    id: 17,
    title: t("quests.quest17.title"),
    point: { x: 3.52, z: -23.56 },
    spawn_point: { x: 5.52, z: -21.56 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 17,
  },
  {
    id: 18,
    title: t("quests.quest18.title"),
    point: { x: -19.31, z: -27.39 },
    spawn_point: { x: -19.31, z: -27.39 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 18,
  },
];
