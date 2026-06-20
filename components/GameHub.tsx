
import React, { useState, useEffect } from 'react';
import Rummikub from './Rummikub';
import { GameState, GameRequest, UserProfile, AppView } from '../types';
import { 
    subscribeToGame, sendGameRequest, subscribeToGameRequests, 
    deleteGameRequest, updateGameState 
} from '../services/firebaseService';
import { Gamepad2, ArrowLeft, Grid3X3, Loader2, Check, X, PlayCircle, AlertCircle, Sparkles, BrainCircuit } from 'lucide-react';

interface GameHubProps {
  userProfile: any;
  user: any;
  partnerProfile: UserProfile | null;
  setAppView: (view: AppView) => void;
}

const GameHub: React.FC<GameHubProps> = ({ userProfile, user, partnerProfile, setAppView }) => {
  const [activeGame, setActiveGame] = useState<'rummikub' | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [request, setRequest] = useState<GameRequest | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (userProfile?.coupleId) {
        const unsub = subscribeToGame(userProfile.coupleId, (state) => {
            setGameState(state);
            if (state && state.gameActive && !activeGame) {
                setActiveGame('rummikub');
            } else if (state && !state.gameActive && !state.winner) {
                setActiveGame(null);
            }
        });
        const unsubReq = subscribeToGameRequests(userProfile.coupleId, (req) => {
            setRequest(req);
            if (!req) setSendingInvite(false);
        });
        return () => { unsub(); unsubReq(); };
    }
  }, [userProfile?.coupleId]);

  const createDeck = () => {
      const colors: any[] = ['red', 'blue', 'black', 'orange'];
      let deck: any[] = [];
      let idCounter = 0;
      for (let set = 0; set < 2; set++) {
        colors.forEach(color => {
          for (let num = 1; num <= 13; num++) {
            deck.push({ id: `t_${idCounter++}`, number: num, color, isJoker: false });
          }
        });
      }
      deck.push({ id: `j_1`, number: 0, color: 'joker', isJoker: true });
      deck.push({ id: `j_2`, number: 0, color: 'joker', isJoker: true });
      return deck.sort(() => Math.random() - 0.5);
  };

  const startPracticeGame = async () => {
      if (!userProfile?.coupleId) return;
      const initialDeck = createDeck();
      const hand1 = initialDeck.splice(0, 14);
      const handAI = initialDeck.splice(0, 14);

      const newState: GameState = {
          gameActive: true,
          isPracticeMode: true,
          deck: initialDeck,
          board: [],
          player1: { uid: user.uid, name: userProfile.displayName, hand: hand1, hasMelded: false },
          player2: { uid: 'ai_bot_99', name: 'AI Bot', hand: handAI, hasMelded: false },
          currentTurnUid: user.uid,
          turnStartTime: Date.now(),
          winner: null,
          lastUpdate: Date.now()
      };
      await updateGameState(userProfile.coupleId, newState);
      setActiveGame('rummikub');
  };

  const handleSendInvite = async () => {
      if (!userProfile?.coupleId || !user?.uid || request) return;
      setSendingInvite(true);
      const newReq: GameRequest = { id: Date.now().toString(), fromUid: user.uid, fromName: userProfile.displayName || 'Partner', gameType: 'rummikub', timestamp: Date.now(), status: 'pending' };
      try { await sendGameRequest(userProfile.coupleId, newReq); } catch (e) { setSendingInvite(false); showToast("Oeps, uitnodiging mislukt."); }
  };

  const handleAccept = async () => {
      if (!request || !userProfile?.coupleId) return;
      const initialDeck = createDeck();
      const hand1 = initialDeck.splice(0, 14);
      const hand2 = initialDeck.splice(0, 14);
      const newState: GameState = {
          gameActive: true,
          deck: initialDeck, board: [],
          player1: { uid: request.fromUid, name: request.fromName, hand: hand1, hasMelded: false },
          player2: { uid: user.uid, name: userProfile.displayName || 'Jij', hand: hand2, hasMelded: false },
          currentTurnUid: request.fromUid, turnStartTime: Date.now(), winner: null, lastUpdate: Date.now()
      };
      await updateGameState(userProfile.coupleId, newState);
      await deleteGameRequest(userProfile.coupleId);
      setActiveGame('rummikub');
  };

  if (activeGame === 'rummikub' || (gameState && gameState.gameActive)) {
      return <div className="h-full flex flex-col bg-[#1a0d11]"><Rummikub coupleId={userProfile.coupleId!} gameState={gameState} userId={user.uid} userName={userProfile.displayName} partnerProfile={partnerProfile} /></div>;
  }

  const hasOutgoingInvite = request && request.fromUid === user.uid;

  return (
    <div className="space-y-6 pb-20 p-4 animate-in fade-in duration-500">
       {toast && (
           <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-5 py-2.5 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-top-5">
               <AlertCircle size={14} className="text-rose-400" />
               <span className="text-xs font-bold">{toast}</span>
           </div>
       )}

       {request && request.fromUid !== user.uid && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/60 backdrop-blur-xl p-4 animate-in fade-in">
               <div className="glass-panel rounded-[3rem] p-8 shadow-2xl max-w-sm w-full text-center border-b-8 border-rose-500/20 relative">
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-rose-500 text-white p-4 rounded-3xl shadow-xl animate-bounce">
                        <Gamepad2 size={32} />
                   </div>
                   <h2 className="text-3xl font-black text-rose-50 mt-6 mb-2">{request.fromName}</h2>
                   <p className="text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] mb-8">Daagt je uit!</p>
                   <div className="space-y-3">
                       <button onClick={handleAccept} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">Spelen! <PlayCircle /></button>
                       <button onClick={() => deleteGameRequest(userProfile.coupleId)} className="w-full py-3 text-rose-300/40 font-bold hover:text-rose-200 transition-colors uppercase tracking-widest text-xs">Niet nu</button>
                   </div>
               </div>
           </div>
       )}

       <div className="flex items-center justify-between mb-2">
           <button onClick={() => setAppView(AppView.DASHBOARD)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-rose-200 transition-all text-xs font-bold"><ArrowLeft size={16} /> Terug naar Dashboard</button>
       </div>

       <div className="glass-panel p-8 rounded-[3rem] relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="text-rose-400 w-8 h-8" />
            <h2 className="text-3xl font-black text-rose-50 tracking-tight font-hand">Game Hub</h2>
          </div>
          <p className="text-sm text-white/40 mb-10 font-medium italic">Kies een modus en laat zien wie de meester is.</p>

          <div className="grid grid-cols-1 gap-6">
              <div className="relative group">
                  <button 
                      onClick={handleSendInvite} 
                      disabled={sendingInvite || !!request} 
                      className={`w-full relative p-8 rounded-[2.5rem] transition-all flex items-center gap-6 overflow-hidden border-2
                      ${sendingInvite || hasOutgoingInvite ? 'bg-white/5 border-white/5 opacity-80' : 'bg-white/5 border-white/5 shadow-2xl hover:bg-white/10 hover:-translate-y-1'}`}
                  >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12
                      ${sendingInvite || hasOutgoingInvite ? 'bg-white/5 text-white/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner'}`}>
                          {sendingInvite ? <Loader2 className="animate-spin" /> : <Grid3X3 size={32} />}
                      </div>
                      <div className="text-left flex-1">
                          <h3 className="font-black text-rose-50 text-xl leading-tight">Rummikub (Multiplayer)</h3>
                          <p className="text-[10px] text-rose-300/40 font-black uppercase tracking-[0.2em] mt-1.5">
                              {sendingInvite ? 'Uitnodigen...' : hasOutgoingInvite ? 'Wachten op partner' : 'Speel samen met je partner'}
                          </p>
                      </div>
                      {hasOutgoingInvite && <button onClick={(e) => { e.stopPropagation(); deleteGameRequest(userProfile.coupleId); }} className="p-3 bg-rose-500/20 text-rose-500 rounded-full hover:bg-rose-500/40 transition-colors"><X size={20} /></button>}
                  </button>
              </div>

              <div className="relative group">
                  <button 
                      onClick={startPracticeGame} 
                      className="w-full relative p-8 rounded-[2.5rem] transition-all flex items-center gap-6 overflow-hidden border-2 bg-white/5 border-white/5 shadow-2xl hover:bg-white/10 hover:-translate-y-1"
                  >
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center transition-transform group-hover:-rotate-12 border border-purple-500/20 shadow-inner">
                          <BrainCircuit size={32} />
                      </div>
                      <div className="text-left flex-1">
                          <h3 className="font-black text-rose-50 text-xl leading-tight">Practice Mode (AI)</h3>
                          <p className="text-[10px] text-purple-300/40 font-black uppercase tracking-[0.2em] mt-1.5">
                              Oefen tegen onze slimme AI bot
                          </p>
                      </div>
                  </button>
              </div>

              <div className="p-8 rounded-[2.5rem] border-4 border-dashed border-white/5 bg-white/5 flex items-center gap-6 opacity-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center"><Sparkles size={32} className="text-white/20" /></div>
                  <div className="text-left">
                      <h3 className="font-black text-white/40 text-xl leading-tight">Wordt vervolgd...</h3>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mt-1.5">Nieuwe mini-games in ontwikkeling</p>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};

export default GameHub;
