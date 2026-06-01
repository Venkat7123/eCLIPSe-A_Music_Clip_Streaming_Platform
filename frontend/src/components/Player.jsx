import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import AddToPlaylistModal from './AddToPlaylistModal';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
  Maximize2,
  ListMusic,
  Download,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const Player = () => {
  const toast = useToast();
  const {
    currentTrack,
    currentClip,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackMode,
    shuffleMode,
    repeatMode,
    togglePlay,
    handleNext,
    handlePrev,
    seek,
    setVolume,
    setIsMuted,
    setShuffleMode,
    setRepeatMode,
    navigate,
    playlists,
    addSongToPlaylist,
    downloadedTrackIds,
    downloadingTrackIds,
    downloadTrack,
    removeDownload
  } = useApp();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const cycleRepeatMode = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const quickAddToPlaylist = () => {
    if (!currentTrack) return;
    setShowAddToPlaylist(true);
  };

  if (!currentTrack) return null;

  const displayTitle = playbackMode === 'clip' && currentClip
    ? `${currentTrack.title} (Clip)`
    : currentTrack.title;

  const displaySubtitle = playbackMode === 'clip' && currentClip
    ? currentClip.name
    : currentTrack.artist;

  return (
    <div className="h-20 bg-zinc-950 border-t border-white/5 flex items-center justify-between px-6 select-none shrink-0 relative z-20">

      {/* Left Section: Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        <div className={`relative group w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 cursor-pointer`} onClick={() => navigate('now-playing')}>
          <img
            src={currentTrack.artwork}
            alt={currentTrack.title}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isPlaying ? 'animate-pulse-slow' : ''}`}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col min-w-0 text-left">
          <span className="font-medium text-white truncate text-sm hover:underline cursor-pointer" onClick={() => navigate('now-playing')}>
            {displayTitle}
          </span>
          <span className="text-zinc-400 text-xs truncate">
            {displaySubtitle}
          </span>
        </div>

        {/* Animated mini-visualizer wave bar */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-3 ml-2 shrink-0">
            <span className="w-0.5 bg-brand-primary animate-[bounce_0.8s_infinite] h-2"></span>
            <span className="w-0.5 bg-brand-primary animate-[bounce_0.5s_infinite] h-3"></span>
            <span className="w-0.5 bg-brand-primary animate-[bounce_1s_infinite] h-1.5"></span>
            <span className="w-0.5 bg-brand-primary animate-[bounce_0.6s_infinite] h-2.5"></span>
          </div>
        )}
      </div>

      {/* Middle Section: Player Controls & Timeline */}
      <div className="flex flex-col items-center gap-1.5 w-2/5">

        {/* Button Controls */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setShuffleMode(!shuffleMode)}
            className={`p-1 rounded transition ${shuffleMode ? 'text-brand-primary active-glow' : 'text-zinc-400 hover:text-white'}`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrev}
            className="text-zinc-400 hover:text-white transition p-1"
            title="Previous"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/5"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="text-zinc-400 hover:text-white transition p-1"
            title="Next"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={cycleRepeatMode}
            className={`p-1 rounded transition relative ${repeatMode !== 'none' ? 'text-brand-primary active-glow' : 'text-zinc-400 hover:text-white'}`}
            title={`Repeat: ${repeatMode}`}
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[8px] bg-brand-primary text-black font-semibold px-1 rounded-full">1</span>
            )}
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center gap-3 text-xs text-zinc-400 select-none">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>

          <div className="relative flex-1 group">
            <input 
              type="range" 
              min="0" 
              max={duration} 
              value={currentTime} 
              onChange={handleProgressChange}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-brand-primary transition-all outline-none"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(currentTime / duration) * 100}%, #27272a ${(currentTime / duration) * 100}%, #27272a 100%)`
              }}
            />
          </div>

          <span className="w-10 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Section: Volume & Queue expanded trigger */}
      <div className="flex items-center gap-4 w-1/4 justify-end">
        <button
          onClick={quickAddToPlaylist}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
          title="Add to Playlist"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={async () => {
            if (!currentTrack) return;
            if (downloadedTrackIds.has(currentTrack.id)) {
              await removeDownload(currentTrack.id);
              toast.success('Download removed.');
            } else {
              try {
                await downloadTrack(currentTrack.id);
                toast.success('Track saved offline successfully!');
              } catch (e) {
                toast.error('Failed to download track.');
              }
            }
          }}
          disabled={downloadingTrackIds.has(currentTrack?.id)}
          className={`p-2 rounded-lg transition ${
            downloadingTrackIds.has(currentTrack?.id) ? 'text-brand-primary/60 cursor-wait' :
            downloadedTrackIds.has(currentTrack?.id) ? 'text-brand-primary scale-105' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title={downloadingTrackIds.has(currentTrack?.id) ? 'Downloading...' : downloadedTrackIds.has(currentTrack?.id) ? 'Downloaded' : 'Download'}
        >
          {downloadingTrackIds.has(currentTrack?.id) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : downloadedTrackIds.has(currentTrack?.id) ? (
            <CheckCircle2 className="w-4 h-4 text-brand-primary" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2 group/volume max-w-[120px]">
          <button
            onClick={toggleMute}
            className="p-1 text-zinc-400 hover:text-white transition"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-brand-primary outline-none"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(isMuted ? 0 : volume) * 100}%, #3f3f46 ${(isMuted ? 0 : volume) * 100}%, #3f3f46 100%)`
            }}
          />
        </div>

        <button
          onClick={() => navigate('now-playing')}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
          title="Open Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>
      </div>

      {showAddToPlaylist && (
        <AddToPlaylistModal
          trackId={currentTrack.id}
          clip={playbackMode === 'clip' ? currentClip : null}
          clipId={playbackMode === 'clip' && currentClip ? currentClip.id : null}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}
    </div>
  );
};

export default Player;
