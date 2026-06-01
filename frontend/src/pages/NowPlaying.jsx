import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Heart,
  Plus,
  Scissors,
  Trash2,
  Sparkles,
  Music,
  GripVertical,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MoreVertical,
  Smartphone,
  AudioLines,
  ListMusic,
  Download,
  CheckCircle2,
  Loader2,
  WifiOff
} from 'lucide-react';
import audioSynth from '../utils/audioSynth';

const NowPlaying = () => {
  const {
    currentTrack,
    currentClip,
    isPlaying,
    currentTime,
    duration,
    playbackMode,
    likedSongs,
    toggleLikeSong,
    togglePlay,
    handleNext,
    handlePrev,
    seek,
    repeatMode,
    shuffleMode,
    setRepeatMode,
    setShuffleMode,
    queue,
    queueIndex,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
    tracks,
    playTrack,
    navigate,
    addSongToPlaylist,
    playlists,
    downloadTrack,
    downloadedTrackIds,
    downloadingTrackIds,
    isOnline
  } = useApp();
  const toast = useToast();

  const isDownloaded = downloadedTrackIds?.has(currentTrack?.id);
  const isDownloading = downloadingTrackIds?.has(currentTrack?.id);

  const handleDownload = async () => {
    if (!currentTrack) return;
    if (isDownloaded) {
      toast.info('Already saved offline! Navigate to Downloads to manage it.');
      return;
    }
    try {
      await downloadTrack(currentTrack.id);
      toast.success('Track saved offline successfully!');
    } catch (e) {
      toast.error('Failed to download track. Check your connection.');
    }
  };

  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [visualizerBars, setVisualizerBars] = useState([]);
  const [queueState, setQueueState] = useState('closed'); // 'closed', 'stretched', 'full'
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = startY - endY; // positive = swiped up, negative = swiped down

    if (diff > 40) {
      if (queueState === 'closed') setQueueState('stretched');
      else if (queueState === 'stretched') setQueueState('full');
    } else if (diff < -40) {
      if (queueState === 'full') setQueueState('stretched');
      else if (queueState === 'stretched') setQueueState('closed');
    }
  };

  const handleHandleClick = () => {
    if (queueState === 'stretched') setQueueState('full');
    else if (queueState === 'full') setQueueState('stretched');
  };

  const animationRef = useRef(null);

  // Sync real-time frequency visualizer bars from audioSynth analyser
  useEffect(() => {
    const updateVisualizer = () => {
      if (isPlaying) {
        const data = audioSynth.getAnalyserData();
        const bars = [];
        const numBars = 60;
        const step = Math.floor(data.length / numBars);
        for (let i = 0; i < numBars; i++) {
          const val = data[i * step] || 0;
          const height = Math.max(8, (val / 255) * 85);
          bars.push(height);
        }
        // Mirror for center-out look
        const half = Math.floor(numBars / 2);
        const mirroredBars = [];
        for (let i = half - 1; i >= 0; i--) mirroredBars.push(bars[i]);
        for (let i = 0; i < half; i++) mirroredBars.push(bars[i]);
        setVisualizerBars(mirroredBars);
      } else {
        const bars = [];
        const numBars = 60;
        const time = Date.now() * 0.002;
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2.5;
          const sineVal = Math.sin(angle - time) * 0.5 + Math.sin(angle * 2.3 + time * 1.5) * 0.3;
          const height = 15 + Math.max(0, sineVal + 0.8) * 20;
          bars.push(height);
        }
        setVisualizerBars(bars);
      }
      animationRef.current = requestAnimationFrame(updateVisualizer);
    };

    updateVisualizer();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  if (!currentTrack) {
    return (
      <div className="flex-1 p-8 text-zinc-400 text-left select-none bg-[#040409]">
        <p>No track currently playing. Select a track from Home or Search to begin!</p>
      </div>
    );
  }

  const isLiked = likedSongs.includes(currentTrack.id);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e) => {
    seek(parseFloat(e.target.value));
  };

  const cycleRepeatMode = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const handleQueuePlay = (index) => {
    const item = queue[index];
    if (!item) return;
    const track = tracks.find(t => t.id === item.trackId);
    if (track) playTrack(track, !!item.clip, item.clip, true);
  };

  // Drag state for queue reordering
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setOverIndex(index);
  };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) moveQueueItem(dragIndex, index);
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // "Add to Playlist" — opens the modal
  const openAddToPlaylist = () => {
    if (!currentTrack) return;
    setShowAddToPlaylist(true);
  };

  const displayTitle = playbackMode === 'clip' && currentClip
    ? `${currentTrack.title} (Clip)`
    : currentTrack.title;

  const displaySubtitle = playbackMode === 'clip' && currentClip
    ? currentClip.name
    : currentTrack.artist;

  const progressPercent = (currentTime / (duration || 1)) * 100;

  // Queue total duration
  const totalQueueSeconds = queue.reduce((acc, item) => {
    const track = tracks.find(t => t.id === item.trackId);
    if (!track) return acc;
    return acc + (item.clip ? item.clip.end - item.clip.start : track.duration);
  }, 0);
  const totalQueueMins = Math.floor(totalQueueSeconds / 60);
  const totalQueueSecs = Math.floor(totalQueueSeconds % 60);  return (
    <div className="flex-1 flex overflow-hidden h-full select-none bg-[#07070e] text-white font-outfit relative">

      {/* ── AMBIENT GLOW ── */}
      <div className="absolute top-0 left-0 w-[55%] h-[55%] bg-purple-900/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-[30%] w-[40%] h-[40%] bg-indigo-950/8 rounded-full blur-[120px] pointer-events-none" />

      {/* ════════════════════════════════════════
          MOBILE VIEW SPEC (md:hidden)
      ════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col flex-1 h-full relative overflow-y-auto scrollbar-none pb-6 bg-[#06060b] px-6 z-10 select-none">

        {/* Offline Banner - Mobile */}
        

        {/* Mobile Header */}
        <div className="flex items-center justify-between py-5 shrink-0">
          <button
            onClick={() => navigate('home')}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="font-bold text-xs tracking-wider uppercase text-zinc-400">Now Playing</span>
          <button
            onClick={() => setQueueState(queueState === 'closed' ? 'stretched' : 'closed')}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>

        {/* Artwork Display */}
        <div className="flex-1 flex items-center justify-center py-4 shrink-0">
          <div className="w-[72vw] h-[72vw] max-w-[300px] max-h-[300px] rounded-[2.2rem] overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.65)] border border-white/5 shrink-0 relative aspect-square">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Metadata & Liked Buttons */}
        <div className="flex items-center justify-between mt-4 shrink-0">
          <div className="flex-1 min-w-0 text-left pr-4">
            <h2 className="text-xl font-bold text-white tracking-tight truncate leading-snug">
              {displayTitle}
            </h2>
            <p className="text-[11px] font-medium mt-1 truncate">
              <span className="text-purple-400 font-bold">{displaySubtitle}</span>
              <span className="text-zinc-500"> • {currentTrack.album || 'Unknown Album'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3.5 shrink-0">
            <button
              onClick={() => toggleLikeSong(currentTrack.id)}
              className={`p-1 transition-all ${
                isLiked ? 'text-purple-500 fill-purple-500 scale-105' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Heart className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`p-1 transition-all ${
                isDownloading ? 'text-brand-primary/60 cursor-wait' :
                isDownloaded ? 'text-brand-primary scale-105' : 'text-zinc-500 hover:text-white'
              }`}
              title={isDownloading ? 'Downloading...' : isDownloaded ? 'Downloaded' : 'Download offline'}
            >
              {isDownloading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : isDownloaded
                  ? <CheckCircle2 className="w-5 h-5" />
                  : <Download className="w-5 h-5" />
              }
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openAddToPlaylist(); }}
              className="p-1 text-zinc-500 hover:text-white transition"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Neon Glowing Waveform */}
        <div className="w-full h-12 flex items-center justify-between gap-[2px] mt-6 px-1 shrink-0 overflow-hidden">
          {visualizerBars.map((height, idx) => (
            <div
              key={`vis-mob-${idx}`}
              className="flex-1 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, height * 0.75)}%`,
                background: isPlaying
                  ? `hsl(${260 + idx * 1.5}, 85%, 60%)`
                  : '#4b1c7c',
                opacity: isPlaying ? 0.9 : 0.4
              }}
            />
          ))}
        </div>

        {/* Seek Progress Timeline */}
        <div className="mt-4 shrink-0">
          <div className="relative w-full group">
            {/* Background line */}
            <div className="w-full h-[4px] bg-white/10 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-brand-primary rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Range input slider */}
            <input
              type="range"
              min="0"
              max={duration || 1}
              value={currentTime}
              onChange={handleProgressChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Glowing slider thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_12px_rgba(168,85,247,0.85)] pointer-events-none z-0"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>
          {/* Time stamps */}
          <div className="flex justify-between mt-2.5 text-[10px] font-mono font-medium text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-between mt-5 px-4 shrink-0">
          <button
            onClick={() => setShuffleMode(!shuffleMode)}
            className={`p-1 cursor-pointer transition ${
              shuffleMode ? 'text-purple-400 scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Shuffle className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handlePrev}
            className="p-1 text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Giant circle play button */}
          <button
            onClick={togglePlay}
            className="w-18 h-18 rounded-full border border-purple-500 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-purple-500/10 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-1 text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={cycleRepeatMode}
            className={`p-1 cursor-pointer relative transition ${
              repeatMode !== 'none' ? 'text-purple-400 scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Repeat className="w-4.5 h-4.5" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[7px] bg-purple-500 text-black font-extrabold px-1 rounded-full">1</span>
            )}
          </button>
        </div>

        {/* Up Next Pull-up Tab Trigger */}
        <div className="flex flex-col items-center mt-7 mb-2 shrink-0">
          <button
            onClick={() => setQueueState(queueState === 'closed' ? 'stretched' : 'closed')}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 rounded-full text-zinc-400 hover:text-white transition active:scale-95 shadow-lg select-none cursor-pointer"
          >
            <ChevronUp className={`w-3.5 h-3.5 text-brand-primary transition-transform duration-300 ${queueState !== 'closed' ? 'rotate-180' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Up Next</span>
          </button>
        </div>

        {/* Mobile Up Next sliding drawer with Gesture Swiping & Multi-Stage Expansion */}
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
            queueState !== 'closed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`} 
          onClick={() => setQueueState('closed')} 
        />
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 flex flex-col font-outfit shadow-[0_-8px_35px_rgba(0,0,0,0.65)] bg-[#101014]/98 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.2rem]"
          style={{
            height: '92vh',
            transform: queueState === 'closed'
              ? 'translateY(100%)'
              : queueState === 'stretched'
                ? 'translateY(calc(100% - 280px))'
                : 'translateY(0)'
          }}
        >
          {/* Compact Mini-Player style Current Song display above the drag option when fully opened */}
          {queueState === 'full' && (
            <div 
              className="mx-3 mt-4 mb-1 p-2 bg-[#121214]/90 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition relative z-20 select-none overflow-hidden shrink-0 font-outfit"
            >
              {/* Track details */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-10 h-10 shrink-0 shadow-md">
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className={`w-full h-full rounded-full object-cover border border-white/5 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                  />
                  <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-[#0a0a0c] border border-white/5 shadow-inner flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-brand-primary"></div>
                  </div>
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-bold text-xs text-white truncate max-w-[155px]">
                    {currentTrack.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate max-w-[125px]">
                    {currentTrack.artist}
                  </span>
                </div>
              </div>

              {/* Timed progress micro bar baseline */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                <div
                  className="h-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Simple controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow cursor-pointer shrink-0 animate-none"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black text-black" /> : <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />}
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setQueueState('stretched')}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
                  title="Minimize"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Drag Handle with Touch Swiping and Tapping gestures */}
          <div 
            className="w-16 py-3.5 mx-auto cursor-pointer shrink-0 flex items-center justify-center group"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleHandleClick}
          >
            <div className="w-12 h-1.5 bg-zinc-700 group-hover:bg-zinc-500 rounded-full transition-colors" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 pb-3 shrink-0">
            <h3 className="text-base font-bold text-white">Up Next</h3>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 border border-purple-500/20 px-3 py-1 rounded-full transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Queue items list */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-none">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 text-zinc-600 py-12">
                <Music className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold text-zinc-500">Queue is empty</p>
              </div>
            ) : (
              queue.map((item, index) => {
                const track = tracks.find(t => t.id === item.trackId);
                if (!track) return null;

                const isCurrentInQueue = index === queueIndex;

                return (
                  <div
                    key={`mob-queue-${item.trackId}-${index}`}
                    onClick={() => {
                      handleQueuePlay(index);
                      setQueueState('closed');
                    }}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition mb-1 cursor-pointer group ${
                      isCurrentInQueue ? 'bg-purple-950/20' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {isCurrentInQueue ? (
                      <>
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-500 rounded-full" />
                        <Play className="w-3.5 h-3.5 fill-purple-400 text-purple-400 shrink-0" />
                      </>
                    ) : (
                      <GripVertical className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 shrink-0 transition" />
                    )}

                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-10 h-10 rounded-xl object-cover border border-white/5 shrink-0"
                    />

                    <div className="flex-1 min-w-0 text-left">
                      <h4 className={`text-xs font-bold truncate ${
                        isCurrentInQueue ? 'text-purple-400' : 'text-white'
                      }`}>
                        {track.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-mono ${
                        isCurrentInQueue ? 'text-purple-400' : 'text-zinc-500'
                      }`}>
                        {formatTime(item.clip ? item.clip.duration || (item.clip.end - item.clip.start) : track.duration)}
                      </span>
                      
                      <div onClick={(e) => { e.stopPropagation(); openAddToPlaylist(); }}>
                        <MoreVertical className="w-4 h-4 text-zinc-500 hover:text-white" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════
          DESKTOP VIEW (hidden md:flex)
      ════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden h-full relative">
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none relative z-10">
          

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4 shrink-0">
            <button
              onClick={() => navigate('home')}
              className="flex items-center gap-3 text-white hover:text-purple-400 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/8 group-hover:bg-white/10 transition">
                <ChevronDown className="w-4 h-4" />
              </div>
              <span className="font-semibold text-base tracking-wide">Now Playing</span>
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={openAddToPlaylist}
                className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition group"
              >
                <div className="relative">
                  <Music className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-purple-500 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    +
                  </span>
                </div>
                <span className="text-[8px] uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition">
                  Add to Playlist
                </span>
              </button>
              
            </div>
          </div>

          {/* Main content split */}
          <div className="flex items-center gap-8 px-8 py-8 shrink-0">
            <div className="shrink-0 w-[200px] h-[200px] xl:w-[230px] xl:h-[230px] rounded-[1.5rem] overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.18)] border border-purple-500/10 group">
              <img
                src={currentTrack.artwork}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0 py-2">
              <h1 className="text-3xl xl:text-3xl font-bold text-white tracking-tight leading-tight mb-3 line-clamp-2">
                {displayTitle}
              </h1>

              <p className="text-base font-medium mb-7">
                <span className="text-purple-400 font-semibold">{displaySubtitle}</span>
                <span className="text-zinc-500"> • {currentTrack.album || 'Unknown Album'}</span>
              </p>

              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => toggleLikeSong(currentTrack.id)}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${
                    isLiked
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.25)]'
                      : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4.5 h-4.5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('trim-editor', { trackId: currentTrack.id })}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                >
                  <Scissors className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={openAddToPlaylist}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${
                    isDownloading
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400/60 cursor-wait'
                      : isDownloaded
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.25)]'
                        : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={isDownloading ? 'Downloading...' : isDownloaded ? 'Downloaded' : 'Download offline'}
                >
                  {isDownloading
                    ? <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    : isDownloaded
                      ? <CheckCircle2 className="w-4.5 h-4.5" />
                      : <Download className="w-4.5 h-4.5" />
                  }
                </button>
              </div>

              <div className="w-full h-14 flex items-end gap-[2px] overflow-hidden">
                {visualizerBars.map((height, idx) => (
                  <div
                    key={`vis-${idx}`}
                    className="flex-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}%`,
                      background: isPlaying
                        ? `hsl(${260 + idx * 1.2}, 70%, 65%)`
                        : 'rgba(139,92,246,0.3)',
                      opacity: isPlaying ? 0.9 : 0.5
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Seek progress */}
          <div className="px-8 pt-3 pb-1 shrink-0">
            <div className="relative w-full group">
              <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden pointer-events-none">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 1}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)] pointer-events-none z-0 transition-all"
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-8 xl:gap-10 px-8 py-4 shrink-0">
            <button
              onClick={() => setShuffleMode(!shuffleMode)}
              className={`p-2 transition-all cursor-pointer ${
                shuffleMode ? 'text-purple-400 scale-110' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={handlePrev}
              className="text-zinc-300 hover:text-white transition hover:scale-110 active:scale-95 cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full border-2 border-purple-500 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_36px_rgba(139,92,246,0.55)] cursor-pointer bg-purple-500/10"
            >
              {isPlaying
                ? <Pause className="w-6 h-6 fill-current" />
                : <Play className="w-6 h-6 fill-current" />
              }
            </button>

            <button
              onClick={handleNext}
              className="text-zinc-300 hover:text-white transition hover:scale-110 active:scale-95 cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-2 relative transition-all cursor-pointer ${
                repeatMode !== 'none' ? 'text-purple-400 scale-110' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 'one' && (
                <span className="absolute top-0 right-0 text-[8px] bg-purple-500 text-black font-bold px-1 rounded-full">1</span>
              )}
            </button>
          </div>
        </div>

        {/* Up Next Sidebar */}
        <aside className="hidden lg:flex w-72 xl:w-80 h-full flex-col border-l border-white/[0.05] bg-white/[0.015] shrink-0 relative z-10">
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/[0.05] shrink-0">
            <h3 className="text-sm font-semibold text-white tracking-wide">Up Next</h3>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[10px] text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 px-3 py-1.5 rounded-lg transition font-semibold tracking-widest uppercase"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col py-2 scrollbar-thin scrollbar-thumb-white/10">
            {queue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-zinc-600 py-10">
                <Music className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium text-zinc-500">Queue is empty</p>
              </div>
            ) : (
              queue.map((item, index) => {
                const track = tracks.find(t => t.id === item.trackId);
                if (!track) return null;

                const isDragging = dragIndex === index;
                const isOver = overIndex === index && dragIndex !== index;
                const isCurrentInQueue = index === queueIndex;

                return (
                  <div
                    key={`queue-${item.trackId}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleQueuePlay(index)}
                    className={`relative flex items-center gap-3 px-4 py-2.5 transition cursor-pointer group ${
                      isCurrentInQueue ? 'bg-purple-950/20' : 'hover:bg-white/[0.04]'
                    } ${isDragging ? 'opacity-40 scale-95' : ''} ${isOver ? 'border-t border-purple-500/40' : ''}`}
                  >
                    {isCurrentInQueue && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-purple-500 rounded-full" />
                    )}

                    <GripVertical className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition shrink-0" />

                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-9 h-9 rounded-lg object-cover border border-white/5 shrink-0 shadow-sm"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[11px] font-semibold truncate transition ${
                        isCurrentInQueue ? 'text-purple-400' : 'text-zinc-100 group-hover:text-purple-400'
                      }`}>
                        {track.title}
                        {item.clip && (
                          <span className="ml-1.5 text-[8px] bg-purple-500/15 text-purple-400 px-1 py-0.5 rounded uppercase tracking-wide font-bold">
                            Clip
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium tabular-nums ${
                        isCurrentInQueue ? 'text-purple-400' : 'text-zinc-500'
                      }`}>
                        {formatTime(item.clip ? item.clip.duration || (item.clip.end - item.clip.start) : track.duration)}
                      </span>

                      <div className="w-4 flex justify-end shrink-0">
                        {isCurrentInQueue && (
                          <div className="flex gap-[1.5px] items-end h-3.5">
                            <span className="w-[2px] bg-purple-500 rounded-full h-1.5 animate-[pulse_0.7s_ease-in-out_infinite]" />
                            <span className="w-[2px] bg-purple-500 rounded-full h-3.5 animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
                            <span className="w-[2px] bg-purple-500 rounded-full h-2 animate-[pulse_0.9s_ease-in-out_infinite_0.2s]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {queue.length > 0 && (
            <div className="px-5 py-4 border-t border-white/[0.05] text-xs text-purple-400 font-semibold tracking-wide shrink-0">
              {queue.length} song{queue.length !== 1 ? 's' : ''} • {totalQueueMins}m {totalQueueSecs}s
            </div>
          )}
        </aside>
      </div>

      {/* Add to Playlist Modal */}
      {showAddToPlaylist && currentTrack && (
        <AddToPlaylistModal
          trackId={currentTrack.id}
          clip={currentClip}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}
    </div>
  );
};

export default NowPlaying;
