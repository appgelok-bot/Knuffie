import React, { useState } from 'react';
import { generateLoveLetter } from '../services/geminiService';
import { PenTool, Heart, Copy, Check, Sparkles, Loader2 } from 'lucide-react';

interface LoveLetterProps {
  partnerName: string;
}

const LoveLetter: React.FC<LoveLetterProps> = ({ partnerName }) => {
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('Gepassioneerd');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setCopied(false);
    // Simulate "thinking" time
    setTimeout(async () => {
        // Force language to Dutch as requested
        const result = await generateLoveLetter(partnerName, tone, 'Dutch', keywords);
        setLetter(result);
        setLoading(false);
    }, 600);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-white/10">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-rose-50 font-hand">
          <PenTool className="text-rose-400 w-6 h-6" /> Ghostwriter
        </h2>
        <p className="text-white/60 text-sm mb-6">Moeite met de juiste woorden vinden voor {partnerName || 'je partner'}?</p>
        
        <div className="space-y-5 relative z-10">
          <div>
            <label className="text-[10px] text-rose-300/50 font-black uppercase tracking-[0.2em] mb-2 block">Trefwoorden / Herinnering</label>
            <input 
              type="text" 
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="bijv. je lach, onze strandwandeling"
              className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-rose-300/50 font-black uppercase tracking-[0.2em] mb-2 block">Toon</label>
            <div className="relative">
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-3 glass-input rounded-2xl text-white focus:outline-none appearance-none transition-all text-sm"
              >
                <option className="bg-[#2d0a14]">Gepassioneerd</option>
                <option className="bg-[#2d0a14]">Schattig & Speels</option>
                <option className="bg-[#2d0a14]">Poëtisch</option>
                <option className="bg-[#2d0a14]">Ondeugend</option>
                <option className="bg-[#2d0a14]">Waarderend</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all transform active:scale-95 flex justify-center items-center gap-2 uppercase tracking-widest text-xs
              ${loading ? 'bg-rose-500/30 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Schrijven...' : 'Genereer Brief'}
          </button>
        </div>
      </div>

      {letter && (
        <div className="glass-panel p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/10 shadow-2xl relative">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Heart size={80} className="text-rose-400" /></div>
           
           <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-2">
                 <Heart className="text-rose-400 fill-rose-400 w-4 h-4" />
                 <span className="text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em]">Voor {partnerName}</span>
              </div>
              <button 
                onClick={copyToClipboard}
                className="text-white/40 hover:text-rose-400 transition-colors p-2 bg-white/5 rounded-full"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
           </div>
           
           <div className="font-hand text-2xl text-rose-50 leading-relaxed whitespace-pre-line relative z-10 drop-shadow-sm">
              {letter}
           </div>

           <div className="mt-8 flex justify-center">
              <div className="w-12 h-[1px] bg-rose-500/20"></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LoveLetter;