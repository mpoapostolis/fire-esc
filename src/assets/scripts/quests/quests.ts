import { i18n } from "../i18n";

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
}

/**
 * Get quest data with translations loaded from JSON
 */
function getQuestData(questNumber: number) {
  return i18n.getQuestData(questNumber);
}

export const quests: Quest[] = [
  {
    id: 1,
    get title() {
      return getQuestData(1).title;
    },
    point: { x: 2.5884740352630615, z: 6.506937026977539 },
    spawn_point: {
      x: -3.9238533973693848,
      z: -13.887053489685059,
    },
    get riddle() {
      return getQuestData(1).riddle;
    },
    get successMessage() {
      return getQuestData(1).successMessage;
    },
    status: "locked",
    trigger: "phonecall",
    get caller() {
      return getQuestData(1).caller;
    },
  },
  {
    id: 2,
    get title() {
      return getQuestData(2).title;
    },
    point: { x: 35.21452331542969, z: -13.330437660217285 },
    spawn_point: { x: 26.77629280090332, z: 12.804500579833984 },
    changeCameraTarget: "cyclist",
    get riddle() {
      return getQuestData(2).riddle;
    },
    get successMessage() {
      return getQuestData(2).successMessage;
    },
    status: "locked",
    get caller() {
      return getQuestData(2).caller;
    },
    trigger: "direct",
  },
  {
    id: 3,
    get title() {
      return getQuestData(3).title;
    },
    spawn_point: { x: -44.017337799072266, z: 37.83137512207031 },
    point: { x: -49.462501525878906, z: 17.996505737304688 },
    get riddle() {
      return getQuestData(3).riddle;
    },
    get successMessage() {
      return getQuestData(3).successMessage;
    },
    status: "locked",
    get caller() {
      return getQuestData(3).caller;
    },
    trigger: "phonecall",
  },
  {
    id: 4,
    get title() {
      return getQuestData(4).title;
    },
    point: { x: 13.289116859436035, z: 32.81192398071289 },
    changeCameraTarget: "billboard",
    spawn_point: {
      x: 12.182638168334961,
      z: 50.832664489746094,
    },
    get riddle() {
      return getQuestData(4).riddle;
    },
    get successMessage() {
      return getQuestData(4).successMessage;
    },
    status: "locked",
    get caller() {
      return getQuestData(4).caller;
    },
    trigger: "direct",
  },
  {
    id: 5,
    get title() {
      return getQuestData(5).title;
    },
    spawn_point: {
      x: 20.30816078186035,
      z: -29.072660446166992,
    },
    point: { x: 3.4120869636535645, z: -27.783315658569336 },
    get riddle() {
      return getQuestData(5).riddle;
    },
    get successMessage() {
      return getQuestData(5).successMessage;
    },
    status: "locked",
    get caller() {
      return getQuestData(5).caller;
    },
    trigger: "direct",
  },
];
