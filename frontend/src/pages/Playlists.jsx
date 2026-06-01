import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Play, Plus, Trash2, FolderHeart, Music4, MoreHorizontal, Image as ImageIcon, X, Download, Loader2, CheckCircle2 } from 'lucide-react';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { PLAYLIST_ART } from '../config/playlistArt';
import OfflineView from '../components/OfflineView';

const Playlists = () => {
  const toast = useToast();
  const { playlists, deletePlaylist, navigate, tracks, authProfile, allUsers, playPlaylist, updatePlaylistArtwork, downloadTrack, downloadedTrackIds, downloadingTrackIds, isOnline } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [pickerPlaylistId, setPickerPlaylistId] = useState(null);

  if (!isOnline) {
    return <OfflineView pageName="Playlists" />;
  }

  const calculatePlaylistDuration = (entries) => {
    const totalSecs = (entries || []).reduce((total, entry) => {
      if (entry.clip) return total + (entry.clip.end - entry.clip.start);
      const track = tracks.find((t) => t.id === entry.trackId);
      return total + (track ? track.duration : 0);
    }, 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaylistPlay = (e, playlist) => {
    e.stopPropagation();
    if (!playlist.entries || playlist.entries.length === 0) {
      toast.warning('This playlist is empty! Add some songs first.');
      return;
    }
    playPlaylist(playlist.entries, 0, false);
  };

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the playlist "${name}"?`)) {
      deletePlaylist(id);
    }
  };

  const handleImagePick = async (artworkUrl) => {
    if (!pickerPlaylistId) return;
    try {
      await updatePlaylistArtwork(pickerPlaylistId, artworkUrl);
      setPickerPlaylistId(null);
      toast.success('Playlist image updated successfully!');
    } catch (e) {
      toast.error('Failed to update playlist image.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 text-left select-none">

      {/* Header block */}
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Music4 className="w-6 h-6 text-brand-primary" />
            My Playlists
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Manage and curate your custom energy clips.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover text-xs font-extrabold transition shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Grid of Playlists */}
      {playlists.length === 0 ? (
        <div className="bg-zinc-900/10 border border-white/5 border-dashed rounded-2xl p-16 text-center text-zinc-500 max-w-xl mx-auto flex flex-col items-center gap-4">
          <FolderHeart className="w-12 h-12 text-zinc-600" />
          <div>
            <h4 className="text-sm font-semibold text-white">No playlists found</h4>
            <p className="text-xs text-zinc-500 mt-1">Curate your own tracks and craft custom audio segments.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-brand-primary text-black font-extrabold rounded-lg text-xs"
          >
            Create Playlist Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {playlists.map((playlist) => {
            const isPlaylistDownloading = (playlist.entries || []).some(entry => downloadingTrackIds.has(entry.trackId));
            const allTracksDownloaded = (playlist.entries || []).length > 0 && (playlist.entries || []).every(entry => downloadedTrackIds.has(entry.trackId));

            return (
              <div
                key={playlist.id}
                onClick={() => navigate('playlist-details', playlist)}
                className="bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-brand-primary/25 rounded-2xl p-4 transition-all duration-300 group cursor-pointer flex flex-col h-full relative"
              >
                {/* Cover Art */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                  <img
                    src={playlist.artwork}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badges */}
                  {isPlaylistDownloading && (
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center border border-white/10 shadow-md">
                      <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                    </div>
                  )}

                  {!isPlaylistDownloading && allTracksDownloaded && (
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center border border-zinc-950/20 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3px]" />
                    </div>
                  )}

                  {/* Visual hover controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                    <button
                      onClick={(e) => handlePlaylistPlay(e, playlist)}
                      className="w-12 h-12 rounded-full bg-brand-primary text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition"
                      title="Play Playlist"
                    >
                      <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
                    </button>
                  </div>

                </div>

                {/* 3-dot menu overlay relative to card to prevent overflow-hidden clipping */}
                <div className="absolute top-6 right-6 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === playlist.id ? null : playlist.id);
                    }}
                    className="p-1.5 rounded-full bg-black/60 text-zinc-300 hover:text-white transition cursor-pointer"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                {openMenuId === playlist.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                    <div className="absolute right-0 top-9 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setPickerPlaylistId(playlist.id);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-brand-primary" />
                        Change Image
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          const trackIds = [...new Set((playlist.entries || []).map(entry => entry.trackId))];
                          if (trackIds.length === 0) {
                            toast.warning('This playlist is empty.');
                            return;
                          }
                          toast.info('Downloading playlist tracks...');
                          let downloaded = 0;
                          for (const tid of trackIds) {
                            if (!downloadedTrackIds.has(tid)) {
                              try {
                                await downloadTrack(tid);
                                downloaded++;
                              } catch {}
                            }
                          }
                          if (downloaded > 0) {
                            toast.success(`Successfully downloaded ${downloaded} track(s) offline!`);
                          } else {
                            toast.info('All tracks in this playlist are already downloaded.');
                          }
                        }}
                        disabled={isPlaylistDownloading}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs transition cursor-pointer ${
                          isPlaylistDownloading ? 'text-zinc-500 cursor-wait' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {isPlaylistDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-brand-primary" />
                        )}
                        {isPlaylistDownloading ? 'Downloading...' : 'Download Playlist'}
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDelete(e, playlist.id, playlist.name);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Playlist
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Cover Details */}
              <div className="flex flex-col text-left mb-2 min-w-0">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-brand-primary transition">
                  {playlist.name}
                </h4>
                <span className="text-[11px] text-zinc-400 mt-1 truncate">
                  by {
                    playlist.creator === 'Music Lover' || playlist.creator === 'seed_user'
                      ? 'Music Lover'
                      : (authProfile && playlist.creator === authProfile.uid
                          ? authProfile.name
                          : (allUsers && allUsers.length > 0 && allUsers.find(u => u.uid === playlist.creator)
                              ? (allUsers.find(u => u.uid === playlist.creator).displayName || allUsers.find(u => u.uid === playlist.creator).email.split('@')[0])
                              : (playlist.creator?.startsWith('sim_uid_')
                                  ? (authProfile?.name || 'Music Lover')
                                  : playlist.creator)))
                  }
                </span>
                <span className="text-[10px] text-zinc-500 mt-2 font-medium">
                  {(playlist.entries || []).length} tracks • {calculatePlaylistDuration(playlist.entries)}
                </span>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Image Picker Modal */}
      {pickerPlaylistId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Choose Playlist Image</h3>
              <button
                onClick={() => setPickerPlaylistId(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PLAYLIST_ART.map((art) => (
                <button
                  key={art.name}
                  onClick={() => handleImagePick(art.url)}
                  className="aspect-square rounded-xl overflow-hidden border-2 border-white/5 hover:border-brand-primary transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title={art.name}
                >
                  <img src={art.url} alt={art.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popups */}
      <CreatePlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Playlists;
