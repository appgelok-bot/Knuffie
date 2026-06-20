import React, { useState } from 'react';
import { generateDateIdeas } from '../services/geminiService';
import { DateIdea } from '../types';
import { Sparkles, MapPin, DollarSign, Heart, Loader2 } from 'lucide-react';

const DatePlanner: React.FC = () => {
  const [city, setCity] = useState('');
  const [vibe, setVibe] = useState('Romantisch & Knus');
  const [budget, setBudget] = useState('Gemiddeld');
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setTimeout(async () => {
        const results = await generateDateIdeas(city, vibe, budget);
        setIdeas(results);
        setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-black text-rose-50 mb-1 flex items-center gap-2 font-hand">
          <Sparkles className="text-rose-400 fill-rose-400 w-6 h-6" /> Date Planner
        </h2>
        <p className="text-sm text-white/40 mb-6">Plan het perfecte moment voor jullie samen.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em] mb-2">Locatie (Optioneel)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 text-rose-400 w-4 h-4" />
              <input
                type="text"
                placeholder="bijv. Amsterdam, Thuis"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 glass-input rounded-2xl text-white placeholder-white/20 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em] mb-2">Sfeer</label>
                <select 
                  value={vibe} 
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-4 py-3.5 glass-input rounded-2xl text-white outline-none appearance-none text-sm"
                >
                  <option className="bg-[#2d0a14]">Romantisch & Knus</option>
                  <option className="bg-[#2d0a14]">Avontuurlijk</option>
                  <option className="bg-[#2d0a14]">Ontspannend</option>
                  <option className="bg-[#2d0a14]">Culinair</option>
                  <option className="bg-[#2d0a14]">Cultureel</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em] mb-2">Budget</label>
                <select 
                  value={budget} 
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-3.5 glass-input rounded-2xl text-white outline-none appearance-none text-sm"
                >
                  <option className="bg-[#2d0a14]">Gratis</option>
                  <option className="bg-[#2d0a14]">Goedkoop</option>
                  <option className="bg-[#2d0a14]">Gemiddeld</option>
                  <option className="bg-[#2d0a14]">Luxe</option>
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
            {loading ? 'Ideeën zoeken...' : 'Vind Dates'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {ideas.map((idea, index) => (
          <div key={index} className="glass-panel rounded-[2rem] p-6 border border-white/5 hover:bg-white/10 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${index * 150}ms`}}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-xl text-rose-50 leading-tight">{idea.title}</h3>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-black uppercase tracking-wider border border-rose-500/20">{idea.locationType}</span>
            </div>
            <p className="text-white/70 text-sm mb-4 leading-relaxed font-medium">{idea.description}</p>
            
            <div className="flex items-center gap-4 text-[10px] text-rose-300/50 mb-5 font-black uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-rose-400" /> {idea.estimatedCost}</span>
            </div>

            <div className="bg-rose-400/5 p-4 rounded-2xl flex gap-3 items-start border border-rose-400/10 shadow-inner">
              <Heart className="text-rose-500 w-4 h-4 mt-0.5 flex-shrink-0 fill-rose-500" />
              <p className="text-xs text-rose-100/80 italic leading-snug">
                <span className="font-black uppercase tracking-tighter text-[10px] text-rose-400 mr-1">Romantische Tip:</span> {idea.romanticTip}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatePlanner;