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

const buildProposalQuiz = (
  correctIndex: number,
  useVariant: boolean = false,
): Quiz => {
  const optionsKey = useVariant
    ? "game.proposals.optionsVariant"
    : "game.proposals.options";
  const options = getObject<string[]>(optionsKey) || [];
  return {
    question: t("game.proposals.question"),
    options,
    correctIndex,
    feedback: t("game.proposals.feedback"),
    failureMessage: t("game.proposals.failureMessage"),
  };
};

export const getQuests = (): Quest[] => [
  // ===== SCENE 1: Coast (Ακτή) =====
  {
    id: 1,
    title: t("quests.quest1.title"),
    point: { x: 55, z: 30 },
    spawn_point: { x: 55, z: 30 },
    riddle: t("quests.quest1.riddle"),
    successMessage: t("quests.quest1.successMessage"),
    status: "active",
    mapq: 1,
    quiz: buildProposalQuiz(5), // κατασκευή αναχωμάτων (Index 5)
  },
  // ===== SCENE 2: River (Ποτάμι) =====
  {
    id: 2,
    title: t("quests.quest2.title"),
    point: { x: 0, z: -40 },
    spawn_point: { x: 0, z: -40 },
    riddle: t("quests.quest2.riddle"),
    successMessage: t("quests.quest2.successMessage"),
    status: "locked",
    mapq: 2,
    quiz: buildProposalQuiz(6), // φράγματα ποταμού (Index 6)
  },
  // ===== SCENE 3: Concrete (Τσιμέντο) =====
  {
    id: 3,
    title: t("quests.quest3.title"),
    point: { x: -50, z: -40 },
    spawn_point: { x: -50, z: -40 },
    riddle: t("quests.quest3.riddle"),
    successMessage: t("quests.quest3.successMessage"),
    status: "locked",
    mapq: 3,
    quiz: buildProposalQuiz(1), // μη διαπερατές → διαπερατές (Index 1)
  },
  // ===== SCENE 4: River vegetation (Βλάστηση ποταμού) =====
  {
    id: 4,
    title: t("quests.quest4.title"),
    point: { x: 15, z: 45 },
    spawn_point: { x: 15, z: 45 },
    riddle: t("quests.quest4.riddle"),
    successMessage: t("quests.quest4.successMessage"),
    status: "locked",
    mapq: 4,
    quiz: buildProposalQuiz(7), // πράσινο ποταμιού (Index 7: "preserve greenery around river")
  },
  // ===== SCENE 5: Old sewer (Παλιός υπόνομος) =====
  {
    id: 5,
    title: t("quests.quest5.title"),
    point: { x: -30, z: -70 },
    spawn_point: { x: -30, z: -70 },
    riddle: t("quests.quest5.riddle"),
    successMessage: t("quests.quest5.successMessage"),
    status: "locked",
    mapq: 5,
    quiz: buildProposalQuiz(4), // αναβάθμιση αποστράγγισης (Index 4)
  },
  // ===== SCENE 6: Blocked sewer (Φραγμένος υπόνομος) =====
  {
    id: 6,
    title: t("quests.quest6.title"),
    point: { x: 45, z: -35 },
    spawn_point: { x: 45, z: -35 },
    riddle: t("quests.quest6.riddle"),
    successMessage: t("quests.quest6.successMessage"),
    status: "locked",
    mapq: 6,
    quiz: buildProposalQuiz(3), // καθαρισμός αγωγών (Index 3)
  },
  // ===== SCENE 7: Ruined buildings (Ερείπια κτιρίων) =====
  {
    id: 7,
    title: t("quests.quest7.title"),
    point: { x: -65, z: 10 },
    spawn_point: { x: -65, z: 10 },
    riddle: t("quests.quest7.riddle"),
    successMessage: t("quests.quest7.successMessage"),
    status: "locked",
    mapq: 7,
    quiz: buildProposalQuiz(0), // χώροι πρασίνου (Index 0)
  },
  // ===== SCENE 8: Trees near sea (Δέντρα θάλασσας) =====
  {
    id: 8,
    title: t("quests.quest8.title"),
    point: { x: 70, z: 70 },
    spawn_point: { x: 70, z: 70 },
    riddle: t("quests.quest8.riddle"),
    successMessage: t("quests.quest8.successMessage"),
    status: "locked",
    mapq: 8,
    quiz: buildProposalQuiz(8), // παράκτιες ζώνες (Index 8)
  },
  // ===== SCENE 9: River banks (Όχθες ποταμού) - uses variant proposals =====
  {
    id: 9,
    title: t("quests.quest9.title"),
    point: { x: -20, z: 55 },
    spawn_point: { x: -20, z: 55 },
    riddle: t("quests.quest9.riddle"),
    successMessage: t("quests.quest9.successMessage"),
    status: "locked",
    mapq: 9,
    quiz: buildProposalQuiz(2, true), // φυσικές όχθες (Variant Index 2)
  },
  // ===== SCENE 10: Sewer grates (Σχάρες υπονόμων) - uses variant proposals =====
  {
    id: 10,
    title: t("quests.quest10.title"),
    point: { x: 50, z: -10 },
    spawn_point: { x: 50, z: -10 },
    riddle: t("quests.quest10.riddle"),
    successMessage: t("quests.quest10.successMessage"),
    status: "locked",
    mapq: 10,
    quiz: buildProposalQuiz(9, true), // δίκτυο όμβριων (Variant Index 9)
  },
  // ===== FAKE POINTS (wrong locations) =====
  {
    id: 11,
    title: t("quests.quest11.title"),
    point: { x: -45, z: -15 },
    spawn_point: { x: -45, z: -15 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 11,
  },
  {
    id: 12,
    title: t("quests.quest12.title"),
    point: { x: 35, z: 5 },
    spawn_point: { x: 35, z: 5 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 12,
  },
  {
    id: 13,
    title: t("quests.quest13.title"),
    point: { x: -60, z: -30 },
    spawn_point: { x: -60, z: -30 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 13,
  },
  {
    id: 14,
    title: t("quests.quest14.title"),
    point: { x: 60, z: -25 },
    spawn_point: { x: 60, z: -25 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 14,
  },
  {
    id: 15,
    title: t("quests.quest15.title"),
    point: { x: 10, z: 10 },
    spawn_point: { x: 10, z: 10 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 15,
  },
  {
    id: 16,
    title: t("quests.quest16.title"),
    point: { x: -55, z: 35 },
    spawn_point: { x: -55, z: 35 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 16,
  },
  {
    id: 17,
    title: t("quests.quest17.title"),
    point: { x: 30, z: 60 },
    spawn_point: { x: 30, z: 60 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 17,
  },
  {
    id: 18,
    title: t("quests.quest18.title"),
    point: { x: -15, z: -55 },
    spawn_point: { x: -15, z: -55 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 18,
  },
];
