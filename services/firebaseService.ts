
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, where, orderBy,
  setDoc, getDoc, serverTimestamp, limit, deleteField
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
  User
} from "firebase/auth";
import { StickyNote, MoodEntry, UserProfile, CoupleData, GameState, GameRequest, DailyQuestionAnswer, NoteColor } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAxiG2U-qJhYCfiPuqGNcoDyl_4th9SUMo",
  authDomain: "schat-c048d.firebaseapp.com",
  projectId: "schat-c048d",
  storageBucket: "schat-c048d.firebasestorage.app",
  messagingSenderId: "737587179570",
  appId: "1:737587179570:web:93eef439ba9079e9560c2b",
  measurementId: "G-6Y4TX0X1RL"
};

export const useFirebase = true; 

let app, db: any, auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

// --- AUTH ---
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
};

export const logoutUser = () => auth ? signOut(auth) : Promise.resolve();

// --- USER PROFILE ---
export const subscribeToUserProfile = (uid: string, callback: (p: UserProfile | null) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) callback(docSnap.data() as UserProfile);
    else callback(null);
  });
};

export const updateUserProfileData = async (uid: string, data: Partial<UserProfile>) => {
    if (!db) return;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "users", uid), cleanData, { merge: true });
};

export const updateUserPresence = async (uid: string) => {
    if (!db) return;
    await setDoc(doc(db, "users", uid), { lastSeen: Date.now() }, { merge: true });
};

export const subscribeToPartnerProfile = (coupleId: string, myUid: string, callback: (p: UserProfile | null) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "users"), where("coupleId", "==", coupleId));
    return onSnapshot(q, (snapshot) => {
        let found = false;
        snapshot.forEach((doc) => { if (doc.id !== myUid) { callback(doc.data() as UserProfile); found = true; } });
        if (!found) callback(null);
    });
}

// --- COUPLE DATA ---
export const subscribeToCoupleData = (coupleId: string, cb: (d: CoupleData | null) => void) => {
    if(!db) return () => {};
    return onSnapshot(doc(db, "couples", coupleId), (s) => {
        if(s.exists()) cb(s.data() as CoupleData);
        else cb(null);
    });
}

export const updateCoupleData = async (coupleId: string, data: Partial<CoupleData>) => {
    if(!db) return;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await updateDoc(doc(db, "couples", coupleId), cleanData);
}

// --- NOTES ---
export const subscribeToNotes = (coupleId: string, callback: (notes: StickyNote[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, "notes"), where("coupleId", "==", coupleId));
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StickyNote));
    notes.sort((a, b) => b.timestamp - a.timestamp);
    callback(notes);
  });
};

export const addNoteToFirebase = async (note: StickyNote) => {
  if (!db) return;
  const { id, ...data } = note;
  await addDoc(collection(db, "notes"), data);
};

export const updateNoteInFirebase = async (id: string, content: string, color?: NoteColor) => {
    if (!db) return;
    const updateData: any = { content };
    if (color) updateData.color = color;
    await updateDoc(doc(db, "notes", id), updateData);
};

export const deleteNoteFromFirebase = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "notes", id));
};

// --- DAILY QUESTIONS ---
export const saveDailyAnswer = async (coupleId: string, answer: DailyQuestionAnswer) => {
    if (!db) return;
    const qId = answer.questionId.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, "couples", coupleId, "answers", `${qId}_${answer.userId}`), answer);
};

export const subscribeToDailyAnswers = (coupleId: string, questionId: string, cb: (ans: DailyQuestionAnswer[]) => void) => {
    if (!db) return () => {};
    const qCol = collection(db, "couples", coupleId, "answers");
    const q = query(qCol, where("questionId", "==", questionId));
    return onSnapshot(q, (snapshot) => {
        const answers = snapshot.docs.map(doc => doc.data() as DailyQuestionAnswer);
        cb(answers);
    });
};

// --- MOODS ---
export const subscribeToMoods = (coupleId: string, callback: (moods: MoodEntry[]) => void) => {
  if (!db) return () => {};
  const moodCol = collection(db, "couples", coupleId, "moods");
  return onSnapshot(moodCol, (snapshot) => {
    const moods = snapshot.docs.map(doc => doc.data() as MoodEntry);
    callback(moods);
  });
};

export const updateMoodInFirebase = async (mood: MoodEntry) => {
  if (!db) return;
  const safeMood = { ...mood, userPhoto: mood.userPhoto || null, userName: mood.userName || 'Gebruiker' };
  await setDoc(doc(db, "couples", mood.coupleId, "moods", mood.userId), safeMood, { merge: true });
};

// --- GAMES ---
export const sendGameRequest = async (coupleId: string, request: GameRequest) => {
    if(!db) return;
    await setDoc(doc(db, "couples", coupleId, "game_data", "invite"), { ...request, fromName: request.fromName || 'Partner' });
};

export const subscribeToGameRequests = (coupleId: string, cb: (req: GameRequest | null) => void) => {
    if(!db) return () => {};
    return onSnapshot(doc(db, "couples", coupleId, "game_data", "invite"), (s) => {
        cb(s.exists() ? s.data() as GameRequest : null);
    });
};

export const deleteGameRequest = async (coupleId: string) => {
    if(!db) return;
    await deleteDoc(doc(db, "couples", coupleId, "game_data", "invite"));
};

export const subscribeToGame = (coupleId: string, cb: (g: GameState | null) => void) => {
    if(!db) return () => {};
    return onSnapshot(doc(db, "games", coupleId), (s) => {
        cb(s.exists() ? s.data() as GameState : null);
    });
}

export const updateGameState = async (coupleId: string, state: GameState) => {
    if(!db) return;
    await setDoc(doc(db, "games", coupleId), JSON.parse(JSON.stringify(state)));
}

export const initializeCouple = async (uid: string): Promise<string> => {
    if(!db) throw new Error("Database niet verbonden");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // FIXED: Typo doc(doc(db...)) verwijderd
    await setDoc(doc(db, "couples", code), { 
      coupleId: code, 
      members: [uid], 
      createdAt: serverTimestamp(), 
      anniversaryDate: null, 
      status: null 
    });
    await setDoc(doc(db, "users", uid), { coupleId: code }, { merge: true });
    return code;
};

export const joinCouple = async (uid: string, code: string) => {
    if(!db) throw new Error("Database niet verbonden");
    const coupleRef = doc(db, "couples", code);
    const coupleSnap = await getDoc(coupleRef);
    if (coupleSnap.exists()) {
        const data = coupleSnap.data();
        if (data.members.includes(uid)) return; 
        if (data.members.length >= 2) throw new Error("Dit koppel is al compleet!");
        await updateDoc(coupleRef, { members: [...data.members, uid] });
        await setDoc(doc(db, "users", uid), { coupleId: code }, { merge: true });
    } else throw new Error("Ongeldige koppelcode. Check de code van je partner.");
};

export const loginUser = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerUser = async (email: string, pass: string, name: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, email: email, displayName: name, coupleId: null, photoURL: null, lastSeen: Date.now() });
  }
  return cred.user;
};
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const unpairCouple = async (uid: string) => { if(!db) return; await updateDoc(doc(db, "users", uid), { coupleId: null }); }
