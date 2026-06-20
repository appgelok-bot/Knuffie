import React, { useState } from 'react';
import { StickyNote, NoteColor } from '../types';
import { Plus, X, Pin, Check, Edit2, Sparkles, Loader2 } from 'lucide-react';
import { updateNoteInFirebase } from '../services/firebaseService';
import { generateSweetNote } from '../services/geminiService';

interface StickyBoardProps {
  notes: StickyNote[];
  onAddNote: (content: string, color: NoteColor) => void;
  onDeleteNote: (id: string) => void;
  userPhoto?: string;
}

const StickyBoard: React.FC<StickyBoardProps> = ({ notes, onAddNote, onDeleteNote, userPhoto }) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>(NoteColor.YELLOW);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<NoteColor>(NoteColor.YELLOW);

  const handleAdd = () => {
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent, selectedColor);
    setNewNoteContent('');
    setIsAdding(false);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
        const text = await generateSweetNote();
        setNewNoteContent(text);
    } catch (e) {
        console.error("AI Sweet note generation failed", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleStartEdit = (note: StickyNote) => {
      setEditingId(note.id);
      setEditContent(note.content);
      setEditColor(note.color);
  };

  const handleSaveEdit = async () => {
      if (!editingId) return;
      await updateNoteInFirebase(editingId, editContent, editColor);
      setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-3xl p-4 relative overflow-hidden">
      <div className="flex justify-between items-center mb-4 z-10 shrink-0">
        <h2 className="text-xs font-bold text-rose-300/50 uppercase tracking-widest flex items-center gap-2">
          <Pin className="w-3 h-3" /> Prikbord
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-rose-500 hover:bg-rose-600 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95 backdrop-blur-sm"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel p-3 rounded-2xl shadow-xl absolute top-14 left-4 right-4 z-30 animate-in fade-in zoom-in-95 duration-200 border border-white/20">
          <textarea
            className="w-full border-none focus:ring-0 text-white placeholder:text-white/20 bg-white/5 rounded-xl p-3 mb-2 resize-none text-sm focus:bg-white/10 transition-colors outline-none"
            placeholder={`Schrijf een lief berichtje...`}
            rows={3}
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              {Object.values(NoteColor).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full border ${color} ${selectedColor === color ? 'border-white scale-110 shadow-sm ring-2 ring-rose-500/20' : 'border-white/10'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Genereer een schattig berichtje met AI"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>AI Knuffel</span>
              </button>
              <button 
                onClick={handleAdd}
                disabled={!newNoteContent.trim() || isGenerating}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors shadow-lg disabled:opacity-50"
              >
                Plaatsen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 z-0 pb-2 p-1">
        {notes.length === 0 && !isAdding && (
          <div className="h-full flex flex-col items-center justify-center text-white/20 opacity-60">
            <Pin size={24} className="mb-2" />
            <span className="text-xs italic">Nog geen notities</span>
          </div>
        )}
        {notes.map((note) => (
          <div 
            key={note.id} 
            className={`${editingId === note.id ? editColor : note.color} p-4 rounded-tr-xl rounded-bl-xl rounded-tl-sm rounded-br-sm shadow-md relative transition-all group duration-300`}
            style={{ transform: editingId === note.id ? 'rotate(0deg)' : `rotate(${note.rotation}deg)` }}
          >
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={() => handleStartEdit(note)}
                  className="w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDeleteNote(note.id)}
                  className="w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"
                >
                  <X size={14} />
                </button>
            </div>

            {editingId === note.id ? (
                <div className="space-y-3">
                    <textarea 
                        className="w-full bg-white/40 p-2 rounded-xl border-none focus:ring-0 text-sm font-hand text-xl text-gray-900 outline-none"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                        rows={3}
                    />
                    <div className="flex justify-between items-center">
                        <div className="flex gap-1.5">
                          {Object.values(NoteColor).map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`w-6 h-6 rounded-full border ${color} ${editColor === color ? 'border-gray-900 scale-110 shadow-sm ring-2 ring-black/10' : 'border-black/10'}`}
                            />
                          ))}
                        </div>
                        <button 
                            onClick={handleSaveEdit}
                            className="bg-green-600 text-white p-1.5 rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            <Check size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-900 font-hand text-xl leading-snug whitespace-pre-wrap font-medium pr-2 drop-shadow-sm">
                  {note.content}
                </p>
            )}
            
            {!editingId || editingId !== note.id ? (
                <div className="flex justify-between items-end mt-3 border-t border-black/5 pt-2">
                     <div className="text-[10px] text-black/40 font-bold uppercase tracking-wider">
                      {new Date(note.timestamp).toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-black/50 font-bold">{note.author}</span>
                      {note.authorPhoto && (
                          <img src={note.authorPhoto} className="w-5 h-5 rounded-full border border-white/50 object-cover shadow-sm" alt="author" />
                      )}
                    </div>
                </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StickyBoard;