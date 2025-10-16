import { Vector3 } from "@babylonjs/core";
import type { idsOfObjects } from "../camera";

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

export const quests: Quest[] = [
  {
    id: 1,
    title: "The First Spark",
    point: { x: 2.5884740352630615, z: 6.506937026977539 },
    spawn_point: {
      x: -3.9238533973693848,
      z: -13.887053489685059,
    },
    riddle: `"Το βράδυ ανάψαμε φωτιά
Και τραγουδούσαμε γύρω τριγύρω:
Φωτιά ωραία φωτιά μη λυπηθείς τα κούτσουρα
Φωτιά ωραία φωτιά μη φτάσεις ως τη στάχτη
Φωτιά ωραία φωτιά καίγε μας
λέγε μας τη ζωή." \n
από το ποίημα του Οδ. Ελύτη «Ήλιος ο Πρώτος»`,
    successMessage:
      "Τα πάρκα της πόλης θα πρέπει να είναι καθαρισμένα από πεσμένα κούτσουρα, κλαδιά και ξερά φύλλα! Ευτυχώς, έσβησες άμεσα την πρώτη φωτιά!",
    status: "locked",
    trigger: "phonecall",
    caller: "112",
  },
  {
    id: 2,
    title: "The Red Herring",
    point: { x: 35.21452331542969, z: -13.330437660217285 },
    spawn_point: { x: 26.77629280090332, z: 12.804500579833984 },
    changeCameraTarget: "cyclist",
    riddle:
      "Υπάρχουν πολλά κόκκινα που κινούνται παντού, αλλά εσύ ψάχνεις αυτό που βρίσκεται πιο ανατολικά από τα υπόλοιπα.",
    successMessage:
      "Εξαιτίας της διαρροής βενζίνης, το αυτοκίνητο πήρε φωτιά! Άλλη μια εστία φωτιάς που κατάφερες να σβήσεις!",
    status: "locked",
    caller: "ΜΥΝΗΜΑ",
    trigger: "direct",
  },
  {
    id: 3,
    title: "A Burning Problem",
    spawn_point: { x: -44.017337799072266, z: 37.83137512207031 },
    point: { x: -49.462501525878906, z: 17.996505737304688 },
    riddle:
      "Κάνει ζημιά στην υγεία του ανθρώπου και όχι μόνο. Αν το πετάξει κάποιος εκεί μέσα, μπορεί να κάψει ολόκληρη την πόλη!",
    successMessage:
      "Κάποιος/α ασυνείδητος/η πέταξε μια γόπα από τσιγάρο μέσα στον σκουπιδοτενεκέ. Ευτυχώς, πρόλαβες τα χειρότερα!",
    status: "locked",
    caller: "Uknown",
    trigger: "phonecall",
  },
  {
    id: 4,
    title: "Unlucky Number",
    point: { x: 13.289116859436035, z: 32.81192398071289 },
    changeCameraTarget: "billboard",
    spawn_point: { x: 34.50505447387695, z: 21.381330490112305 },
    riddle:
      "Μην ποντάρεις ποτέ στο νούμερο 15! Θα φέρει την καταστροφή στην πόλη!",
    successMessage:
      "Έφτασες γρήγορα και έσωσες τους ανθρώπους που κουνούσαν μαντίλια στα παράθυρα της πολυκατοικίας. Η φωτιά είχε ξεσπάσει από μια ηλεκτρική κουζίνα που ο ιδιοκτήτης ξέχασε αναμμένη.",
    status: "locked",
    caller: "ΕΠΙΓΡΑΦΗ",
    trigger: "direct",
  },
  {
    id: 5,
    title: "Race Against Time",
    spawn_point: { x: 25.51080894470215, z: -8.761184692382812 },
    point: { x: 3.4120869636535645, z: -27.783315658569336 },
    riddle:
      "Η ώρα πήγε 5… Μήπως άργησες να προλάβεις την τελευταία εστία φωτιάς; Τρέξε για να δραπετεύσεις από τη φωτιά!",
    successMessage:
      "Μπράβο σου! Κατάφερες να σβήσεις μέχρι και την τελευταία εστία φωτιάς που είχε ξεσπάσει στο Δημαρχείο. Η φωτιά ξεκίνησε από ένα βραχυκύκλωμα στο αρχείο του Δημαρχείου. Γλίτωσες την πόλη από αστική πυρκαγιά! Η εκπαίδευσή σου άξιζε τον κόπο!!!!",
    status: "locked",
    caller: "",
    trigger: "direct",
  },
  {
    id: 6,
    title: "Fake 1",
    point: { x: 0, z: 0 },
    spawn_point: { x: 0, z: 0 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
  },
  {
    id: 7,
    title: "Fake 2",
    point: { x: -40, z: -40 },
    spawn_point: { x: -40, z: -40 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
  },
  {
    id: 8,
    title: "Fake 3",
    point: { x: 40, z: 40 },
    spawn_point: { x: 40, z: 40 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
  },
  {
    id: 9,
    title: "Fake 4",
    point: { x: -20, z: 20 },
    spawn_point: { x: -20, z: 20 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
  },
  {
    id: 10,
    title: "Fake 5",
    point: { x: 20, z: -20 },
    spawn_point: { x: 20, z: -20 },
    riddle: "",
    successMessage: "",
    status: "locked",
    isFake: true,
  },
];
