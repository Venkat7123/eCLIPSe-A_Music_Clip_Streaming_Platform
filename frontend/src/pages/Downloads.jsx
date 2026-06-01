import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Trash2, Play, Pause, HardDrive, ListMusic } from 'lucide-react';
import { getAllDownloads, removeDownload, formatBytes, getArtworkUrl } from '../utils/downloadManager';

const Downloads = () => {
  const { playDownloads, currentTrack, isPlaying, togglePlay, navigate } = useApp();
  const [downloads, setDownloads] = useState([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const all = await getAllDownloads();
      setDownloads(all.sort((a, b) => b.downloadedAt - a.downloadedAt));
      setTotalSize(all.reduce((sum, d) => sum + (d.size || 0), 0));
    } catch (e) {
      console.error('Failed to load downloads:', e);
    }
  };

  // Group by playlist
  const { playlistGroups, standaloneTracks } = useMemo(() => {
    const groups = {};
    const standalone = [];
    for (const d of downloads) {
      if (d.playlistId) {
        if (!groups[d.playlistId]) {
          groups[d.playlistId] = { id: d.playlistId, name: d.playlistName, tracks: [] };
        }
        groups[d.playlistId].tracks.push(d);
      } else {
        standalone.push(d);
      }
    }
    return { playlistGroups: Object.values(groups), standaloneTracks: standalone };
  }, [downloads]);

  const handleRemove = async (trackId) => {
    if (!confirm('Remove this downloaded track?')) return;
    try {
      await removeDownload(trackId);
      setDownloads((prev) => prev.filter((d) => d.id !== trackId));
      setTotalSize((prev) => prev - (downloads.find(d => d.id === trackId)?.size || 0));
    } catch (e) {
      console.error('Failed to remove download:', e);
    }
  };

  const handleRemovePlaylist = async (playlistId) => {
    if (!confirm('Remove all tracks in this playlist from downloads?')) return;
    const tracksToRemove = downloads.filter(d => d.playlistId === playlistId);
    try {
      for (const d of tracksToRemove) {
        await removeDownload(d.id);
      }
      setDownloads((prev) => prev.filter((d) => d.playlistId !== playlistId));
      setTotalSize((prev) => prev - tracksToRemove.reduce((sum, d) => sum + (d.size || 0), 0));
    } catch (e) {
      console.error('Failed to remove playlist downloads:', e);
    }
  };

  const handlePlay = (download, list) => {
    if (currentTrack?.id === download.id) {
      togglePlay();
    } else {
      const startIndex = list.findIndex(d => d.id === download.id);
      playDownloads(list, startIndex >= 0 ? startIndex : 0);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const renderTrackRow = (download, index, list) => {
    const isCurrent = currentTrack?.id === download.id;
    const isCurrentPlaying = isCurrent && isPlaying;
    const artworkUrl = getArtworkUrl(download);

    return (
      <tr
        key={download.id}
        className={`border-b border-white/5 hover:bg-white/5 transition-all group ${isCurrent ? 'bg-brand-primary/5' : ''}`}
      >
        <td className="py-3 px-4 text-center text-zinc-500">{index + 1}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <img src={artworkUrl} alt={download.title} className="w-8 h-8 rounded object-cover border border-white/5 shrink-0" />
            <span className={`font-medium truncate ${isCurrent ? 'text-brand-primary' : 'text-white'}`}>
              {download.title}
            </span>
          </div>
        </td>
        <td className="py-3 px-4 text-zinc-400">{download.artist}</td>
        <td className="py-3 px-4 text-center text-zinc-400 font-mono">{formatDuration(download.duration)}</td>
        <td className="py-3 px-4 text-center text-zinc-500">{formatDate(download.downloadedAt)}</td>
        <td className="py-3 px-4 text-center text-zinc-500 font-mono">{formatBytes(download.size)}</td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleRemove(download.id)}
              className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/5 transition cursor-pointer"
              title="Remove download"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handlePlay(download, list)}
              className="p-1.5 rounded-full bg-brand-primary text-black hover:bg-brand-primary-hover shadow transition hover:scale-105 active:scale-95 cursor-pointer"
              title={isCurrentPlaying ? 'Pause' : 'Play'}
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
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 text-left select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Download className="w-6 h-6 text-brand-primary" />
            Downloads
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {downloads.length} track{downloads.length !== 1 ? 's' : ''} • {formatBytes(totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <HardDrive className="w-4 h-4" />
          <span>Available offline</span>
        </div>
      </div>

      {/* Content */}
      {downloads.length === 0 ? (
        <div className="bg-zinc-900/10 border border-white/5 border-dashed rounded-2xl p-16 text-center text-zinc-500 max-w-xl mx-auto flex flex-col items-center gap-4">
          <Download className="w-12 h-12 text-zinc-600" />
          <div>
            <h4 className="text-sm font-semibold text-white">No downloads yet</h4>
            <p className="text-xs text-zinc-500 mt-1">Download songs to listen offline when you don't have an internet connection.</p>
          </div>
          <button
            onClick={() => navigate('home')}
            className="px-4 py-2 bg-brand-primary text-black font-extrabold rounded-lg text-xs"
          >
            Browse Songs
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Playlist groups */}
          {playlistGroups.map((group) => (
            <div key={group.id} className="bg-zinc-900/35 border border-white/5 rounded-2xl glass-panel overflow-hidden">
              {/* Playlist header */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <ListMusic className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm font-semibold text-white">{group.name}</span>
                  <span className="text-xs text-zinc-500">{group.tracks.length} track{group.tracks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlay(group.tracks[0], group.tracks)}
                    className="p-1.5 rounded-full bg-brand-primary text-black hover:bg-brand-primary-hover shadow transition hover:scale-105 active:scale-95 cursor-pointer"
                    title="Play playlist"
                  >
                    <Play className="w-3 h-3 fill-black text-black translate-x-0.5" />
                  </button>
                  <button
                    onClick={() => handleRemovePlaylist(group.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/5 transition cursor-pointer"
                    title="Remove playlist downloads"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Playlist tracks */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-medium font-space">
                    <th className="py-2 px-4 w-10 text-center">#</th>
                    <th className="py-2 px-4">Title</th>
                    <th className="py-2 px-4">Artist</th>
                    <th className="py-2 px-4 w-24 text-center">Duration</th>
                    <th className="py-2 px-4 w-24 text-center">Downloaded</th>
                    <th className="py-2 px-4 w-20 text-center">Size</th>
                    <th className="py-2 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tracks.map((d, i) => renderTrackRow(d, i, group.tracks))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Standalone tracks */}
          {standaloneTracks.length > 0 && (
            <div className="bg-zinc-900/35 border border-white/5 rounded-2xl glass-panel">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider font-medium font-space">
                    <th className="py-3 px-4 w-10 text-center">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Artist</th>
                    <th className="py-3 px-4 w-24 text-center">Duration</th>
                    <th className="py-3 px-4 w-24 text-center">Downloaded</th>
                    <th className="py-3 px-4 w-20 text-center">Size</th>
                    <th className="py-3 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {standaloneTracks.map((d, i) => renderTrackRow(d, i, standaloneTracks))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Downloads;
