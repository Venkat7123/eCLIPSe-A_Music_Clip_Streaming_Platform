import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  ArrowLeft,
  Heart,
  Music,
  Clock,
  Pencil,
  FolderHeart,
  MoreHorizontal,
  Scissors,
  ChevronRight,
  Check,
  Shuffle,
  ListPlus,
  ListEnd,
  ImagePlus,
  X,
  CheckCircle2,
  Loader2,
  GripVertical,
  Download
} from 'lucide-react';
import api from '../services/api';
import OfflineView from '../components/OfflineView';


// High-fidelity Waveform Visualizer Component with sliding handles
const Waveform = ({ duration, clip }) => {
  const startPct = clip ? (clip.start / duration) * 100 : 0;
  const endPct = clip ? (clip.end / duration) * 100 : 100;

  // High-fidelity pseudo-random bar heights for visual consistency
  const heights = [
    15, 30, 20, 40, 25, 35, 10, 20, 30, 15,
    40, 25, 30, 20, 35, 10, 30, 15, 45, 20,
    40, 25, 35, 10, 30, 20, 40, 15, 30, 25,
    35, 10, 25, 20, 30, 15, 40, 20, 35, 15
  ];

  return (
    <div className="w-full mt-4 select-none relative">
      {/* Waveform bars */}
      <div className="w-full h-10 flex items-end justify-between px-1">
        {heights.map((h, i) => {
          const pct = (i / 40) * 100;
          const isActive = clip && pct >= startPct && pct <= endPct;
          return (
            <span
              key={`bar-${i}`}
              className={`flex-1 mx-[1px] rounded-t-sm transition-all duration-300 ${isActive ? 'bg-brand-primary shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-zinc-700/40'
                }`}
              style={{ height: `${h}%` }}
            ></span>
          );
        })}
      </div>

      {/* Slider Bar underneath with white diamond handles */}
      {clip && (
        <div className="relative w-full h-[3px] mt-2 bg-zinc-800 rounded-full">
          {/* Purple highlighted region */}
          <div
            className="absolute h-full bg-brand-primary shadow-[0_0_6px_rgba(168,85,247,0.5)]"
            style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          ></div>

          {/* Left Diamond Handle */}
          <div
            className="absolute w-2 h-2 bg-white rotate-45 border border-zinc-950 shadow -top-[2px] transition hover:scale-110"
            style={{ left: `calc(${startPct}% - 4px)` }}
          ></div>

          {/* Right Diamond Handle */}
          <div
            className="absolute w-2 h-2 bg-white rotate-45 border border-zinc-950 shadow -top-[2px] transition hover:scale-110"
            style={{ left: `calc(${endPct}% - 4px)` }}
          ></div>
        </div>
      )}
    </div>
  );
};

const PlaylistDetails = () => {
  const toast = useToast();
  const {
    screenData,
    playlists,
    deletePlaylist,
    tracks,
    likedSongs,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    toggleLikeSong,
    removeSongFromPlaylist,
    navigate,
    authProfile,
    allUsers,
    addSongToPlaylist,
    addToQueue,
    playNext,
    updateClipInPlaylist,
    playPlaylist,
    updatePlaylistArtwork,
    reorderPlaylistEntries,
    downloadTrack,
    removeDownload,
    downloadedTrackIds,
    downloadingTrackIds,
    isOnline
  } = useApp();

  // Find latest state of this playlist
  const playlist = playlists.find(p => p.id === screenData?.id) || screenData;
  const isPlaylistDownloading = (playlist.entries || []).some(entry => downloadingTrackIds.has(entry.trackId));

  const [isEditingName, setIsEditingName] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const dragIndexRef = useRef(null);

  if (!isOnline) {
    return <OfflineView pageName="Playlist Details" />;
  }

  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      const entries = [...(playlist.entries || [])];
      const [moved] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, moved);
      const entryIds = entries.map((en) => en.entryId);
      reorderPlaylistEntries(playlist.id, entryIds).catch(() => { });
    }
    dragIndexRef.current = null;
    setDragIndex(null);
  };
  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragIndex(null);
  };
  const [openMenuEntryId, setOpenMenuEntryId] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [savingArtwork, setSavingArtwork] = useState(false);
  const [coverImages, setCoverImages] = useState([]);
  const [loadingCovers, setLoadingCovers] = useState(false);

  // Load preset covers from MongoDB when the picker opens
  useEffect(() => {
    if (!showImagePicker || coverImages.length > 0) return;
    setLoadingCovers(true);
    api.get('/covers')
      .then((data) => setCoverImages(data.covers || []))
      .catch(() => setCoverImages([]))
      .finally(() => setLoadingCovers(false));
  }, [showImagePicker]);

  // Sync playlist name on load or change
  useEffect(() => {
    if (playlist) {
      setPlaylistName(playlist.name);
    }
  }, [playlist?.name, playlist?.id]);

  if (!playlist) {
    return (
      <div className="flex-1 p-8 text-zinc-400 text-left select-none font-outfit">
        <button onClick={() => navigate('playlists')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Playlists
        </button>
        <p>Playlist not found.</p>
      </div>
    );
  }

  // Load track objects from entries
  const entryTracks = (playlist.entries || [])
    .map(entry => {
      const track = tracks.find(t => t.id === entry.trackId);
      return track ? { ...track, entryClip: entry.clip, entryId: entry.entryId } : null;
    })
    .filter(Boolean);

  const calculateTotalDuration = () => {
    const totalSecs = (playlist.entries || []).reduce((total, entry) => {
      if (entry.clip) return total + (entry.clip.end - entry.clip.start);
      const track = tracks.find(t => t.id === entry.trackId);
      return total + (track?.duration || 0);
    }, 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins}m ${secs}s`;
  };

  const handlePlayRow = (track, clip = null) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, !!clip, clip);
    }
  };

  const handlePlaylistPlay = (shuffle = false) => {
    if (!playlist.entries || playlist.entries.length === 0) {
      toast.warning('This playlist is empty! Add some songs first.');
      return;
    }
    playPlaylist(playlist.entries, 0, shuffle);
  };

  const handleRemoveTrack = async (e, trackId, entryId = null) => {
    e.stopPropagation();
    const trackTitle = tracks.find(t => t.id === trackId)?.title || 'this item';
    if (entryId) {
      // Removing a specific clip entry
      const clipName = (playlist.clips || []).find(c => c.entryId === entryId)?.name;
      const label = clipName || trackTitle;
      if (confirm(`Remove clip "${label}" from "${playlist.name}"?`)) {
        try {
          await removeSongFromPlaylist(playlist.id, trackId, entryId);
          toast.success(`Removed clip "${label}"`);
        } catch (err) {
          toast.error(err.message || 'Failed to remove clip.');
        }
      }
    } else {
      // Removing entire track (all entries) from songs view
      const entries = (playlist.entries || []).filter(e => e.trackId === trackId);
      if (entries.length === 0) return;
      if (confirm(`Remove "${trackTitle}" and all its clips from "${playlist.name}"?`)) {
        let success = true;
        for (const entry of entries) {
          try {
            await removeSongFromPlaylist(playlist.id, trackId, entry.entryId);
          } catch (err) {
            console.error('Failed to remove entry:', err);
            success = false;
          }
        }
        if (success) {
          toast.success(`Removed "${trackTitle}" and all its clips`);
        } else {
          toast.error('Failed to remove some entries.');
        }
      }
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRenameSave = async () => {
    if (playlistName.trim() === '') return;
    try {
      await api.put(`/playlists/${playlist.id}`, { name: playlistName });
      playlist.name = playlistName;
      setIsEditingName(false);
      toast.success('Playlist renamed successfully!');
    } catch (err) {
      console.error('[API] Failed to rename playlist:', err);
      toast.error('Failed to rename playlist.');
    }
  };

  const handleArtworkSave = async () => {
    if (!selectedArtwork) return;
    setSavingArtwork(true);
    try {
      await updatePlaylistArtwork(playlist.id, selectedArtwork);
      setShowImagePicker(false);
      setSelectedArtwork(null);
      toast.success('Playlist artwork updated successfully!');
    } catch (err) {
      toast.error('Failed to update playlist image.');
    } finally {
      setSavingArtwork(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (confirm(`Are you sure you want to delete the playlist "${playlist.name}"?`)) {
      try {
        await deletePlaylist(playlist.id);
        toast.success(`Deleted playlist "${playlist.name}"`);
        navigate('playlists');
      } catch (err) {
        toast.error(err.message || 'Failed to delete playlist.');
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 data URL for preview / direct use
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedArtwork(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Trending list logic for empty states
  const trendingTracks = tracks.length > 0 ? tracks.slice(0, 5) : [
    { id: '1', title: 'Lo-Fi Sunset', artist: 'Dreamscape', duration: 165, artwork: '/uploads/artwork/lofi_sunset.png' },
    { id: '2', title: 'Ocean Whispers', artist: 'Calm Tides', duration: 250, artwork: '/uploads/artwork/ocean_whispers.png' },
    { id: '3', title: 'Deep Focus', artist: 'Mindful Audio', duration: 260, artwork: '/uploads/artwork/deep_focus.png' },
    { id: '4', title: 'Neon Highway', artist: 'Synthwave Vibes', duration: 210, artwork: '/uploads/artwork/neon_highway.png' }
  ];

  const handleAddTrendingTrack = async (trackId) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      await addSongToPlaylist(playlist.id, trackId);
      toast.success(`Added "${track?.title || 'song'}" to "${playlist.name}"`);
    } catch (err) {
      toast.error(err.message || 'Failed to add track.');
    }
  };

  const mockDates = ['May 18, 2025', 'May 18, 2025', 'May 18, 2025', 'May 16, 2025', 'May 15, 2025', 'May 14, 2025'];
  const getAddedOnDate = (idx) => {
    return mockDates[idx % mockDates.length];
  };

  const isEmpty = !playlist.entries || playlist.entries.length === 0;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 text-left select-none scrollbar-none font-outfit">

      {/* Back Button */}
      <button
        onClick={() => navigate('playlists')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6 text-xs font-medium font-outfit"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </button>

      {isEmpty ? (
        /* ================== STATE 1: MINIMALIST EMPTY PLAYLIST HEADER ================== */
        <div className="flex flex-col mb-8 text-left font-outfit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 group">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                    className="bg-zinc-900 border border-brand-primary/50 rounded-xl px-3 py-1 text-white font-medium text-xl outline-none font-outfit"
                    autoFocus
                  />
                  <button
                    onClick={handleRenameSave}
                    className="p-1.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover transition"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-white tracking-tight truncate font-outfit">
                    {playlistName}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded bg-white/0 hover:bg-white/5 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                    title="Rename playlist"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('add-song-choose', { playlistId: playlist.id })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover text-xs font-semibold transition shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 animate-fadeIn cursor-pointer font-outfit"
              >
                <Music className="w-4 h-4" />
                <span>Add Songs</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                  className="p-2.5 rounded-xl bg-[#131520] hover:bg-white/5 text-zinc-400 hover:text-white border border-white/5 transition cursor-pointer"
                  title="Playlist Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showPlaylistMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPlaylistMenu(false)}
                    />
                    <div className="absolute right-0 top-11 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                      <button
                        onClick={() => {
                          setShowPlaylistMenu(false);
                          setSelectedArtwork(null);
                          setShowImagePicker(true);
                        }}
                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-zinc-400 animate-none shrink-0" />
                        <span>Change Image</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowPlaylistMenu(false);
                          setIsEditingName(true);
                        }}
                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Rename Playlist</span>
                      </button>

                      <div className="border-t border-white/5 my-1" />

                      <button
                        onClick={() => {
                          setShowPlaylistMenu(false);
                          handleDeletePlaylist();
                        }}
                        className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete Playlist</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-zinc-500 text-xs mt-1.5 font-normal font-space">
            0 Songs • 0 Clips • 0s
          </div>
        </div>
      ) : (
        /* ================== POPULATED PLAYLIST HERO BANNER HEADER ================== */
        <div className="flex flex-col md:flex-row gap-6 items-end mb-8 bg-gradient-to-t from-zinc-900/40 to-zinc-900/10 p-6 rounded-3xl border border-white/5 glass-panel relative font-outfit">
          {/* Playlist artwork with Change Image overlay */}
          <div className="relative w-40 h-40 rounded-3xl overflow-hidden border border-white/10 shrink-0 shadow-2xl group/art">
            <img
              src={playlist.artwork}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
            {/* Change Image overlay */}
            <button
              onClick={() => { setSelectedArtwork(null); setShowImagePicker(true); }}
              className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/art:opacity-100 transition-all duration-200 cursor-pointer"
            >
              <ImagePlus className="w-6 h-6 text-white" />
              <span className="text-[10px] font-semibold text-white tracking-wider uppercase">Change Image</span>
            </button>
          </div>

          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                    className="bg-zinc-900 border border-brand-primary/50 rounded-xl px-3 py-1 text-white font-medium text-xl outline-none font-outfit"
                    autoFocus
                  />
                  <button
                    onClick={handleRenameSave}
                    className="p-1.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover transition"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 group">
                  <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight truncate font-outfit">
                    {playlistName}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded bg-white/0 hover:bg-white/5 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                    title="Rename playlist"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400 font-normal font-space">
              <span>{(playlist.entries || []).length} Entries</span>
              <span>•</span>
              <span>{(playlist.entries || []).filter(e => e.clip).length} Clips</span>
              <span>•</span>
              <span>{calculateTotalDuration()}</span>
            </div>

            <p className="text-zinc-400 text-xs max-w-xl mt-3 line-clamp-2 font-outfit font-light">
              {playlist.description || "Your favorite tracks with the best parts clipped for you."}
            </p>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlaylistPlay}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover text-xs font-semibold transition shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 cursor-pointer font-outfit"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => handlePlaylistPlay(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-xs font-medium transition hover:scale-105 active:scale-95 cursor-pointer font-outfit"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
                <button
                  onClick={async () => {
                    const trackIds = [...new Set((playlist.entries || []).map(e => e.trackId))];
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-medium transition hover:scale-105 active:scale-95 cursor-pointer font-outfit ${
                    isPlaylistDownloading
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400/60 cursor-wait'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/5'
                  }`}
                >
                  {isPlaylistDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isPlaylistDownloading ? 'Downloading...' : 'Download'}</span>
                </button>

              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('add-song-choose', { playlistId: playlist.id })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover text-xs font-semibold transition shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 cursor-pointer font-outfit"
                >
                  <Music className="w-4 h-4" />
                  <span>Add Songs</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition cursor-pointer"
                    title="Playlist Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showPlaylistMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPlaylistMenu(false)}
                      />
                      <div className="absolute right-0 bottom-full mb-2 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                        <button
                          onClick={() => {
                            setShowPlaylistMenu(false);
                            setSelectedArtwork(null);
                            setShowImagePicker(true);
                          }}
                          className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5 text-zinc-400 animate-none shrink-0" />
                          <span>Change Image</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowPlaylistMenu(false);
                            setIsEditingName(true);
                          }}
                          className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Rename Playlist</span>
                        </button>

                        <button
                          onClick={async () => {
                            setShowPlaylistMenu(false);
                            const trackIds = [...new Set((playlist.entries || []).map(entry => entry.trackId))];
                            if (trackIds.length === 0) {
                              toast.warning('This playlist is empty.');
                              return;
                            }
                            toast.info('Downloading playlist tracks...');
                            let downloaded = 0;
                            const playlistMeta = { id: playlist.id, name: playlist.name };
                            for (const tid of trackIds) {
                              if (!downloadedTrackIds.has(tid)) {
                                try {
                                  await downloadTrack(tid, playlistMeta);
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
                          className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 transition cursor-pointer ${
                            isPlaylistDownloading ? 'text-zinc-500 cursor-wait' : 'text-zinc-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {isPlaylistDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span>{isPlaylistDownloading ? 'Downloading...' : 'Download Playlist'}</span>
                        </button>

                        <div className="border-t border-white/5 my-1" />

                        <button
                          onClick={() => {
                            setShowPlaylistMenu(false);
                            handleDeletePlaylist();
                          }}
                          className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Delete Playlist</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Content States */}
      <div>
        {isEmpty ? (
          /* ================== STATE 1: CENTERED EMPTY PLAYLIST ================== */
          <div className="flex flex-col items-center justify-center my-12 text-center max-w-xl mx-auto select-none font-outfit">
            {/* Glowing music note visual container */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <div className="absolute inset-0 m-auto w-36 h-36 rounded-full bg-brand-primary/10 blur-2xl animate-pulse"></div>
              <div className="absolute inset-0 m-auto w-28 h-28 rounded-full border border-brand-primary/25 bg-zinc-950 flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.18)] z-10">
                <svg className="w-12 h-12 text-brand-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="absolute w-44 h-16 border border-brand-primary/10 rounded-full rotate-[-15deg] skew-x-12 opacity-30"></div>
            </div>

            <h3 className="text-xl font-medium text-white mb-2 font-outfit">This playlist is empty</h3>
            <p className="text-zinc-400 text-xs max-w-sm mb-8 leading-relaxed font-outfit">
              Add songs to get started and build your perfect vibe.
            </p>

            <div className="flex items-center gap-4 mb-16">
              <button
                onClick={() => navigate('add-song-choose', { playlistId: playlist.id })}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-black hover:bg-brand-primary-hover text-xs font-semibold transition shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 cursor-pointer font-outfit"
              >
                <Music className="w-4 h-4 fill-black text-black" />
                <span>Add Songs</span>
              </button>
              <button
                onClick={() => navigate('search')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-xs font-semibold transition hover:scale-105 active:scale-95 cursor-pointer font-outfit"
              >
                <FolderHeart className="w-4 h-4 text-zinc-400" />
                <span>Browse Library</span>
              </button>
            </div>

          </div>
        ) : (
          /* ================== POPULATED PLAYLIST VIEWS ================== */
          <div className="flex flex-col gap-6 animate-fadeIn font-outfit">

            {/* ================== UNIFIED LIST VIEW ================== */}
            <div className="bg-zinc-900/20 border border-white/5 rounded-3xl glass-panel font-outfit">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-medium font-space">
                    <th className="py-4 px-1 w-6"></th>
                    <th className="py-4 px-2 w-10 text-center">#</th>
                    <th className="py-4 px-4 font-medium">Title</th>
                    <th className="py-4 px-4 font-medium">Artist</th>
                    <th className="py-4 px-4 font-medium">Clip</th>
                    <th className="py-4 px-4 w-24 text-left font-medium">Duration</th>
                    <th className="py-4 px-5 w-32 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(playlist.entries || []).map((entry, index) => {
                    const track = tracks.find(t => t.id === entry.trackId);
                    if (!track) return null;
                    const clip = entry.clip;
                    const isCurrent = currentTrack?.id === track.id;
                    const isCurrentPlaying = isCurrent && isPlaying;
                    const isLiked = likedSongs.includes(track.id);

                    return (
                      <tr
                        key={`${playlist.id}-${entry.entryId}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`border-b border-white/5 hover:bg-white/5 transition-all group ${isCurrent ? 'bg-brand-primary/5 text-brand-primary' : 'text-zinc-300'
                          } ${dragIndex === index ? 'opacity-50' : ''}`}
                      >
                        {/* Drag Handle */}
                        <td className="py-3.5 px-1 text-center w-6 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition mx-auto" />
                        </td>

                        {/* Index Column */}
                        <td className="py-3.5 px-2 text-center font-normal text-zinc-500 w-10 font-space">
                          {isCurrentPlaying ? (
                            <div className="flex items-end justify-center gap-0.5 h-3">
                              <span className="w-0.5 bg-brand-primary animate-[bounce_0.8s_infinite] h-2"></span>
                              <span className="w-0.5 bg-brand-primary animate-[bounce_0.5s_infinite] h-3"></span>
                              <span className="w-0.5 bg-brand-primary animate-[bounce_1s_infinite] h-1.5"></span>
                            </div>
                          ) : (
                            index + 1
                          )}
                        </td>

                        {/* Artwork & Title Column */}
                        <td className="py-3.5 px-4 font-medium text-white font-outfit">
                          <div className="flex items-center gap-3">
                            <img
                              src={track.artwork}
                              alt={track.title}
                              className="w-8 h-8 rounded object-cover border border-white/5 shrink-0"
                            />
                            <span className={`truncate ${isCurrent ? 'text-brand-primary active-glow font-medium' : ''}`}>
                              {track.title}
                            </span>
                            {downloadingTrackIds.has(track.id) ? (
                              <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" title="Downloading..." />
                            ) : downloadedTrackIds.has(track.id) ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" title="Downloaded offline" />
                            ) : null}
                          </div>
                        </td>

                        {/* Artist */}
                        <td className="py-3.5 px-4 text-zinc-400 font-normal font-outfit">{track.artist}</td>

                        {/* Clip Column */}
                        <td className="py-3.5 px-4 font-normal font-outfit">
                          {clip ? (
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3 h-3 text-brand-primary shrink-0" />
                              <span className="text-brand-primary text-[10px] font-medium truncate max-w-[120px]">
                                {clip.name || 'Clip'}
                              </span>
                              <span className="text-zinc-500 text-[9px] font-mono">
                                {formatDuration(clip.start)}-{formatDuration(clip.end)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">—</span>
                          )}
                        </td>

                        {/* Duration Column */}
                        <td className="py-3.5 px-4 text-left font-normal text-zinc-400 font-space">
                          <span className="font-mono">
                            {clip ? formatDuration(clip.end - clip.start) : formatDuration(track.duration)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            {/* Play */}
                            <button
                              onClick={() => {
                                const idx = (playlist.entries || []).findIndex(e => e.entryId === entry.entryId);
                                playPlaylist(playlist.entries, idx, false);
                              }}
                              className="p-1.5 rounded-full bg-brand-primary text-black hover:bg-brand-primary-hover shadow transition hover:scale-105 active:scale-95 cursor-pointer"
                              title="Play from here"
                            >
                              {isCurrentPlaying ? (
                                <Pause className="w-3 h-3 fill-black text-black" />
                              ) : (
                                <Play className="w-3 h-3 fill-black text-black translate-x-0.5" />
                              )}
                            </button>

                            {/* 3-dot menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuEntryId(openMenuEntryId === entry.entryId ? null : entry.entryId);
                                }}
                                className="p-1.5 rounded hover:bg-white/5 transition cursor-pointer text-zinc-500 hover:text-white"
                                title="More options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {openMenuEntryId === entry.entryId && (
                                <>
                                  {/* Backdrop to close menu */}
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenMenuEntryId(null)}
                                  />
                                  {/* Dropdown */}
                                  <div className="absolute right-0 top-8 z-50 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-1.5 text-left">
                                    {/* Edit/Create Clip */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuEntryId(null);
                                        if (clip) {
                                          navigate('trim-editor', { trackId: track.id, playlistId: playlist.id, entryId: entry.entryId, existingClip: clip });
                                        } else {
                                          navigate('trim-editor', { trackId: track.id, playlistId: playlist.id });
                                        }
                                      }}
                                      className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                    >
                                      {clip ? <Pencil className="w-3.5 h-3.5 text-brand-primary" /> : <Scissors className="w-3.5 h-3.5 text-zinc-400" />}
                                      {clip ? 'Edit Clip' : 'Create Clip'}
                                    </button>

                                    {/* Play Next */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playNext(track.id, clip);
                                        setOpenMenuEntryId(null);
                                        toast.success(`"${clip ? clip.name : track.title}" will play next.`);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                    >
                                      <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
                                      Play Next
                                    </button>

                                    {/* Like / Unlike */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLikeSong(track.id);
                                        setOpenMenuEntryId(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-zinc-400'}`} />
                                      {isLiked ? 'Unlike' : 'Like'}
                                    </button>

                                    {/* Add to Queue */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToQueue(track.id, clip);
                                        setOpenMenuEntryId(null);
                                        toast.success(`"${clip ? clip.name : track.title}" added to queue.`);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-zinc-400" />
                                      Add to Queue
                                    </button>

                                    {/* Download / Remove Download */}
                                    {downloadingTrackIds.has(track.id) ? (
                                      <button
                                        disabled
                                        className="w-full px-3 py-2 text-xs text-zinc-500 flex items-center gap-2.5 transition cursor-wait"
                                      >
                                        <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                                        Downloading...
                                      </button>
                                    ) : downloadedTrackIds.has(track.id) ? (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setOpenMenuEntryId(null);
                                          await removeDownload(track.id);
                                          toast.success('Download removed.');
                                        }}
                                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                                        Downloaded
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setOpenMenuEntryId(null);
                                          try {
                                            await downloadTrack(track.id);
                                            toast.success('Downloaded for offline.');
                                          } catch (err) {
                                            toast.error('Download failed.');
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition"
                                      >
                                        <Download className="w-3.5 h-3.5 text-zinc-400" />
                                        Download
                                      </button>
                                    )}

                                    <div className="border-t border-white/5 my-1" />

                                    {/* Remove from Playlist */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuEntryId(null);
                                        handleRemoveTrack(e, track.id, entry.entryId);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2.5 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Remove from Playlist
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Image Picker Modal ── */}
      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowImagePicker(false); setSelectedArtwork(null); }}
          />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-2xl bg-[#0f0f14] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
              <div>
                <h3 className="text-base font-semibold text-white font-outfit">Choose Playlist Cover</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Select a preset cover image for this playlist</p>
              </div>
              <button
                onClick={() => { setShowImagePicker(false); setSelectedArtwork(null); }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-white/10">

              {/* Loading state */}
              {loadingCovers && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
                  <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
                  <p className="text-xs">Loading covers from Cloudinary…</p>
                </div>
              )}

              {/* Empty state */}
              {!loadingCovers && coverImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
                  <p className="text-xs">No covers found.</p>
                  <p className="text-[10px] text-zinc-700">Run the seed script to add covers to the database.</p>
                </div>
              )}

              {/* Cloudinary Covers Grid */}
              {!loadingCovers && coverImages.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                    {coverImages.length} Cover{coverImages.length !== 1 ? 's' : ''} Available
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {coverImages.map((cover) => {
                      const isSelected = selectedArtwork === cover.url;
                      return (
                        <button
                          key={cover.publicId}
                          onClick={() => setSelectedArtwork(cover.url)}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-150 group/img ${isSelected
                              ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.45)] scale-[1.05]'
                              : 'border-transparent hover:border-white/25 hover:scale-[1.03]'
                            }`}
                          title={cover.name}
                        >
                          <img
                            src={cover.url}
                            alt={cover.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Selected overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-900/35 flex items-center justify-center">
                              <CheckCircle2 className="w-7 h-7 text-white drop-shadow-lg" />
                            </div>
                          )}
                          {/* Hover label */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 opacity-0 group-hover/img:opacity-100 transition pointer-events-none">
                            <p className="text-[9px] text-white truncate font-medium capitalize">{cover.name.replace(/_/g, ' ')}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                onClick={() => { setShowImagePicker(false); setSelectedArtwork(null); }}
                className="px-5 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleArtworkSave}
                disabled={!selectedArtwork || savingArtwork}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-500 text-black text-xs font-semibold hover:bg-purple-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
              >
                {savingArtwork ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    Apply Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlaylistDetails;
