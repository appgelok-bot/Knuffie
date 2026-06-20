
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserSettings } from '../types';
import { Settings as SettingsIcon, Camera, User, Wifi, WifiOff, LogOut, Heart, Save, Loader2, Link2Off, Copy, Check, Clock, Sparkles } from 'lucide-react';
import { logoutUser, updateUserProfileData, unpairCouple } from '../services/firebaseService';

interface SettingsProps {
  userProfile: UserProfile | null;
  partnerProfile: UserProfile | null;
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  useFirebase: boolean;
}

const Settings: React.FC<SettingsProps> = ({ userProfile, partnerProfile, settings, setSettings, useFirebase }) => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
       setDeferredPrompt(null);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA app choice: ${outcome}`);
    setDeferredPrompt(null);
  };
  
  // Lokale state voor formuliervelden voor betere UX
  const [localUserName, setLocalUserName] = useState('');
  const [localPartnerNickname, setLocalPartnerNickname] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialiseer lokale velden vanuit userProfile of settings
  useEffect(() => {
    if (userProfile) {
      setLocalUserName(userProfile.displayName || '');
      setLocalPartnerNickname(userProfile.partnerNickname || settings.partnerName || '');
    }
  }, [userProfile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200000) { 
        setErrorMsg("Afbeelding te groot (max 200KB).");
        setTimeout(() => setErrorMsg(''), 4000);
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (useFirebase && userProfile) {
            setLoading(true);
            setErrorMsg('');
            try {
                await updateUserProfileData(userProfile.uid, { photoURL: base64String });
                setSuccessMsg('Foto geüpload!');
                setTimeout(() => setSuccessMsg(''), 3000);
            } catch (error) {
                console.error("Upload failed", error);
                setErrorMsg('Fout bij het uploaden.');
                setTimeout(() => setErrorMsg(''), 4000);
            }
            setLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
      if (!userProfile) return;
      setLoading(true);
      setErrorMsg('');
      try {
        if (useFirebase) {
            // Update direct in Firebase
            await updateUserProfileData(userProfile.uid, { 
                displayName: localUserName,
                partnerNickname: localPartnerNickname 
            });
            
            // Update ook de globale settings in App.tsx
            setSettings(prev => ({
                ...prev,
                userName: localUserName,
                partnerName: localPartnerNickname
            }));
            
            setSuccessMsg('Gegevens opgeslagen in database!');
        }
      } catch (e) {
        console.error("Save failed", e);
        setErrorMsg("Opslaan mislukt. Probeer het opnieuw.");
      } finally {
        setLoading(false);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  const handleLogout = async () => {
      await logoutUser();
      window.location.reload();
  };

  const handleUnpair = async () => {
      if (!userProfile) return;
      if (window.confirm("Weet je zeker dat je wilt ontkoppelen? Jullie gedeelde space blijft bestaan maar je hebt geen toegang meer.")) {
          setLoading(true);
          await unpairCouple(userProfile.uid);
          window.location.reload();
      }
  };

  const copyCoupleCode = () => {
      if (userProfile?.coupleId) {
          navigator.clipboard.writeText(userProfile.coupleId);
          setCodeCopied(true);
          setTimeout(() => setCodeCopied(false), 2000);
      }
  };

  const currentPhoto = userProfile?.photoURL || null;
  const isPartnerOnline = partnerProfile?.lastSeen && (Date.now() - partnerProfile.lastSeen < 5 * 60 * 1000); 
  const displayPartnerName = localPartnerNickname || partnerProfile?.displayName || 'Partner';

  return (
    <div className="pb-24 space-y-6 px-1 animate-in fade-in duration-500">
      
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-6 -mt-6 pointer-events-none"></div>
        <h2 className="text-2xl font-black text-rose-50 flex items-center gap-3 relative z-10 font-hand">
            <SettingsIcon className="w-6 h-6 text-rose-400" /> Instellingen
        </h2>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] ml-4">Jouw Profiel</h3>
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col items-center border border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/5 to-transparent"></div>
            
            <div className="relative group cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-4 border-white/10 shadow-2xl overflow-hidden flex items-center justify-center relative transform transition-transform group-hover:scale-105">
                    {currentPhoto ? (
                        <img src={currentPhoto} alt="Profiel" className="w-full h-full object-cover" />
                    ) : (
                        <User size={56} className="text-white/10" />
                    )}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-2xl border border-white/20 whitespace-nowrap">
                   Wijzig Foto
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            
            <div className="w-full mt-10 space-y-5 z-10">
                <div>
                    <label className="block text-[10px] font-black text-rose-300/40 uppercase tracking-[0.2em] mb-2 px-1">Jouw Naam (in de database)</label>
                    <input 
                      type="text" 
                      value={localUserName}
                      onChange={(e) => setLocalUserName(e.target.value)}
                      className="w-full p-4 glass-input rounded-2xl font-bold text-white focus:ring-2 focus:ring-rose-500/50 outline-none shadow-inner"
                      placeholder="Bijv. John Doe"
                    />
                </div>
                
                <div>
                    <label className="block text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] mb-3 flex items-center justify-between px-1">
                        Bijnaam Partner <span className="text-[8px] opacity-40 lowercase tracking-normal">Alleen zichtbaar voor jou</span>
                    </label>
                    <input 
                      type="text" 
                      value={localPartnerNickname}
                      onChange={(e) => setLocalPartnerNickname(e.target.value)}
                      className="w-full p-4 glass-input rounded-2xl font-bold text-white focus:ring-2 focus:ring-rose-500/50 outline-none placeholder-white/5 shadow-inner"
                      placeholder={partnerProfile?.displayName || "Mijn Schatje"}
                    />
                </div>

                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black hover:bg-rose-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-2xl uppercase tracking-widest text-xs"
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                    Wijzigingen Opslaan
                </button>
                
                {successMsg && (
                    <p className="text-center text-green-400 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">{successMsg}</p>
                )}
                {errorMsg && (
                    <p className="text-center text-rose-400 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">{errorMsg}</p>
                )}
            </div>
        </div>
      </div>

      <div className="space-y-3">
         <h3 className="text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] ml-4">Jouw Partner</h3>
         
         {useFirebase && partnerProfile && (
             <div className="glass-panel p-6 rounded-[2.5rem] flex items-center gap-5 border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative">
                     <div className="w-20 h-20 rounded-3xl bg-white/5 overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center">
                        {partnerProfile.photoURL ? (
                            <img src={partnerProfile.photoURL} alt="Partner" className="w-full h-full object-cover" />
                        ) : (
                            <Heart size={32} className="text-rose-400/40" />
                        )}
                     </div>
                     {isPartnerOnline ? (
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#1a050a] rounded-full shadow-2xl animate-pulse"></div>
                     ) : (
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white/10 border-4 border-[#1a050a] rounded-full"></div>
                     )}
                </div>
                
                <div className="flex-1">
                    <h3 className="text-xl font-black text-rose-50 leading-tight tracking-tight">
                        {displayPartnerName}
                    </h3>
                    <p className="text-[10px] text-white/30 font-bold mb-2 tracking-wide truncate">{partnerProfile.email}</p>
                    
                    {isPartnerOnline ? (
                        <div className="inline-flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Online</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <Clock size={12} className="text-white/20" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Offline</span>
                        </div>
                    )}
                </div>
             </div>
         )}
         
         {!partnerProfile && (
            <div className="glass-panel p-8 text-center text-white/20 text-xs font-black uppercase tracking-widest rounded-3xl border border-dashed border-white/10">
                Wachten op partner...
            </div>
         )}

         {useFirebase && userProfile?.coupleId && (
            <div className="glass-panel p-5 rounded-[2rem] bg-white/5 border border-white/5 mt-3 group" onClick={copyCoupleCode}>
                <div className="flex justify-between items-center cursor-pointer">
                    <div>
                        <p className="text-[9px] font-black text-rose-300/30 uppercase tracking-[0.2em] mb-1">Koppel Code</p>
                        <p className="text-2xl font-black text-rose-400 tracking-[0.2em] font-mono group-active:scale-95 transition-transform">{userProfile.coupleId}</p>
                    </div>
                    <button className="bg-white/5 p-3 rounded-2xl shadow-xl text-rose-300/40 hover:text-rose-400 border border-white/5 transition-colors">
                        {codeCopied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                    </button>
                </div>
            </div>
         )}
      </div>

      <div className="space-y-3">
         <h3 className="text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] ml-4">Android App Installatie</h3>
         <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl bg-gradient-to-b from-rose-500/5 to-transparent">
             <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="flex gap-5 items-start">
                 <div className="w-16 h-16 rounded-2xl bg-white/5 overflow-hidden border border-white/10 shadow-xl flex-shrink-0 flex items-center justify-center p-1">
                     <img src="/src/assets/images/love_compass_logo_1781963777674.jpg" className="w-full h-full object-cover rounded-xl" />
                 </div>
                 
                 <div className="flex-1 space-y-1">
                     <h4 className="text-lg font-black text-rose-50 leading-tight">Knuffel Kompas Android</h4>
                     <p className="text-xs text-white/40 font-medium">Installeer Knuffel Kompas direct als officiële stand-alone app op jouw Android toestel!</p>
                 </div>
             </div>
             
             <div className="mt-5 space-y-4 pt-4 border-t border-white/5">
                 <div className="grid grid-cols-1 gap-3">
                     {deferredPrompt ? (
                         <button 
                             onClick={handleInstallClick}
                             className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(244,63,94,0.3)] uppercase tracking-widest text-xs"
                         >
                             <Sparkles size={16} className="animate-pulse" /> Direct Installeren op Android
                         </button>
                     ) : (
                         <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs">
                             <p className="font-bold text-rose-300">💡 Hoe te installeren op Android:</p>
                             <ol className="list-decimal list-inside space-y-1 text-white/60 pl-1 font-medium select-none">
                                 <li>Open de site in <strong className="text-white">Google Chrome</strong> op je Android.</li>
                                 <li>Tik op de <strong className="text-white">drie puntjes</strong> rechtsboven.</li>
                                 <li>Selecteer <strong className="text-white">"App installeren"</strong> of <strong className="text-white">"Toevoegen aan startscherm"</strong>.</li>
                                 <li>De app start voortaan op als een echte native Android app zonder browser-balken!</li>
                             </ol>
                         </div>
                     )}
                 </div>
             </div>
         </div>
      </div>

      <div className="space-y-3">
         <h3 className="text-[10px] font-black text-rose-300/30 uppercase tracking-[0.2em] ml-4">Gevaarlijke Zone</h3>
         
         <div className="glass-panel p-4 rounded-[2rem] border border-white/5">
            {useFirebase && (
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={handleUnpair}
                        className="p-4 rounded-2xl border border-orange-500/10 bg-orange-500/5 text-orange-400 font-black transition-all flex flex-col items-center justify-center gap-2 hover:bg-orange-500/10 text-[10px] uppercase tracking-widest"
                    >
                        <Link2Off size={20} /> Ontkoppel
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 text-rose-400 font-black transition-all flex flex-col items-center justify-center gap-2 hover:bg-rose-500/10 text-[10px] uppercase tracking-widest"
                    >
                        <LogOut size={20} /> Uitloggen
                    </button>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Settings;
