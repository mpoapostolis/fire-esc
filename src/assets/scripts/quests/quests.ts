export interface Quest {
  id: number;
  title: string;
  riddle: string;
  correctAnswer: number;
  successMessage: string;
  status: "locked" | "active" | "completed";
  trigger?: "phonecall" | "direct";
  caller?: string;
}

export const quests: Quest[] = [
  {
    id: 1,
    title: "The First Spark",
    riddle:
      "Το βράδυ ανάψαμε φωτιά\nΚαι τραγουδούσαμε γύρω τριγύρω:\nΦωτιά ωραία φωτιά μη λυπηθείς τα κούτσουρα\nΦωτιά ωραία φωτιά μη φτάσεις ως τη στάχτη\nΦωτιά ωραία φωτιά καίγε μας\nλέγε μας τη ζωή.",
    correctAnswer: 6,
    successMessage:
      "Τα πάρκα της πόλης θα πρέπει να είναι καθαρισμένα από πεσμένα κούτσουρα, κλαδιά και ξερά φύλλα! Ευτυχώς, έσβησες άμεσα την πρώτη φωτιά!",
    status: "locked",
    trigger: "phonecall",
    caller: "Βαθιά Φωνή",
  },
  {
    id: 2,
    title: "The Red Herring",
    riddle:
      "Υπάρχουν πολλά κόκκινα που κινούνται παντού, αλλά εσύ ψάχνεις αυτό που βρίσκεται πιο ανατολικά από τα υπόλοιπα.",
    correctAnswer: 10,
    successMessage:
      "Εξαιτίας της διαρροής βενζίνης, το αυτοκίνητο πήρε φωτιά! Άλλη μια εστία φωτιάς που κατάφερες να σβήσεις!",
    status: "locked",
    trigger: "direct",
  },
  {
    id: 3,
    title: "A Burning Problem",
    riddle:
      "Κάνει ζημιά στην υγεία του ανθρώπου και όχι μόνο. Αν το πετάξει κάποιος εκεί μέσα, μπορεί να κάψει ολόκληρη την πόλη!",
    correctAnswer: 8,
    successMessage:
      "Κάποιος/α ασυνείδητος/η πέταξε μια γόπα από τσιγάρο μέσα στον σκουπιδοτενεκέ. Ευτυχώς, πρόλαβες τα χειρότερα!",
    status: "locked",
    trigger: "phonecall",
  },
  {
    id: 4,
    title: "Unlucky Number",
    riddle:
      "Μην ποντάρεις ποτέ στο νούμερο 15! Θα φέρει την καταστροφή στην πόλη!",
    correctAnswer: 5,
    successMessage:
      "Έφτασες γρήγορα και έσωσες τους ανθρώπους που κουνούσαν μαντίλια στα παράθυρα της πολυκατοικίας. Η φωτιά είχε ξεσπάσει από μια ηλεκτρική κουζίνα που ο ιδιοκτήτης ξέχασε αναμμένη.",
    status: "locked",
    trigger: "direct",
  },
  {
    id: 5,
    title: "Race Against Time",
    riddle:
      "Η ώρα πήγε 5… Μήπως άργησες να προλάβεις την τελευταία εστία φωτιάς; Τρέξε για να δραπετεύσεις από τη φωτιά!",
    correctAnswer: 9,
    successMessage:
      "Μπράβο σου! Κατάφερες να σβήσεις μέχρι και την τελευταία εστία φωτιάς που είχε ξεσπάσει στο Δημαρχείο. Η φωτιά ξεκίνησε από ένα βραχυκύκλωμα στο αρχείο του Δημαρχείου. Γλίτωσες την πόλη από αστική πυρκαγιά! Η εκπαίδευσή σου άξιζε τον κόπο!!!!",
    status: "locked",
    trigger: "direct",
  },
];
