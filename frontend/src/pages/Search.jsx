import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Play, Pause, Search as SearchIcon, X, SlidersHorizontal, Heart, Plus, ListPlus, ChevronRight, MoreHorizontal, Scissors, Pencil, Download, CheckCircle, CheckCircle2, Loader2 } from 'lucide-react';
import OfflineView from '../components/OfflineView';

const Search = () => {
  const toast = useToast();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState(null);
  const {
    tracks,
    likedSongs,
    userClips,
    playTrack,
    playLibraryTracks,
    currentTrack,
    isPlaying,
    togglePlay,
    toggleLikeSong,
    addSongToPlaylist,
    playlists,
    screenData,
    addToQueue,
    playNext,
    navigate,
    downloadedTrackIds,
    downloadingTrackIds,
    downloadTrack,
    removeDownload,
    isOnline
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Tracks', 'Artists', 'Albums'

  if (!isOnline) {
    return <OfflineView pageName="Search" />;
  }

  // Load contextual screen queries (e.g. redirected from home header, or library tabs)
  useEffect(() => {
    if (screenData?.query) {
      setQuery(screenData.query);
    } else if (screenData?.filter === 'liked') {
      setQuery('liked:songs');
    } else if (screenData?.filter === 'clips') {
      setQuery('library:clips');
    } else {
      // Default to "ocean" as shown in screen 2 to visually match exactly!
      setQuery('');
    }
  }, [screenData]);

  // Handle queries & library filters
  let filteredTracks = [];

  if (query.toLowerCase() === 'liked:songs') {
    // Liked tracks
    const likedTracks = tracks.filter((t) => likedSongs.includes(t.id));
    // Liked clips — find clips whose pseudo-ID is in likedSongs
    const likedClips = userClips
      .filter(clip => likedSongs.includes(`clip-${clip.id}`))
      .map(clip => {
        const parent = tracks.find(t => t.id === clip.trackId);
        if (!parent) return null;
        return {
          ...parent,
          id: `clip-${clip.id}`,
          title: `${parent.title} (${clip.name})`,
          duration: Math.floor(clip.duration),
          isClip: true,
          clipObj: clip,
        };
      })
      .filter(Boolean);
    filteredTracks = [...likedTracks, ...likedClips];
  } else if (query.toLowerCase() === 'library:clips') {
    // Clips are custom trim references. We can represent them by overlaying original tracks!
    filteredTracks = userClips.map(clip => {
      const parent = tracks.find(t => t.id === clip.trackId);
      if (!parent) return null;
      return {
        ...parent,
        id: `clip-${clip.id}`,
        title: `${parent.title} (${clip.name})`,
        duration: Math.floor(clip.duration),
        isClip: true,
        clipObj: clip
      };
    }).filter(Boolean);
  } else {
    filteredTracks = tracks.filter((t) => {
      const matchText = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
      return matchText.includes(query.toLowerCase());
    });
  }

  // Filter based on selected pills (Tracks / Artists / Albums)
  if (activeTab === 'Tracks' && query.toLowerCase() !== 'library:clips') {
    // Keep tracks
  } else if (activeTab === 'Artists') {
    // unique artist groupings
    const artists = [];
    filteredTracks = filteredTracks.filter(t => {
      if (artists.includes(t.artist)) return false;
      artists.push(t.artist);
      return true;
    });
  } else if (activeTab === 'Albums') {
    // unique album groupings
    const albums = [];
    filteredTracks = filteredTracks.filter(t => {
      if (albums.includes(t.album)) return false;
      albums.push(t.album);
      return true;
    });
  }

  const handleClear = () => {
    setQuery('');
  };

  const handleSongPlay = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const isLibraryView = query === 'liked:songs' || query === 'library:clips';
      if (isLibraryView) {
        const startIndex = filteredTracks.findIndex(t => t.id === track.id);
        playLibraryTracks(filteredTracks, startIndex >= 0 ? startIndex : 0);
      } else if (track.isClip) {
        playTrack(tracks.find(t => t.id === track.clipObj.trackId), true, track.clipObj);
      } else {
        playTrack(track);
      }
    }
  };

  const handleAddToPlaylist = (track) => {
    setSelectedTrackForPlaylist(track);
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 text-left select-none">

      {/* Search Input Box */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tracks, artists, or albums..."
            value={query === 'liked:songs' ? 'Liked Songs' : query === 'library:clips' ? 'Your Audio Clips' : query}
            onChange={(e) => {
              if (query.includes(':')) return; // locked library views
              setQuery(e.target.value);
            }}
            className="w-full bg-zinc-900 border border-white/5 rounded-xl py-3 pl-12 pr-12 text-white text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>

      {/* Navigation Pills — show library tabs or search tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(query === 'liked:songs' || query === 'library:clips') ? (
          <>
            <button
              onClick={() => { setQuery('liked:songs'); navigate('search', { filter: 'liked' }); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${query === 'liked:songs'
                  ? 'bg-brand-primary text-black active-glow font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                }`}
            >
              Liked Songs
            </button>
            <button
              onClick={() => { setQuery('library:clips'); navigate('search', { filter: 'clips' }); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${query === 'library:clips'
                  ? 'bg-brand-primary text-black active-glow font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                }`}
            >
              My Clips
            </button>
          </>
        ) : (
          ['All', 'Tracks', 'Artists', 'Albums'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${activeTab === tab
                  ? 'bg-brand-primary text-black active-glow font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                }`}
            >
              {tab}
            </button>
          ))
        )}
      </div>

      {/* Results Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 px-2">
          {query.includes(':') ? 'Library Matches' : `Search results for "${query}"`} ({filteredTracks.length})
        </h3>

        {filteredTracks.length === 0 ? (
          <div className="bg-zinc-900/10 border border-white/5 rounded-xl p-16 text-center text-zinc-500 text-sm">
            No matching tracks found. Try searching for "ocean", "sunset", or "highway"!
          </div>
        ) : (
          <div className="bg-zinc-900/35 border border-white/5 rounded-2xl glass-panel">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-bold">
                  <th className="py-4 px-5 w-12 text-center">#</th>
                  <th className="py-4 px-4">Title</th>
                  <th className="py-4 px-4">Artist</th>
                  <th className="py-4 px-4">Album</th>
                  <th className="py-4 px-4 w-20 text-center">Duration</th>
                  <th className="py-4 px-5 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track, index) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const isLiked = likedSongs.includes(track.id);

                  return (
                    <tr
                      key={track.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-all group ${isCurrent ? 'bg-brand-primary/5 text-brand-primary' : 'text-zinc-300'
                        }`}
                    >
                      <td className="py-3 px-5 text-center font-semibold text-zinc-500">
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

                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <img
                            src={track.artwork}
                            alt={track.title}
                            className="w-8 h-8 rounded object-cover border border-white/5 shrink-0"
                          />
                          <span className={`truncate ${isCurrent ? 'text-brand-primary active-glow font-bold' : ''}`}>
                            {track.title}
                          </span>
                          {track.isClip && (
                            <span className="bg-brand-primary/20 text-brand-primary text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide border border-brand-primary/30">
                              Clip
                            </span>
                          )}
                          {downloadingTrackIds.has(track.isClip ? track.clipObj?.trackId : track.id) ? (
                            <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" title="Downloading..." />
                          ) : downloadedTrackIds.has(track.isClip ? track.clipObj?.trackId : track.id) ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" title="Downloaded offline" />
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-400 font-medium">{track.artist}</td>
                      <td className="py-3 px-4 text-zinc-400 font-medium">{track.album}</td>
                      <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                        {formatDuration(track.duration)}
                      </td>

                      <td className="py-3 px-5 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleLikeSong(track.id)}
                            className={`p-1.5 rounded hover:bg-white/5 transition ${isLiked ? 'text-red-500 fill-red-500' : 'text-zinc-500 hover:text-white'
                              }`}
                            title="Like Song"
                          >
                            <Heart className="w-4 h-4" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuTrackId(openMenuTrackId === track.id ? null : track.id);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                              title="More options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openMenuTrackId === track.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuTrackId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-8 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTrackId(null);
                                      const realTrackId = track.isClip ? track.clipObj.trackId : track.id;
                                      const clip = track.isClip ? { name: track.clipObj.name, start: track.clipObj.start, end: track.clipObj.end } : null;
                                      playNext(realTrackId, clip);
                                      toast.success(`"${track.title}" will play next.`);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
                                    Play Next
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTrackId(null);
                                      const realTrackId = track.isClip ? track.clipObj.trackId : track.id;
                                      const clip = track.isClip ? { name: track.clipObj.name, start: track.clipObj.start, end: track.clipObj.end } : null;
                                      addToQueue(realTrackId, clip);
                                      toast.success(`"${track.title}" added to queue.`);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                                    Add to Queue
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTrackId(null);
                                      handleAddToPlaylist(track);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                    Add to Playlist
                                  </button>

                                  <div className="border-t border-white/5 my-1" />

                                  {!track.isClip && (
                                    downloadingTrackIds.has(track.id) ? (
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
                                          setOpenMenuTrackId(null);
                                          await removeDownload(track.id);
                                          toast.success('Download removed.');
                                        }}
                                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                                        Downloaded
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setOpenMenuTrackId(null);
                                          try {
                                            await downloadTrack(track.id);
                                            toast.success(`"${track.title}" downloaded for offline.`);
                                          } catch (err) {
                                            toast.error('Download failed.');
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5 text-zinc-400" />
                                        Download
                                      </button>
                                    )
                                  )}

                                  <div className="border-t border-white/5 my-1" />

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTrackId(null);
                                      const realTrackId = track.isClip ? track.clipObj.trackId : track.id;
                                      if (track.isClip) {
                                        navigate('trim-editor', { trackId: realTrackId, existingClip: track.clipObj });
                                      } else {
                                        navigate('trim-editor', { trackId: realTrackId });
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    {track.isClip ? (
                                      <>
                                        <Pencil className="w-3.5 h-3.5 text-brand-primary" />
                                        <span>Edit Clip</span>
                                      </>
                                    ) : (
                                      <>
                                        <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>Create Clip</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => handleSongPlay(track)}
                            className="p-1.5 rounded-full bg-brand-primary text-black hover:bg-brand-primary-hover shadow transition hover:scale-105 active:scale-95"
                            title="Play"
                          >
                            {isCurrentPlaying ? (
                              <Pause className="w-3 h-3 fill-black text-black" />
                            ) : (
                              <Play className="w-3 h-3 fill-black text-black translate-x-0.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTrackForPlaylist && (
        <AddToPlaylistModal
          trackId={selectedTrackForPlaylist.isClip ? selectedTrackForPlaylist.clipObj.trackId : selectedTrackForPlaylist.id}
          clip={selectedTrackForPlaylist.isClip ? selectedTrackForPlaylist.clipObj : null}
          clipId={selectedTrackForPlaylist.isClip ? selectedTrackForPlaylist.clipObj.id : null}
          onClose={() => setSelectedTrackForPlaylist(null)}
        />
      )}
    </div>
  );
};

export default Search;
