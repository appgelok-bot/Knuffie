
import React, { useState } from 'react';
import { initializeCouple, joinCouple, logoutUser } from '../services/firebaseService';
import { UserPlus, Users, ArrowRight, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface CouplePairingProps {
  userId: string;
  userName: string;
  onPairingComplete: () => void;
}

const CouplePairing: React.FC<CouplePairingProps> = ({ userId, userName, onPairingComplete }) => {
  const [mode, setMode] = useState<'SELECT' | 'JOIN'>('SELECT');
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
        await initializeCouple(userId);
    } catch (e: any) {
        setError(e.message || "Fout bij het aanmaken van een nieuwe space.");
        setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inputCode) return;
    setError(null);
    setLoading(true);
    try {
        await joinCouple(userId, inputCode);
        onPairingComplete(); 
    } catch (e: any) {
        setError(e.message || "Fout bij koppelen.");
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e: any) {
      setError(e.message || "Fout bij uitloggen.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-4 animate-in fade-in duration-700">
      <div className="text-center mb-10">
         <h1 className="text-4xl font-black text-rose-50 font-hand mb-2 drop-shadow-xl">Bijna klaar!</h1>
         <p className="text-sm text-white/40 font-medium">Koppel je account om samen te beginnen.</p>
      </div>

      {error && (
          <div className="w-full max-w-sm mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={18} /> {error}
          </div>
      )}

      {mode === 'SELECT' && (
        <div className="grid grid-cols-1 gap-6 w-full max-w-md animate-in zoom-in-95 duration-500">
            
            <button 
                onClick={handleCreate}
                disabled={loading}
                className={`group relative bg-white/5 hover:bg-white/10 p-8 rounded-[2.5rem] shadow-2xl border border-white/10 transition-all flex flex-col items-center text-center gap-5 overflow-hidden
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500/20 transition-all z-10 border border-rose-500/20 shadow-xl">
                    {loading ? <Loader2 className="animate-spin text-rose-500" /> : <UserPlus className="text-rose-400 w-10 h-10" />}
                </div>
                <div className="z-10">
                    <h3 className="text-xl font-black text-rose-50 mb-1">Nieuwe Space</h3>
                    <p className="text-xs text-white/40 font-medium leading-snug">Begin als eerste en stuur een code naar je partner.</p>
                </div>
            </button>

            <div className="flex items-center justify-center gap-4 opacity-20">
                <div className="h-[1px] bg-white flex-1"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">OF</span>
                <div className="h-[1px] bg-white flex-1"></div>
            </div>

            <button 
                onClick={() => setMode('JOIN')}
                className="group relative bg-white/5 hover:bg-white/10 p-8 rounded-[2.5rem] shadow-2xl border border-white/10 transition-all flex flex-col items-center text-center gap-5 overflow-hidden"
            >
                 <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500/20 transition-all border border-rose-500/20 shadow-xl">
                    <Users className="text-rose-400 w-10 h-10" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-rose-50 mb-1">Gekregen Code</h3>
                    <p className="text-xs text-white/40 font-medium leading-snug">Je partner heeft al een space gemaakt voor jullie.</p>
                </div>
            </button>
        </div>
      )}

      {mode === 'JOIN' && (
         <div className="w-full max-w-sm glass-panel p-10 rounded-[3rem] shadow-2xl animate-in slide-in-from-right-8 duration-300 border border-white/10">
            <button onClick={() => setMode('SELECT')} className="text-[10px] text-rose-300/30 font-black uppercase tracking-widest mb-8 hover:text-rose-300 transition-colors flex items-center gap-2">
                ← Terug naar keuze
            </button>

            <h2 className="text-2xl font-black text-rose-50 mb-1 font-hand">Code Invoeren</h2>
            <p className="text-xs text-white/40 mb-8 font-medium">Vul de koppelcode van je partner in.</p>
            
            <div className="space-y-6">
                <input 
                    type="text" 
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="X7K9L2"
                    className="w-full p-6 text-center text-4xl font-black text-white uppercase tracking-[0.25em] bg-white/5 border-2 border-white/10 focus:border-rose-500/50 rounded-3xl outline-none shadow-2xl placeholder-white/5 transition-all font-mono"
                    autoFocus
                />
                
                <button 
                    onClick={handleJoin}
                    disabled={loading || inputCode.length < 3}
                    className={`w-full py-4 rounded-2xl font-black text-white shadow-2xl transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-widest
                    ${loading || inputCode.length < 3 ? 'opacity-30 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 hover:-translate-y-1'}`}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>Verbinden <ArrowRight size={18} /></>}
                </button>
            </div>
         </div>
      )}

      {/* Elegant logout action */}
      <div className="mt-10 mb-4 animate-in fade-in duration-700 delay-300">
        <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all text-xs font-bold text-rose-300 border border-white/5 uppercase tracking-wider"
        >
            <LogOut size={14} className="text-rose-400" />
            Uitloggen ({userName})
        </button>
      </div>
    </div>
  );
};

export default CouplePairing;
