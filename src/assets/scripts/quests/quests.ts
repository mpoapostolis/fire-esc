import { getObject, t } from "../i18n";

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  feedback: string;
  failureMessage: string;
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

// SCENE 1: Park (vs Playground)
// Helper to get quiz data safely
const getQuiz = (questKey: string): Quiz | undefined => {
  const quizData = getObject<any>(`quests.${questKey}.quiz`);
  if (!quizData) return undefined;

  return {
    question: quizData.question,
    options: quizData.options,
    correctIndex: quizData.correctIndex,
    feedback: quizData.feedback,
    failureMessage: quizData.failureMessage || "Δεν τα πήγες καλά." // Fallback if missing in JSON
  };
};

export const getQuests = (): Quest[] => [
  {
    id: 1,
    title: t("quests.quest1.title"),
    point: { x: -4.95, z: -4.50 },
    spawn_point: { x: 3.96, z: -13.88 },
    riddle: t("quests.quest1.riddle"),
    successMessage: t("quests.quest1.successMessage"),
    status: "active",
    trigger: "phonecall",
    caller: t("quests.quest1.caller"),
    quiz: getQuiz("quest1"),
    mapq: 1,
    character: "nikos.glb",
  },
  // SCENE 2: Stadium (vs School Yard)
  {
    id: 2,
    title: t("quests.quest2.title"),
    point: { x: 26.90, z: -33.80 },
    spawn_point: { x: 13.38, z: -22.88 },
    riddle: t("quests.quest2.riddle"),
    successMessage: t("quests.quest2.successMessage"),
    changeCameraTarget: "skater",
    status: "locked",
    caller: t("quests.quest2.caller"),
    trigger: "direct",
    quiz: getQuiz("quest2"),
    mapq: 2,
    character: "sick_kid.glb",
  },
  // SCENE 3: Pool (vs Lake)
  {
    id: 3,
    title: t("quests.quest3.title"),
    point: { x: -27.40, z: -32.94 },
    spawn_point: { x: -29.18, z: -17.55 },
    riddle: t("quests.quest3.riddle"),
    successMessage: t("quests.quest3.successMessage"),
    status: "locked",
    trigger: "direct",
    changeCameraTarget: "skater",
    caller: t("quests.quest3.caller"),
    quiz: getQuiz("quest3"),
    mapq: 3,
    character: "sick_kid.glb",
  },
  // SCENE 4: School Yard (vs Road)
  {
    id: 4,
    title: t("quests.quest4.title"),
    point: { x: 24.63, z: -16.90 },
    spawn_point: { x: 36.16, z: -23.45 },
    riddle: t("quests.quest4.riddle"),
    successMessage: t("quests.quest4.successMessage"),
    status: "locked",
    trigger: "phonecall",
    caller: t("quests.quest4.caller"),
    quiz: getQuiz("quest4"),
    mapq: 4,
    character: "sick_kid_2.glb",
  },
  // SCENE 5: City Hall (vs Church)
  {
    id: 5,
    title: t("quests.quest5.title"),
    point: { x: -0.90, z: -31.56 },
    spawn_point: { x: -7.87, z: -29.52 },
    riddle: t("quests.quest5.riddle"),
    successMessage: t("quests.quest5.successMessage"),
    status: "locked",
    trigger: "phonecall",
    caller: t("quests.quest5.caller"),
    quiz: getQuiz("quest5"),
    mapq: 5,
    character: "sick_kid.glb",
  },
  // FALSE ALARM QUESTS (6-10)
  {
    id: 6,
    title: t("quests.quest6.title"),
    point: { x: 32.37, z: 31.45 },
    spawn_point: { x: 32.37, z: 31.45 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 6
  },
  {
    id: 7,
    title: t("quests.quest7.title"),
    point: { x: 31.40, z: -5.01 },
    spawn_point: { x: 31.40, z: -5.01 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 7
  },
  {
    id: 8,
    title: t("quests.quest8.title"),
    point: { x: -29.99, z: 20.88 },
    spawn_point: { x: -29.99, z: 20.88 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 8
  },
  {
    id: 9,
    title: t("quests.quest9.title"),
    point: { x: -34.30, z: 2.26 },
    spawn_point: { x: -34.30, z: 2.26 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 9
  },
  {
    id: 10,
    title: t("quests.quest10.title"),
    point: { x: 3.91, z: 6.53 },
    spawn_point: { x: 3.91, z: 6.53 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 10
  }
];
