import React, { useState } from 'react';
import { Copy, Check, Loader2, Share2 } from 'lucide-react';

interface WaitingRoomProps {
  code: string;
  onContinue: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ code, onContinue }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
      if (navigator.share) {
          navigator.share({
              title: 'Knuffel Kompas Uitnodiging',
              text: `Hoi! Koppel met mij op Knuffel Kompas met deze code: ${code}`,
          }).catch(console.error);
      } else {
          copyCode();
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center animate-in fade-in duration-700">
       <div className="w-full max-w-md glass-panel p-10 rounded-[3rem] shadow-2xl border border-white/10 relative overflow-hidden">
           {/* Decoration */}
           <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-300"></div>
           
           <div className="mb-8">
             <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <Loader2 className="text-rose-400 w-10 h-10 animate-spin" />
                <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping opacity-20"></div>
             </div>
             <h2 className="text-3xl font-black text-rose-50 font-hand mb-2">Wachten op Liefde</h2>
             <p className="text-sm text-white/40 leading-relaxed font-medium px-4">
                 Je space is klaar! Deel de code met je partner om jullie harten te verbinden.
             </p>
           </div>

           <div className="bg-black/20 p-8 rounded-[2rem] border-2 border-dashed border-white/10 mb-8 shadow-inner">
                <p className="text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] mb-3">Jouw Koppel Code</p>
                <div className="text-5xl font-black text-rose-50 tracking-[0.2em] font-mono select-all mb-6 drop-shadow-xl">
                    {code}
                </div>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={copyCode}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 shadow-xl rounded-full text-xs font-black text-rose-50 hover:bg-white/10 transition-all uppercase tracking-wider"
                    >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-rose-400" />}
                        {copied ? 'Ok' : 'Kopie'}
                    </button>
                    <button 
                        onClick={shareCode}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 shadow-xl rounded-full text-xs font-black text-white hover:bg-rose-600 transition-all uppercase tracking-wider shadow-rose-500/20"
                    >
                        <Share2 size={16} />
                        Delen
                    </button>
                </div>
           </div>

           <div className="space-y-6">
             <div className="flex items-center gap-4 bg-rose-500/5 p-4 rounded-2xl text-left border border-rose-500/10">
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></div>
                <p className="text-[10px] text-rose-200/60 font-bold leading-snug">
                    Zodra je partner de code invoert, begint jullie avontuur <strong>automatisch</strong>.
                </p>
             </div>

             <button 
                onClick={onContinue}
                className="text-white/20 hover:text-white/40 text-[10px] font-black uppercase tracking-widest transition-colors"
             >
                Dashboard bekijken
             </button>
           </div>
       </div>
    </div>
  );
};

export default WaitingRoom;