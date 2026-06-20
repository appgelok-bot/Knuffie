
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  DATE_PLANNER = 'DATE_PLANNER',
  LOVE_LETTERS = 'LOVE_LETTERS',
  SETTINGS = 'SETTINGS',
  GAMES = 'GAMES'
}

export enum NoteColor {
  YELLOW = 'bg-yellow-100',
  PINK = 'bg-pink-100',
  BLUE = 'bg-blue-100',
  GREEN = 'bg-green-100',
  PURPLE = 'bg-purple-100'
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  partnerNickname?: string;
  photoURL?: string; 
  coupleId: string | null;
  lastSeen?: number; 
}

export interface StickyNote {
  id: string;
  coupleId: string;
  content: string;
  color: NoteColor;
  author: string;
  authorPhoto?: string; 
  timestamp: number;
  rotation: number;
}

export interface DailyQuestionAnswer {
  questionId: string;
  userId: string;
  userName: string;
  answer: string;
  timestamp: number;
}

export interface UserSettings {
  userName: string;
  partnerName: string; 
  anniversary: string;
}

export interface MoodEntry {
  userId: string;
  coupleId: string;
  userName: string;
  userPhoto?: string;
  mood: string;
  label: string;
  timestamp: number;
}

export interface CoupleData {
  coupleId: string;
  anniversaryDate: string | null;
  proposedDate: string | null;
  proposedBy: string | null;
  status: 'set' | 'pending' | null;
  dailyQuestion?: string;
  dailyQuestionDate?: string;
}

export interface DateIdea {
  title: string;
  description: string;
  estimatedCost: string;
  locationType: string;
  romanticTip: string;
}

// --- GAME TYPES ---

export type TileColor = 'red' | 'blue' | 'black' | 'orange';

export interface RummiTile {
  id: string;
  number: number; 
  color: TileColor | 'joker';
  isJoker: boolean;
}

export interface GameState {
  gameActive: boolean;
  isPracticeMode?: boolean; // Tegen AI
  deck: RummiTile[];
  board: RummiTile[][]; 
  player1: { uid: string; name: string; hand: RummiTile[]; hasMelded: boolean };
  player2: { uid: string; name: string; hand: RummiTile[]; hasMelded: boolean };
  currentTurnUid: string;
  turnStartTime: number;
  winner: string | null;
  lastUpdate: number;
}

export interface GameRequest {
  id: string;
  fromUid: string;
  fromName: string;
  gameType: 'rummikub';
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}
