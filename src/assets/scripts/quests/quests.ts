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
  mapq?: number;
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
    spawn_point: { x: 19.066526412963867, z: 3.5244359970092773 },
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
    mapq: 6,
  },
  {
    id: 2,
    get title() {
      return getQuestData(2).title;
    },
    point: { x: 35.20489501953125, z: -13.273333549499512 },
    spawn_point: { x: 43.1906852722168, z: 5.397865295410156 },
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
    mapq: 10,
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
    mapq: 8,
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
    mapq: 5,
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
    mapq: 9,
  },
  {
    id: 6,
    title: "Fake 1",
    point: { x: -43.90224838256836, z: -28.06712532043457 },
    spawn_point: { x: -43.90224838256836, z: -28.06712532043457 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 1,
  },
  {
    id: 7,
    title: "Fake 2",
    point: {
      x: 48.21495056152344,
      z: -47.23374557495117,
    },
    spawn_point: {
      x: 48.21495056152344,
      z: -47.23374557495117,
    },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 2,
  },
  {
    id: 8,
    title: "Fake 3",
    point: {
      x: -12.433309555053711,
      z: 6.836219787597656,
    },
    spawn_point: { x: -18.937257766723633, z: 4.377799034118652 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 3,
  },
  {
    id: 9,
    title: "Fake 4",
    point: {
      x: -27.873905181884766,
      z: 10.253406524658203,
    },
    spawn_point: {
      x: -27.873905181884766,
      z: 10.253406524658203,
    },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 4,
  },
  {
    id: 10,
    title: "Fake 5",
    point: { x: 39.433624267578125, z: 29.225849151611328 },
    spawn_point: { x: 39.433624267578125, z: 29.225849151611328 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
    mapq: 7,
  },
];
