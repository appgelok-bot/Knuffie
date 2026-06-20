import React, { useState } from 'react';
import { loginUser, registerUser, resetPassword } from '../services/firebaseService';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface AuthProps {}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT';

const Auth: React.FC<AuthProps> = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        await loginUser(email, password);
      } else if (mode === 'REGISTER') {
        await registerUser(email, password, name);
      } else if (mode === 'FORGOT') {
        await resetPassword(email);
        setSuccess('Herstelmail verzonden! Check je inbox.');
        setMode('LOGIN');
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      const errMessage = err.message || 'Er ging iets mis. Probeer het opnieuw.';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="glass-panel p-10 rounded-[3rem] w-full max-w-sm shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-10">
           <h1 className="text-4xl font-black text-rose-50 font-hand tracking-wide mb-2 drop-shadow-xl">Knuffel Kompas</h1>
           <p className="text-[10px] text-rose-300/50 font-black uppercase tracking-[0.2em]">
             {mode === 'LOGIN' && 'Welkom terug!'}
             {mode === 'REGISTER' && 'Begin jullie reis'}
             {mode === 'FORGOT' && 'Wachtwoord herstellen'}
           </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs font-bold text-rose-300 animate-in slide-in-from-top-2 break-words">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> 
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 text-xs font-bold text-green-300 animate-in slide-in-from-top-2">
            <Sparkles size={16} className="text-green-400" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'REGISTER' && (
            <div className="relative animate-in slide-in-from-left-4 fade-in duration-300">
              <User className="absolute left-4 top-4 text-rose-400/60 w-5 h-5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jouw Naam"
                className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-white placeholder-white/20 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-sm"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-4 text-rose-400/60 w-5 h-5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mailadres"
              className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-white placeholder-white/20 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-sm"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-rose-400/60 w-5 h-5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-white placeholder-white/20 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs
              ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-600 shadow-rose-500/20'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={18} />}
            {mode === 'LOGIN' ? 'Inloggen' : mode === 'REGISTER' ? 'Aanmelden' : 'Verstuur Link'}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3 items-center text-[10px] font-black uppercase tracking-widest">
          {mode === 'LOGIN' ? (
            <>
              <p className="text-white/30">Geen account? <button onClick={() => setMode('REGISTER')} className="text-rose-400 hover:text-rose-300 transition-colors">Registreer hier</button></p>
              <button onClick={() => setMode('FORGOT')} className="text-white/20 hover:text-white/40">Wachtwoord vergeten?</button>
            </>
          ) : mode === 'REGISTER' ? (
            <p className="text-white/30">Al een account? <button onClick={() => setMode('LOGIN')} className="text-rose-400 hover:text-rose-300 transition-colors">Log in</button></p>
          ) : (
            <button onClick={() => setMode('LOGIN')} className="text-rose-400 hover:text-rose-300">Terug naar inloggen</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;