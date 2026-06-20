
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, StickyNote, NoteColor, UserSettings, MoodEntry, UserProfile, CoupleData, DailyQuestionAnswer } from './types';
import StickyBoard from './components/StickyBoard';
import DatePlanner from './components/DatePlanner';
import LoveLetter from './components/LoveLetter';
import MoodWidget from './components/MoodWidget';
import AnniversaryWidget from './components/AnniversaryWidget';
import Auth from './components/Auth';
import CouplePairing from './components/CouplePairing';
import WaitingRoom from './components/WaitingRoom';
import GameHub from './components/GameHub';
import Settings from './components/Settings';
import { generateDailyQuestion } from './services/geminiService';
import { 
  useFirebase, subscribeToNotes, addNoteToFirebase, deleteNoteFromFirebase, 
  subscribeToMoods, updateMoodInFirebase, subscribeToAuthChanges, 
  subscribeToUserProfile, subscribeToCoupleData, updateCoupleData,
  subscribeToPartnerProfile, updateUserPresence, saveDailyAnswer, subscribeToDailyAnswers,
  subscribeToGame
} from './services/firebaseService';
import { 
  Home, 
  Calendar, 
  Heart, 
  Settings as SettingsIcon,
  User as UserIcon,
  Sparkles,
  Loader2,
  Gamepad2,
  Send
} from 'lucide-react';

const RosePetals = () => {
  const petals = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${10 + Math.random() * 15}s`,
      delay: `${Math.random() * 20}s`,
      size: `${10 + Math.random() * 15}px`,
    }));
  }, []);

  return (
    <>
      {petals.map((p) => (
        <div
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="#ff4d6d" opacity="0.6">
            <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.41,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.59,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
          </svg>
        </div>
      ))}
    </>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [partnerCheckComplete, setPartnerCheckComplete] = useState(false);
  const [bypassWaiting, setBypassWaiting] = useState(false);

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [dailyAnswers, setDailyAnswers] = useState<DailyQuestionAnswer[]>([]);
  const [myAnswerInput, setMyAnswerInput] = useState("");
  const [isSendingAnswer, setIsSendingAnswer] = useState(false);
  const [isGameActiveInSession, setIsGameActiveInSession] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('knuffelKompas_settings');
    return saved ? JSON.parse(saved) : { userName: '', partnerName: '', anniversary: new Date().toISOString().split('T')[0] };
  });

  // Auth & Profile loading
  useEffect(() => {
      let unsubProfile: (() => void) | undefined;
      const unsubAuth = subscribeToAuthChanges(async (firebaseUser) => {
          if (firebaseUser) {
              setUser(firebaseUser);
              unsubProfile = subscribeToUserProfile(firebaseUser.uid, (profile) => {
                  if (profile) {
                    setUserProfile(profile);
                    // Sync database values to settings only if settings are currently empty
                    setSettings(prev => ({ 
                        ...prev, 
                        partnerName: profile.partnerNickname || prev.partnerName,
                        userName: profile.displayName || prev.userName
                    }));
                    setIsInitializing(false);
                  } else {
                    setUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || 'User', coupleId: null });
                    setIsInitializing(false);
                  }
              });
          } else { setUser(null); setUserProfile(null); setIsInitializing(false); }
      });
      return () => { unsubAuth(); if (unsubProfile) unsubProfile(); };
  }, []);

  // Presence logic
  useEffect(() => {
    if (!user?.uid) return;
    updateUserPresence(user.uid);
    const interval = setInterval(() => updateUserPresence(user.uid), 60000); 
    return () => clearInterval(interval);
  }, [user?.uid]); 

  // Couple Data & Feature Sync
  useEffect(() => {
    if (userProfile?.coupleId && user?.uid) {
      const coupleId = userProfile.coupleId;
      const unsubNotes = subscribeToNotes(coupleId, (fetchedNotes) => setNotes(fetchedNotes));
      const unsubMoods = subscribeToMoods(coupleId, (fetchedMoods) => setMoods(fetchedMoods));
      const unsubCouple = subscribeToCoupleData(coupleId, (data) => setCoupleData(data));
      const unsubPartner = subscribeToPartnerProfile(coupleId, user.uid, (partner) => { setPartnerProfile(partner); setPartnerCheckComplete(true); });
      const unsubGame = subscribeToGame(coupleId, (game) => {
          setIsGameActiveInSession(!!(game && game.gameActive));
      });
      
      return () => { unsubNotes(); unsubMoods(); unsubCouple(); unsubPartner(); unsubGame(); };
    } else if (userProfile) { setPartnerCheckComplete(true); }
  }, [userProfile?.coupleId, user?.uid]); 

  // Shared Daily Question logic
  useEffect(() => {
    const checkDailyQuestion = async () => {
        if (!userProfile?.coupleId || !coupleData) return;
        const today = new Date().toISOString().split('T')[0];
        
        if (!coupleData.dailyQuestionDate || coupleData.dailyQuestionDate !== today) {
            const newQuestion = await generateDailyQuestion();
            await updateCoupleData(userProfile.coupleId, {
                dailyQuestion: newQuestion,
                dailyQuestionDate: today
            });
        }
    };
    checkDailyQuestion();
  }, [userProfile?.coupleId, coupleData?.dailyQuestionDate]);

  // Answer Subscription
  useEffect(() => {
      if (userProfile?.coupleId && coupleData?.dailyQuestion) {
          const unsubAnswers = subscribeToDailyAnswers(userProfile.coupleId, coupleData.dailyQuestion, (ans) => {
              setDailyAnswers(ans);
          });
          return () => unsubAnswers();
      }
  }, [userProfile?.coupleId, coupleData?.dailyQuestion]);

  const handleSendAnswer = async () => {
      if (!myAnswerInput.trim() || !userProfile?.coupleId || !user?.uid || !coupleData?.dailyQuestion || isSendingAnswer) return;
      
      setIsSendingAnswer(true);
      const answer: DailyQuestionAnswer = {
          questionId: coupleData.dailyQuestion,
          userId: user.uid,
          userName: userProfile.displayName,
          answer: myAnswerInput,
          timestamp: Date.now()
      };
      
      try {
        await saveDailyAnswer(userProfile.coupleId, answer);
        setMyAnswerInput("");
      } catch (e) {
        console.error("Failed to send answer", e);
      } finally {
        setIsSendingAnswer(false);
      }
  };

  const addNote = (content: string, color: NoteColor) => {
    if (!userProfile?.coupleId) return;
    addNoteToFirebase({ id: Date.now().toString(), coupleId: userProfile.coupleId, content, color, author: userProfile.displayName, authorPhoto: userProfile.photoURL || '', timestamp: Date.now(), rotation: Math.random() * 4 - 2 });
  };

  const deleteNote = (id: string) => { if (userProfile?.coupleId) deleteNoteFromFirebase(id); };

  const setMood = (emoji: string, label: string) => {
    if (!user?.uid || !userProfile?.coupleId) return;
    updateMoodInFirebase({ userId: user.uid, coupleId: userProfile.coupleId, userName: userProfile.displayName, userPhoto: userProfile.photoURL || '', mood: emoji, label, timestamp: Date.now() });
  };

  const myUid = user?.uid || '';
  const currentMood = moods.find(m => m.userId === myUid);
  const partnerMood = moods.find(m => m.userId !== myUid); 
  const myAnswer = dailyAnswers.find(a => a.userId === myUid);
  const partnerAnswer = dailyAnswers.find(a => a.userId !== myUid);

  if (isInitializing || (user && !userProfile)) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#1a050a] fixed inset-0 z-[100]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-rose-500 w-12 h-12" />
            <p className="text-rose-400 font-bold animate-pulse font-hand text-xl">Liefde laden...</p>
          </div>
        </div>
      );
  }

  if (!user) return <Auth />;

  if (userProfile && !userProfile.coupleId) return <CouplePairing userId={user.uid} userName={userProfile.displayName} onPairingComplete={() => {}} />;

  if (userProfile?.coupleId && partnerCheckComplete && !partnerProfile && !bypassWaiting) return <WaitingRoom code={userProfile.coupleId} onContinue={() => setBypassWaiting(true)} />;

  const renderContent = () => {
    switch (view) {
      case AppView.DASHBOARD:
        return (
          <div className="flex flex-col gap-4 pb-4 animate-in fade-in duration-500">
            <div className="glass-panel rounded-3xl p-5 relative overflow-hidden group border border-white/10">
               <div className="flex items-center gap-2 mb-2"><Sparkles className="text-rose-400 w-4 h-4" /><h3 className="text-rose-300/50 text-xs font-bold uppercase tracking-wider">Onze Vraag</h3></div>
               <p className="text-lg font-medium leading-snug text-rose-50 italic mb-4 drop-shadow-sm font-hand">"{coupleData?.dailyQuestion || 'Vraag aan het bedenken...'}"</p>
               
               {myAnswer ? (
                   <div className="space-y-3 animate-in fade-in">
                       <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                          <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Jouw antwoord</p>
                          <p className="text-white/80 text-sm">{myAnswer.answer}</p>
                       </div>
                       {partnerAnswer ? (
                           <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-md">
                              <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">{settings.partnerName || partnerProfile?.displayName || 'Partner'}</p>
                              <p className="text-white/80 text-sm">{partnerAnswer.answer}</p>
                           </div>
                       ) : (
                           <div className="p-3 bg-black/20 rounded-2xl border border-white/5 opacity-60">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{settings.partnerName || partnerProfile?.displayName || 'Partner'}</p>
                              <p className="text-gray-500 italic text-sm">Nog niet geantwoord...</p>
                           </div>
                       )}
                   </div>
               ) : (
                   <div className="flex gap-2">
                       <input 
                          value={myAnswerInput} 
                          onChange={(e) => setMyAnswerInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSendAnswer()}
                          placeholder="Type je antwoord..." 
                          className="flex-1 p-3 glass-input rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm placeholder:text-white/20" 
                       />
                       <button 
                          onClick={handleSendAnswer} 
                          disabled={isSendingAnswer || !myAnswerInput.trim() || !coupleData?.dailyQuestion}
                          className={`p-3 bg-rose-500 text-white rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-[48px]`}
                       >
                          {isSendingAnswer ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                       </button>
                   </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MoodWidget currentUser={userProfile.displayName} currentMood={currentMood} partnerMood={partnerMood} partnerProfile={partnerProfile} onSetMood={setMood} partnerName={settings.partnerName} />
                <div className="flex flex-col gap-4">
                    <AnniversaryWidget coupleData={coupleData} userId={myUid} />
                    <div onClick={() => setView(AppView.GAMES)} className="glass-panel rounded-3xl p-4 flex items-center justify-between text-left active:scale-95 transition-transform cursor-pointer hover:bg-white/10 h-[80px] border border-white/10">
                       <div className="flex items-center gap-3"><div className="bg-rose-500/20 p-2.5 rounded-full"><Gamepad2 className="text-rose-400 w-5 h-5" /></div><div><span className="text-sm font-bold text-rose-50 block">Samen Spelen</span><span className="text-[10px] text-rose-300/50 font-bold uppercase tracking-wider">Mini Games Hub</span></div></div>
                    </div>
                </div>
            </div>

            <div className="w-full h-[450px]"><StickyBoard notes={notes} onAddNote={addNote} onDeleteNote={deleteNote} userPhoto={userProfile?.photoURL} /></div>
          </div>
        );
      case AppView.DATE_PLANNER: return <DatePlanner />;
      case AppView.LOVE_LETTERS: return <LoveLetter partnerName={settings.partnerName || partnerProfile?.displayName || 'Mijn partner'} />;
      case AppView.GAMES: return <GameHub userProfile={userProfile} user={user} partnerProfile={partnerProfile} setAppView={setView} />;
      case AppView.SETTINGS: return <Settings userProfile={userProfile} partnerProfile={partnerProfile} settings={settings} setSettings={setSettings} useFirebase={useFirebase} />;
    }
  };

  const shouldHideNav = isGameActiveInSession;

  return (
    <div className="h-screen w-screen text-white font-sans mx-auto relative overflow-hidden flex flex-col bg-transparent">
      <RosePetals />
      
      {!shouldHideNav && (
        <header className="px-6 pt-6 pb-2 flex justify-between items-center z-20 shrink-0 animate-in fade-in duration-300">
          <h1 onClick={() => setView(AppView.DASHBOARD)} className="text-2xl font-black text-rose-50 drop-shadow-[0_2px_10px_rgba(255,77,109,0.3)] tracking-tight font-hand cursor-pointer">Knuffel Kompas</h1>
          <div onClick={() => setView(AppView.SETTINGS)} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer overflow-hidden border-2 border-white/20">
            {userProfile?.photoURL ? <img src={userProfile.photoURL} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-rose-400" />}
          </div>
        </header>
      )}
      
      <main className={`flex-1 overflow-y-auto no-scrollbar z-10 scroll-smooth ${shouldHideNav ? 'p-0' : 'px-4 pb-28 pt-2'}`}>
        {renderContent()}
      </main>

      {!shouldHideNav && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none animate-in slide-in-from-bottom-full duration-500">
          <nav className="glass-panel rounded-full px-5 py-3.5 flex gap-7 items-center pointer-events-auto shadow-2xl backdrop-blur-2xl bg-black/20 border border-white/10">
            <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 transition-all ${view === AppView.DASHBOARD ? 'text-rose-400 scale-125' : 'text-white/40 hover:text-white/60'}`}><Home size={22} /></button>
            <button onClick={() => setView(AppView.DATE_PLANNER)} className={`p-2 transition-all ${view === AppView.DATE_PLANNER ? 'text-rose-400 scale-125' : 'text-white/40 hover:text-white/60'}`}><Calendar size={22} /></button>
            <button onClick={() => setView(AppView.GAMES)} className={`p-2 transition-all ${view === AppView.GAMES ? 'text-rose-400 scale-125' : 'text-white/40 hover:text-white/60'}`}><Gamepad2 size={22} /></button>
            <button onClick={() => setView(AppView.LOVE_LETTERS)} className={`p-2 transition-all ${view === AppView.LOVE_LETTERS ? 'text-rose-400 scale-125' : 'text-white/40 hover:text-white/60'}`}><Heart size={22} /></button>
            <button onClick={() => setView(AppView.SETTINGS)} className={`p-2 transition-all ${view === AppView.SETTINGS ? 'text-rose-400 scale-125' : 'text-white/40 hover:text-white/60'}`}><SettingsIcon size={22} /></button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
