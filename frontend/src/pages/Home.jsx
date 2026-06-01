import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Plus, Clock, Disc, Sparkles, MoreHorizontal, ListPlus, Heart, Download, CheckCircle, CheckCircle2, Loader2 } from 'lucide-react';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import OfflineView from '../components/OfflineView';

const Home = () => {
  const {
    tracks,
    playlists,
    recentlyPlayed,
    playLibraryTracks,
    navigate,
    authProfile,
    addToQueue,
    playNext,
    toggleLikeSong,
    likedSongs,
    downloadedTrackIds,
    downloadingTrackIds,
    downloadTrack,
    removeDownload,
    isOnline
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [openMenuTrackId, setOpenMenuTrackId] = useState(null);

  if (!isOnline) {
    return <OfflineView pageName="Home" />;
  }

  // Get master tracks (first 7)
  const masterTracks = tracks.slice(0, 7);

  // Get full recently played track objects
  const recentlyPlayedTracks = recentlyPlayed
    .map(id => tracks.find(t => t.id === id))
    .filter(Boolean);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate('search', { query: searchVal.trim() });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-left select-none">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex flex-wrap items-center gap-2">
            Good evening, {authProfile?.name || 'Music Lover'}! <span className="animate-wiggle">🖐️</span>
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">Discover, play, and create your vibe.</p>
        </div>

        {/* Header Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 hidden md:block">
          <input
            type="text"
            placeholder="Search tracks, artists, albums..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-zinc-900 border border-white/5 rounded-full py-2 pl-4 pr-10 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Master Tracks Carousel / Grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Disc className="w-4 h-4 text-brand-primary animate-[spin_4s_linear_infinite]" />
            Master Tracks
          </h3>
          <button 
            onClick={() => navigate('search')} 
            className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover transition"
          >
            View all
          </button>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none snap-x snap-mandatory">
          {masterTracks.map((track) => (
            <div
              key={track.id}
              className="bg-zinc-900/60 hover:bg-zinc-900 p-3.5 rounded-xl border border-white/5 hover:border-brand-primary/20 transition-all duration-300 group relative w-40 sm:w-44 shrink-0 snap-start"
            >
              {/* 3-dot menu */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuTrackId(openMenuTrackId === track.id ? null : track.id);
                  }}
                  className="p-1 rounded-full bg-black/50 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {openMenuTrackId === track.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuTrackId(null)} />
                    <div className="absolute right-0 top-8 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                      <button
                        onClick={(e) => { e.stopPropagation(); playNext(track.id); setOpenMenuTrackId(null); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                      >
                        <ListPlus className="w-3.5 h-3.5" /> Play Next
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToQueue(track.id); setOpenMenuTrackId(null); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Queue
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLikeSong(track.id); setOpenMenuTrackId(null); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedSongs.includes(track.id) ? 'text-red-500 fill-red-500' : ''}`} />
                        {likedSongs.includes(track.id) ? 'Unlike' : 'Like'}
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setOpenMenuTrackId(null);
                          if (downloadedTrackIds.has(track.id)) {
                            await removeDownload(track.id);
                          } else {
                            try { await downloadTrack(track.id); } catch {}
                          }
                        }}
                        disabled={downloadingTrackIds.has(track.id)}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                      >
                        {downloadingTrackIds.has(track.id) ? (
                          <><Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" /> Downloading...</>
                        ) : downloadedTrackIds.has(track.id) ? (
                          <><CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" /> Downloaded</>
                        ) : (
                          <><Download className="w-3.5 h-3.5" /> Download</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div
                className="cursor-pointer"
                onClick={() => {
                  const idx = masterTracks.findIndex(t => t.id === track.id);
                  playLibraryTracks(masterTracks, idx >= 0 ? idx : 0);
                }}
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-white/5 mb-3">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-brand-primary text-black flex items-center justify-center shadow-lg shadow-brand-primary/40 hover:scale-105 active:scale-95 transition">
                      <Play className="w-5 h-5 fill-black text-black" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-white text-xs truncate group-hover:text-brand-primary transition flex items-center gap-1">
                    <span className="truncate">{track.title}</span>
                    {downloadingTrackIds.has(track.id) ? (
                      <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" title="Downloading..." />
                    ) : downloadedTrackIds.has(track.id) ? (
                      <CheckCircle2 className="w-3 h-3 text-brand-primary shrink-0" title="Downloaded offline" />
                    ) : null}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                  <div className="flex items-center justify-end mt-2">
                    <span className="text-[9px] text-zinc-500">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Made For You Playlists */}
      <section className="mb-8">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          Made for you
        </h3>

        <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none snap-x snap-mandatory">
          {playlists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="bg-zinc-900/60 hover:bg-zinc-900 p-3.5 rounded-xl border border-white/5 hover:border-brand-primary/20 transition-all duration-300 group cursor-pointer w-40 sm:w-44 shrink-0 snap-start"
              onClick={() => navigate('playlist-details', playlist)}
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-white/5 mb-3">
                <img 
                  src={playlist.artwork} 
                  alt={playlist.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-3 transition">
                  <div className="w-8 h-8 rounded-full bg-brand-primary text-black flex items-center justify-center shadow-lg ml-auto hover:scale-105 transition">
                    <Play className="w-4 h-4 fill-black text-black" />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <h4 className="font-semibold text-white text-xs truncate group-hover:text-brand-primary transition">
                  {playlist.name}
                </h4>
                <p className="text-[10px] text-zinc-400 truncate mt-1">
                  {playlist.trackIds.length} tracks
                </p>
              </div>
            </div>
          ))}

          {/* "+ Create Playlist" Card */}
          <div 
            className="bg-zinc-950 hover:bg-zinc-900 border border-dashed border-white/10 hover:border-brand-primary/30 p-3.5 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer w-40 sm:w-44 min-h-[180px] shrink-0 snap-start group"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-900 group-hover:bg-brand-primary/10 group-hover:text-brand-primary text-zinc-400 flex items-center justify-center border border-white/5 group-hover:border-brand-primary/20 transition-all mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-brand-primary transition">
              Create Playlist
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 max-w-[120px]">
              Add your curated music clips
            </span>
          </div>
        </div>
      </section>

      {/* Recently Played */}
      <section className="mb-8">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-brand-primary" />
          Recently played
        </h3>

        {recentlyPlayedTracks.length === 0 ? (
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-8 text-center text-zinc-500 text-xs">
            No recently played tracks yet. Choose a Master Track above to play!
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none snap-x snap-mandatory">
            {recentlyPlayedTracks.map((track) => (
              <div
                key={`recent-${track.id}`}
                className="bg-zinc-900/60 hover:bg-zinc-900 p-3.5 rounded-xl border border-white/5 hover:border-brand-primary/20 transition-all duration-300 group relative w-40 sm:w-44 shrink-0 snap-start"
              >
                {/* 3-dot menu */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuTrackId(openMenuTrackId === `recent-${track.id}` ? null : `recent-${track.id}`);
                    }}
                    className="p-1 rounded-full bg-black/50 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenuTrackId === `recent-${track.id}` && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuTrackId(null)} />
                      <div className="absolute right-0 top-8 z-50 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 text-left font-outfit">
                        <button
                          onClick={(e) => { e.stopPropagation(); playNext(track.id); setOpenMenuTrackId(null); }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> Play Next
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); addToQueue(track.id); setOpenMenuTrackId(null); }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add to Queue
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLikeSong(track.id); setOpenMenuTrackId(null); }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedSongs.includes(track.id) ? 'text-red-500 fill-red-500' : ''}`} />
                          {likedSongs.includes(track.id) ? 'Unlike' : 'Like'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => {
                    const idx = recentlyPlayedTracks.findIndex(t => t.id === track.id);
                    playLibraryTracks(recentlyPlayedTracks, idx >= 0 ? idx : 0);
                  }}
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-white/5 mb-3">
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white text-xs truncate group-hover:text-brand-primary transition flex items-center gap-1">
                      <span className="truncate">{track.title}</span>
                      {downloadingTrackIds.has(track.id) ? (
                        <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" title="Downloading..." />
                      ) : downloadedTrackIds.has(track.id) ? (
                        <CheckCircle2 className="w-3 h-3 text-brand-primary shrink-0" title="Downloaded offline" />
                      ) : null}
                    </h4>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Playlist Modal */}
      <CreatePlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Home;
