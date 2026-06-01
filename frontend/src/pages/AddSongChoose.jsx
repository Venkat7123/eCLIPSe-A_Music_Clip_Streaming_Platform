import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Search, Plus, Play, ChevronRight, Scissors } from 'lucide-react';

const AddSongChoose = () => {
  const toast = useToast();
  const { screenData, tracks, userClips, navigate, playlists, addSongToPlaylist } = useApp();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Songs');

  const playlistId = screenData?.playlistId;
  const playlist = playlists.find(p => p.id === playlistId);

  const handleBack = () => {
    if (playlist) {
      navigate('playlist-details', playlist);
    } else {
      navigate('playlists');
    }
  };

  const handleSelectTrack = (track) => {
    navigate('trim-editor', { playlistId, trackId: track.id });
  };

  const handleSelectClip = async (clip) => {
    try {
      await addSongToPlaylist(playlistId, clip.trackId, {
        name: clip.name,
        start: clip.start,
        end: clip.end,
      }, clip.id);
      toast.success(`Added clip "${clip.name}" to "${playlist.name}"!`);
      navigate('playlist-details', playlist);
    } catch (e) {
      toast.error(e.message || 'Failed to add clip to playlist.');
    }
  };

  const filteredTracks = tracks.filter((t) => {
    const matchText = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
    return matchText.includes(query.toLowerCase());
  });

  const filteredClips = userClips.filter((c) => {
    const parent = tracks.find(t => t.id === c.trackId);
    if (!parent) return false;
    const matchText = `${parent.title} ${parent.artist} ${c.name}`.toLowerCase();
    return matchText.includes(query.toLowerCase());
  });

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 text-left select-none">

      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6 text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlist
      </button>

      {/* Step Header */}
      <div className="mb-6">
        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Curator Workflow</span>
        <h2 className="text-2xl font-extrabold text-white mt-1">Add to Playlist</h2>
        <p className="text-xs text-brand-primary font-bold mt-1">
          {activeTab === 'Songs' ? 'Choose a track to clip' : 'Select an existing clip to add'}
        </p>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'Songs' ? 'Search tracks...' : 'Search clips...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-white text-xs outline-none focus:border-brand-primary transition"
          />
        </div>

        <div className="flex gap-2">
          {['Songs', 'Clips'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setQuery(''); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-brand-primary text-black active-glow font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Songs Table */}
      {activeTab === 'Songs' && (
        <div className="bg-zinc-900/35 border border-white/5 rounded-2xl glass-panel">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-bold">
                <th className="py-3 px-5 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Artist</th>
                <th className="py-3 px-4">Album</th>
                <th className="py-3 px-4 w-20 text-center">Duration</th>
                <th className="py-3 px-5 w-28 text-right">
                  <div className="flex justify-end">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, index) => (
                <tr
                  key={track.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-all text-zinc-300 group"
                >
                  <td className="py-3 px-5 text-center font-semibold text-zinc-500">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    <div className="flex items-center gap-3">
                      <img
                        src={track.artwork}
                        alt={track.title}
                        className="w-8 h-8 rounded object-cover border border-white/5 shrink-0"
                      />
                      <span className="truncate group-hover:text-brand-primary transition">
                        {track.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-400 font-medium">{track.artist}</td>
                  <td className="py-3 px-4 text-zinc-400 font-medium">{track.album}</td>
                  <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                    {formatDuration(track.duration)}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => handleSelectTrack(track)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-black hover:bg-brand-primary-hover font-extrabold text-[10px] uppercase transition shadow-md shadow-brand-primary/10"
                    >
                      <span>Select</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clips Table */}
      {activeTab === 'Clips' && (
        <div className="bg-zinc-900/35 border border-white/5 rounded-2xl glass-panel">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-bold">
                <th className="py-3 px-5 w-12 text-center">#</th>
                <th className="py-3 px-4">Clip / Song</th>
                <th className="py-3 px-4">Artist</th>
                <th className="py-3 px-4 w-20 text-center">Start</th>
                <th className="py-3 px-4 w-20 text-center">End</th>
                <th className="py-3 px-4 w-20 text-center">Duration</th>
                <th className="py-3 px-5 w-28 text-right">
                  <div className="flex justify-end">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClips.map((clip, index) => {
                const parent = tracks.find(t => t.id === clip.trackId);
                if (!parent) return null;
                return (
                  <tr
                    key={clip.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-all text-zinc-300 group"
                  >
                    <td className="py-3 px-5 text-center font-semibold text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={parent.artwork}
                          alt={parent.title}
                          className="w-8 h-8 rounded object-cover border border-white/5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Scissors className="w-3 h-3 text-brand-primary shrink-0" />
                            <span className="truncate group-hover:text-brand-primary transition">
                              {clip.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 truncate block">{parent.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-medium">{parent.artist}</td>
                    <td className="py-3 px-4 text-center text-zinc-400 font-mono">{formatDuration(clip.start)}</td>
                    <td className="py-3 px-4 text-center text-zinc-400 font-mono">{formatDuration(clip.end)}</td>
                    <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                      {formatDuration(clip.duration)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => handleSelectClip(clip)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-black hover:bg-brand-primary-hover font-extrabold text-[10px] uppercase transition shadow-md shadow-brand-primary/10"
                      >
                        <span>Add</span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredClips.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                    No clips found. Create clips from the Trim Editor first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default AddSongChoose;
