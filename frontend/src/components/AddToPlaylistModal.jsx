import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { X, Plus, Music, ChevronRight, Check, Loader2 } from 'lucide-react';

/**
 * AddToPlaylistModal
 * Props:
 *   trackId       — the track to add
 *   clip          — optional clip object
 *   clipId        — optional clip ID
 *   onClose       — callback to dismiss the modal
 */
const AddToPlaylistModal = ({ trackId, clip = null, clipId = null, onClose }) => {
  const { playlists, tracks, addSongToPlaylist, createPlaylist } = useApp();
  const toast = useToast();

  const [loading, setLoading] = useState(null);   // playlistId being loaded
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [added, setAdded] = useState(null);        // playlistId just added to

  const track = tracks.find((t) => t.id === trackId);
  const displayName = clip ? clip.name || 'Clip' : track?.title || 'Track';

  const handleAdd = async (playlist) => {
    if (loading) return;
    setLoading(playlist.id);
    try {
      await addSongToPlaylist(playlist.id, trackId, clip || null, clipId || null);
      setAdded(playlist.id);
      toast.success(`Added "${displayName}" to "${playlist.name}"`);
      setTimeout(() => onClose(), 900); // auto-close after brief success flash
    } catch (e) {
      toast.error(e.message || 'Failed to add to playlist.');
    } finally {
      setLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const newPlaylist = await createPlaylist(newName.trim(), '', trackId, clip || null);
      setAdded(newPlaylist.id);
      toast.success(`Created "${newPlaylist.name}" and added "${displayName}"`);
      setTimeout(() => onClose(), 900);
    } catch (e) {
      toast.error(e.message || 'Failed to create playlist.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-[#0f0f14] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white font-outfit">Add to Playlist</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[230px]">
              {clip ? `🎵 Clip: ${clip.name || 'Unnamed Clip'}` : `🎵 ${track?.title || '...'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition ml-3 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/10">
          {playlists.length === 0 && (
            <p className="text-center text-zinc-600 text-xs py-8">No playlists yet. Create one below.</p>
          )}

          {playlists.map((playlist) => {
            const isLoading = loading === playlist.id;
            const isAdded = added === playlist.id;
            const count = (playlist.entries || []).length;
            return (
              <button
                key={playlist.id}
                onClick={() => handleAdd(playlist)}
                disabled={!!loading || !!added}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left group ${
                  isAdded ? 'bg-emerald-950/30' : ''
                }`}
              >
                {/* Artwork thumbnail */}
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
                  {playlist.artwork ? (
                    <img src={playlist.artwork} alt={playlist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate font-outfit">{playlist.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{count} {count === 1 ? 'song' : 'songs'}</p>
                </div>

                {/* Status icon */}
                <span className="shrink-0 ml-2">
                  {isLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                  {isAdded && <Check className="w-4 h-4 text-emerald-400 stroke-[2.5px]" />}
                  {!isLoading && !isAdded && (
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create new playlist */}
        <div className="border-t border-white/[0.06] px-4 py-3 shrink-0">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 text-purple-400 text-xs font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Create New Playlist
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Playlist name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-zinc-900 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 font-outfit transition"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="p-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                )}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
