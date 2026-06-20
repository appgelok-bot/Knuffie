import React, { useState } from 'react';
import { CoupleData } from '../types';
import { updateCoupleData } from '../services/firebaseService';
import { Heart, Calendar, Check, X, Clock, PartyPopper } from 'lucide-react';

interface AnniversaryWidgetProps {
  coupleData: CoupleData | null;
  userId: string;
}

const AnniversaryWidget: React.FC<AnniversaryWidgetProps> = ({ coupleData, userId }) => {
  const [inputDate, setInputDate] = useState('');

  // 1. Loading State
  if (!coupleData) return <div className="glass-panel rounded-3xl p-4 h-full animate-pulse bg-white/5"></div>;

  const { anniversaryDate, proposedDate, proposedBy, status } = coupleData;

  const handlePropose = async () => {
    if (!inputDate) return;
    await updateCoupleData(coupleData.coupleId, {
      proposedDate: inputDate,
      proposedBy: userId,
      status: 'pending'
    });
  };

  const handleApprove = async () => {
    await updateCoupleData(coupleData.coupleId, {
      anniversaryDate: proposedDate,
      status: 'set',
      proposedDate: null,
      proposedBy: null
    });
  };

  const handleReject = async () => {
    await updateCoupleData(coupleData.coupleId, {
      proposedDate: null,
      proposedBy: null,
      status: null
    });
  };

  // 2. Pending Approval State
  if (status === 'pending') {
    const isMyProposal = proposedBy === userId;
    
    return (
      <div className="glass-panel rounded-3xl p-4 h-full flex flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse"></div>
        {isMyProposal ? (
            <>
                <Clock className="text-yellow-500 mb-2 w-8 h-8" />
                <h3 className="font-bold text-rose-50 text-sm">Wachten op partner...</h3>
                <p className="text-xs text-white/40 mb-2">Je stelde {proposedDate} voor.</p>
                <button onClick={handleReject} className="text-xs text-rose-400 hover:text-rose-500 underline font-bold uppercase tracking-wider">Annuleren</button>
            </>
        ) : (
            <>
                <Calendar className="text-rose-500 mb-2 w-8 h-8" />
                <h3 className="font-bold text-rose-50 text-sm">Datum Voorstel</h3>
                <p className="text-xs text-white/60 mb-3 leading-relaxed">Klopt het dat jullie sinds <span className="font-bold text-rose-400">{proposedDate}</span> samen zijn?</p>
                <div className="flex gap-2 w-full">
                    <button onClick={handleReject} className="flex-1 py-2 bg-white/5 text-rose-200 rounded-xl font-bold text-xs hover:bg-white/10 border border-white/10 transition-all"><X size={16} className="mx-auto"/></button>
                    <button onClick={handleApprove} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-bold text-xs hover:bg-rose-600 transition-all shadow-lg"><Check size={16} className="mx-auto"/></button>
                </div>
            </>
        )}
      </div>
    );
  }

  // 3. Not Set State
  if (!anniversaryDate || status !== 'set') {
    return (
      <div className="glass-panel rounded-3xl p-4 h-full flex flex-col justify-center items-center text-center">
        <Heart className="text-white/10 mb-2 w-8 h-8" />
        <h3 className="font-bold text-rose-50 text-sm mb-2">Wanneer is het officieel?</h3>
        <input 
            type="date" 
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="w-full text-xs p-2 rounded-lg bg-white/5 mb-3 border border-white/10 outline-none text-white appearance-none"
        />
        <button 
            onClick={handlePropose}
            disabled={!inputDate}
            className="w-full py-2.5 bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg disabled:opacity-30 transition-all active:scale-95"
        >
            Datum Instellen
        </button>
      </div>
    );
  }

  // 4. Active State (Counters)
  const today = new Date();
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const parsedDate = anniversaryDate.split('-');
  const start = new Date(
    parseInt(parsedDate[0]),
    parseInt(parsedDate[1]) - 1,
    parseInt(parsedDate[2])
  );
  
  const diffTime = Math.max(0, todayNoTime.getTime() - start.getTime());
  const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Next Anniversary Calc
  const nextAnniv = new Date(start);
  nextAnniv.setFullYear(todayNoTime.getFullYear());
  if (nextAnniv < todayNoTime) nextAnniv.setFullYear(todayNoTime.getFullYear() + 1);
  const diffNext = Math.ceil((nextAnniv.getTime() - todayNoTime.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="glass-panel rounded-3xl p-5 h-full relative overflow-hidden flex flex-col justify-between group">
        {/* Background Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
        
        {/* Days Together Main Counter */}
        <div className="relative z-10 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1 mb-1 opacity-50">
                <Heart size={14} className="fill-rose-500 text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Dagen Samen</span>
            </div>
            <span className="text-5xl font-black text-rose-50 tracking-tighter leading-none drop-shadow-xl">{daysTogether}</span>
            <span className="text-[10px] text-white/30 font-bold uppercase mt-2 tracking-widest">{start.toLocaleDateString('nl-NL', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
        </div>

        {/* Countdown Footer */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-rose-500/20 p-1.5 rounded-full">
                    <PartyPopper size={14} className="text-rose-400" />
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Volgend Jubileum</span>
                    <span className="text-xs font-bold text-rose-50">{nextAnniv.toLocaleDateString('nl-NL', {day: 'numeric', month: 'short'})}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="block text-xl font-black text-rose-500 leading-none">{diffNext}</span>
                <span className="text-[8px] text-rose-400/50 font-black uppercase tracking-widest">Nog dagen</span>
            </div>
        </div>
    </div>
  );
};

export default AnniversaryWidget;