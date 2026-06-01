import React, { useState } from 'react';
import { 
  Music, 
  ListMusic, 
  Clock, 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Trash2 
} from 'lucide-react';

const ManageSongs = ({ 
  tracks, 
  playlists, 
  onAddSongClick, 
  onSongDelete, 
  onSongEdit 
}) => {
  const [songSearch, setSongSearch] = useState('');

  const calculateTotalDuration = () => {
    const totalSecs = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSongs = tracks.filter(t => {
    const matchSearch = `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(songSearch.toLowerCase());
    return matchSearch;
  });

  const uniqueAlbums = new Set(tracks.map(t => t.album).filter(Boolean)).size;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.15s_ease-out] text-[#a0aec0]">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left font-outfit">
          <h1 className="text-2xl font-semibold text-white leading-tight font-outfit">Manage Songs</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1.5">View, edit, and manage all songs in your library</p>
        </div>

        {/* Action and Filter Control Bar */}
        <div className="flex flex-wrap items-center gap-3 font-outfit">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search songs..."
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              className="bg-[#12131a] border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white text-xs outline-none focus:border-brand-primary transition w-56 font-outfit font-medium"
            />
          </div>

          <button
            onClick={onAddSongClick}
            className="bg-brand-primary hover:bg-purple-400 text-black text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-lg shadow-brand-primary/10 font-outfit"
          >
            <Plus className="w-4 h-4 text-black stroke-[2px]" />
            <span>Add New Song</span>
          </button>
        </div>
      </div>

      {/* Metrics Statistics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Songs', value: tracks.length, label2: 'All time', icon: Music, color: 'text-[#8b5cf6] bg-[#8b5cf6]/10' },
          { label: 'Total Albums', value: uniqueAlbums, label2: 'All time', icon: ListMusic, color: 'text-[#3b82f6] bg-[#3b82f6]/10' },
          { label: 'Total Duration', value: calculateTotalDuration(), label2: 'All time', icon: Clock, color: 'text-[#f59e0b] bg-[#f59e0b]/10' },
          { label: 'Total Artists', value: new Set(tracks.map(t => t.artist).filter(Boolean)).size, label2: 'All time', icon: Users, color: 'text-[#f97316] bg-[#f97316]/10' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#131520] border border-white/5 rounded-2xl p-6 py-6 flex items-center gap-4 text-left relative overflow-hidden shadow-sm hover:border-white/10 transition">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <div className="font-outfit">
                <span className="text-[10px] text-zinc-500 font-medium block uppercase tracking-wider font-outfit">{stat.label}</span>
                <span className="text-xl font-semibold text-white block mt-0.5 leading-none font-space">{stat.value}</span>
                <span className="text-[9px] text-zinc-400 font-medium block mt-1 font-outfit">{stat.label2}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalogue Table Pane */}
      <div className="bg-[#131520] border border-white/5 rounded-2xl overflow-hidden font-outfit shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-medium tracking-wider uppercase bg-[#171926]/40 select-none font-outfit">
                <th className="py-5 px-6 w-12 text-center font-outfit">#</th>
                <th className="py-5 px-4 font-outfit">Song</th>
                <th className="py-5 px-4 font-outfit">Artist</th>
                <th className="py-5 px-4 font-outfit">Album</th>
                <th className="py-5 px-4 font-outfit">Duration</th>
                <th className="py-5 px-4 font-outfit">Added On</th>
                <th className="py-5 px-4 font-outfit">Plays</th>
                <th className="py-5 px-6 w-24 text-right font-outfit">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-outfit">
              {filteredSongs.map((track, idx) => (
                <tr key={track.id} className="hover:bg-white/5 transition duration-150 text-zinc-300 font-medium font-outfit">
                  <td className="py-5 px-6 text-center font-medium text-zinc-500 font-space">{idx + 1}</td>
                  <td className="py-5 px-4 font-medium text-white font-outfit">
                    <div className="flex items-center gap-3">
                      <img src={track.artwork} alt={track.title} className="w-9 h-9 rounded-lg object-cover border border-white/5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate block font-semibold text-xs text-white leading-tight font-outfit">{track.title}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-zinc-400 font-medium font-outfit">{track.artist}</td>
                  <td className="py-5 px-4 text-zinc-400 font-medium font-outfit">{track.album}</td>
                  <td className="py-5 px-4 text-zinc-400 font-medium font-space">{formatDuration(track.duration)}</td>
                  <td className="py-5 px-4 text-zinc-400 font-medium font-outfit">{formatDate(track.createdAt)}</td>
                  <td className="py-5 px-4 text-zinc-400 font-medium font-space">{track.streams ?? '—'}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSongEdit(track)}
                        className="p-2 rounded-lg bg-[#0c0d12] hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition duration-200 cursor-pointer"
                        title="Edit song details"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSongDelete(track.id, track.title)}
                        className="p-2 rounded-lg bg-[#0c0d12] hover:bg-red-500/10 border border-white/5 text-zinc-500 hover:text-red-400 transition duration-200 cursor-pointer"
                        title="Delete song"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSongs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-zinc-500 font-medium font-outfit">
                    No matching tracks found in catalogue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs select-none font-outfit font-medium">
        <span className="font-medium text-zinc-500">Showing {filteredSongs.length} of {tracks.length} songs</span>
      </div>

    </div>
  );
};

export default ManageSongs;
