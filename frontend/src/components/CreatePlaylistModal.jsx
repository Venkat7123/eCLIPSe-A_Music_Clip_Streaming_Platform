import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, FolderPlus } from 'lucide-react';

const CreatePlaylistModal = ({ isOpen, onClose }) => {
  const { createPlaylist, navigate } = useApp();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setLoading(true);
    try {
      const created = await createPlaylist(name.trim(), desc.trim());
      setName('');
      setDesc('');
      onClose();
      if (created) {
        navigate('playlist-details', created);
      }
    } catch (err) {
      setError(err.message || 'Failed to create playlist. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 select-none backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-brand-primary" />
            <h3 className="text-base font-bold text-white">Create New Playlist</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
          {error && (
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400">Playlist Name</label>
            <input 
              type="text" 
              placeholder="e.g. Synthwave Chill, Late Night Coding"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400">Description (Optional)</label>
            <textarea 
              placeholder="Give your playlist a cool description..."
              value={desc} 
              onChange={(e) => setDesc(e.target.value)}
              rows="3"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => { setError(''); onClose(); }}
              className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover disabled:opacity-40 disabled:hover:bg-brand-primary text-xs font-extrabold transition shadow-lg shadow-brand-primary/20"
            >
              {loading ? 'Creating...' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;
