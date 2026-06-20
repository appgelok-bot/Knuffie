import React, { useState, useEffect } from 'react';
import { MoodEntry, UserProfile } from '../types';
import { Smile, Frown, Heart, Coffee, Zap, Moon, User, CheckCircle2 } from 'lucide-react';

interface MoodWidgetProps {
  currentUser: string;
  currentMood: MoodEntry | undefined;
  partnerMood: MoodEntry | undefined;
  partnerProfile: UserProfile | null;
  onSetMood: (mood: string, label: string) => void;
  partnerName: string; // The local nickname for partner
}

const MOODS = [
  { emoji: '🥰', label: 'Geliefd', icon: Heart },
  { emoji: '⚡', label: 'Energiek', icon: Zap },
  { emoji: '😴', label: 'Moe', icon: Moon },
  { emoji: '☕', label: 'Koffie', icon: Coffee },
  { emoji: '😔', label: 'Dipje', icon: Frown },
  { emoji: '😊', label: 'Blij', icon: Smile },
];

const MoodWidget: React.FC<MoodWidgetProps> = ({ currentUser, currentMood, partnerMood, partnerProfile, onSetMood, partnerName }) => {
  const [localMood, setLocalMood] = useState<{emoji: string, label: string} | null>(null);

  const isPartnerOnline = partnerProfile?.lastSeen && (Date.now() - partnerProfile.lastSeen < 5 * 60 * 1000);
  const displayPartnerName = partnerName || partnerProfile?.displayName || 'Partner';

  const handleMoodClick = (emoji: string, label: string) => {
      setLocalMood({emoji, label}); // Optimistic update (stays visible)
      onSetMood(emoji, label); // Send to DB
  };

  const myDisplayMood = localMood || currentMood;

  return (
    <div className="glass-panel rounded-3xl p-4 h-full flex flex-col min-h-[220px] border border-white/5">
      <h3 className="text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 shrink-0">
        <Heart size={12} className="text-rose-400" /> Mood Check
      </h3>

      <div className="flex-1 flex flex-col gap-3">
        
        {/* Partner Status Card - Enhanced Visibility */}
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors"></div>
          
          <div className="relative shrink-0">
             {partnerProfile?.photoURL ? (
                 <img src={partnerProfile.photoURL} alt="partner" className="w-14 h-14 rounded-full object-cover border-2 border-rose-500 shadow-xl" />
             ) : (
                 <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center border-2 border-rose-500 shadow-xl">
                    <User size={24} className="text-rose-300" />
                 </div>
             )}
             {/* Partner Emoji Badge */}
             <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-sm z-10 border border-white/10">
                {partnerMood ? partnerMood.mood : '❓'}
             </div>
             {/* Online Dot */}
             {isPartnerOnline && (
                 <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20 shadow-[0_0_12px_rgba(34,197,94,0.8)]"></div>
             )}
          </div>
          
          <div className="overflow-hidden">
            <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.3em] mb-1">
                Jouw Liefje
            </p>
            <p className="text-rose-50 font-black text-xl truncate leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {displayPartnerName}
            </p>
            <p className="text-rose-300/60 font-bold text-[10px] truncate mt-1 italic">
                {partnerMood ? partnerMood.label : 'Geen status doorgegeven'}
            </p>
          </div>
        </div>

        {/* My Status Status Bar */}
        <div className="flex justify-between items-center px-1 mt-1">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Jouw Mood</span>
            {myDisplayMood && (
                <span className="text-[9px] font-black text-rose-100 bg-rose-500/40 px-2.5 py-1 rounded-full border border-rose-500/40 animate-in fade-in uppercase tracking-wider shadow-lg">
                    {myDisplayMood.emoji} {myDisplayMood.label}
                </span>
            )}
        </div>

        {/* Selection Grid */}
        <div className="grid grid-cols-6 gap-1.5 mt-auto shrink-0 pb-1">
           {MOODS.map((m) => {
             const isSelected = myDisplayMood?.label === m.label;
             return (
               <button
                 key={m.label}
                 onClick={() => handleMoodClick(m.emoji, m.label)}
                 className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border aspect-square relative
                 ${isSelected ? 'bg-rose-500 border-rose-400 text-white shadow-xl scale-110 z-10' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'}`}
               >
                 <span className="text-lg leading-none filter drop-shadow-sm">{m.emoji}</span>
                 {isSelected && <div className="absolute -top-1.5 -right-1.5 bg-white text-rose-500 rounded-full p-0.5 shadow-xl"><CheckCircle2 size={10} /></div>}
               </button>
             );
           })}
        </div>
      </div>
    </div>
  );
};

export default MoodWidget;