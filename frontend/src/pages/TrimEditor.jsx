import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Play, Pause, Music } from 'lucide-react';
import audioSynth from '../utils/audioSynth';

const TrimEditor = () => {
  const { screenData, tracks, playlists, addSongToPlaylist, updateClipInPlaylist, createClip, navigate } = useApp();
  const toast = useToast();
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [waveformBars, setWaveformBars] = useState([]);

  const trackId = screenData?.trackId;
  const playlistId = screenData?.playlistId;
  const entryId = screenData?.entryId || null;
  const existingClip = screenData?.existingClip || null;
  const isEditMode = !!entryId;

  const track = tracks.find((t) => t.id === trackId);
  const playlist = playlists.find((p) => p.id === playlistId);

  // Raw numerical states for drag performance & precise math
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [clipName, setClipName] = useState('');
  const [playheadPos, setPlayheadPos] = useState(0);

  // Input states for direct typing edits without jumps
  const [startInput, setStartInput] = useState('00:00.00');
  const [endInput, setEndInput] = useState('00:00.00');

  const isStartFocused = useRef(false);
  const isEndFocused = useRef(false);

  const playheadRef = useRef(null);
  const timelineRef = useRef(null);
  const lastPlayheadRef = useRef(0);
  const dragRestartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  const clipDuration = Math.max(0, endSec - startSec);

  // Format seconds to custom MM:SS.mm precise millisecond display
  const formatSecToMSMs = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Format current position (m:ss.cs format like mockup)
  const formatCurrentSec = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Format simple M:SS format for ruler markers
  const formatSecToMinSec = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Safe robust parser for direct time entries (formats supported: MM:SS.mm, SS.mm, or just seconds)
  const parseMSMs = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str.replace(/[^0-9:.]/g, '');
    if (!cleaned) return 0;

    const parts = cleaned.split(':');
    if (parts.length > 1) {
      const mins = parseFloat(parts[0]) || 0;
      const secs = parseFloat(parts[1]) || 0;
      return (mins * 60) + secs;
    } else {
      return parseFloat(parts[0]) || 0;
    }
  };

  // Dynamically calculate timeline tick marker intervals based on song duration
  const getTimelineMarkers = (duration) => {
    if (!duration) return [];
    let step = 30;
    if (duration < 60) {
      step = 10;
    } else if (duration < 300) {
      step = 30;
    } else if (duration < 600) {
      step = 60;
    } else {
      step = 120;
    }

    const markers = [];
    for (let t = 0; t <= duration; t += step) {
      markers.push(t);
    }
    if (duration - markers[markers.length - 1] > step / 2) {
      markers.push(duration);
    }
    return markers;
  };

  // Synchronize track duration when track loads
  useEffect(() => {
    if (track) {
      if (existingClip) {
        setStartSec(existingClip.start);
        setEndSec(existingClip.end);
      } else {
        setStartSec(0);
        setEndSec(track.duration || 0);
      }
      setClipName(existingClip?.name || track.title || '');
    }
  }, [track, existingClip]);

  // Synchronize input text strings when slider moves (unless focused)
  useEffect(() => {
    if (!isStartFocused.current) {
      setStartInput(formatSecToMSMs(startSec));
    }
  }, [startSec]);

  useEffect(() => {
    if (!isEndFocused.current) {
      setEndInput(formatSecToMSMs(endSec));
    }
  }, [endSec]);

  // Generate dense waveform bars matching the exact aesthetic
  useEffect(() => {
    if (track) {
      const bars = [];
      const numBars = 140; // Dense high-fidelity representation
      const seed = track.title.length + parseInt(track.id);
      for (let i = 0; i < numBars; i++) {
        const height = 15 + Math.abs(Math.sin(i * 0.08 + seed) * 55) + (Math.random() * 8);
        bars.push(height);
      }
      setWaveformBars(bars);
    }
  }, [track]);

  // Keep refs synchronized so intervals always access fresh values
  const startSecRef = useRef(startSec);
  const endSecRef = useRef(endSec);
  useEffect(() => { startSecRef.current = startSec; }, [startSec]);
  useEffect(() => { endSecRef.current = endSec; }, [endSec]);

  const playAudio = (offset = 0, s = startSec, e = endSec) => {
    audioSynth.stop();
    if (track?.audioFile && track.audioFile.startsWith('http')) {
      audioSynth.playAudioFile(track.audioFile, offset, s, e);
    } else if (track?.audioFile) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
      const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${track.id}`;
      audioSynth.playFromStream(streamUrl, null, offset, s, e);
    } else if (track) {
      audioSynth.play(track.title, offset, s, e);
    }
    setIsPreviewPlaying(true);
  };

  // Playhead tracking interval — starts stopped, only ticks when isPreviewPlaying
  useEffect(() => {
    if (!track) return;

    // Do NOT auto-play — browser blocks it and causes the "playing but silent" bug
    // User must explicitly press Preview
    setIsPreviewPlaying(false);
    lastPlayheadRef.current = 0;

    playheadRef.current = setInterval(() => {
      if (audioSynth.isPlaying) {
        let currentPos = startSecRef.current;
        if (audioSynth.audioElement && audioSynth.audioElement.src) {
          currentPos = audioSynth.audioElement.currentTime;
        } else if (audioSynth.ctx) {
          const elapsed = audioSynth.ctx.currentTime - audioSynth.trackStartTime;
          const s = startSecRef.current;
          const e = endSecRef.current;
          const clipLen = Math.max(1, e - s);
          currentPos = s + (elapsed % clipLen);
        }
        setPlayheadPos(currentPos);
        lastPlayheadRef.current = currentPos;
      } else {
        setIsPreviewPlaying(false);
      }
    }, 30);

    return () => {
      audioSynth.stop();
      if (playheadRef.current) clearInterval(playheadRef.current);
    };
  }, [track?.id]);

  // Handle document level drag movements
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !timelineRef.current || !track) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const val = pct * track.duration;

      if (isDragging === 'start') {
        if (val < endSec - 0.5) {
          setStartSec(val);
          if (audioSynth.isPlaying) {
            audioSynth.clipStart = val;
            if (audioSynth.audioElement) {
              audioSynth.audioElement.currentTime = val;
            }
            lastPlayheadRef.current = val;
            setPlayheadPos(val);
          }
        }
      } else if (isDragging === 'end') {
        if (val > startSec + 0.5) {
          setEndSec(val);
          if (audioSynth.isPlaying) {
            audioSynth.clipEnd = val;
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging === 'start' && audioSynth.isPlaying) {
        const val = startSec;
        audioSynth.stop();
        playAudio(0, val, endSec);
      }
      if (dragRestartRef.current) {
        clearTimeout(dragRestartRef.current);
        dragRestartRef.current = null;
      }
      setIsDragging(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, startSec, endSec, track]);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      audioSynth.stop();
      if (playheadRef.current) clearInterval(playheadRef.current);
      if (dragRestartRef.current) clearTimeout(dragRestartRef.current);
    };
  }, []);

  // Conditional early returns MUST be declared at the bottom of Hook definitions to comply with React hook rules
  if (!track) {
    return (
      <div className="flex-1 p-6 text-zinc-400 text-left select-none bg-[#080711] min-h-screen">
        <button onClick={() => navigate('playlists')} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Playlists
        </button>
        <p className="font-semibold text-sm">No track selected to trim.</p>
      </div>
    );
  }

  const handleTimelineMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  };

  const handlePreviewToggle = () => {
    if (isPreviewPlaying) {
      audioSynth.stop();
      setIsPreviewPlaying(false);
    } else {
      audioSynth.stop();
      const resumePos = lastPlayheadRef.current;
      const offset = (resumePos > startSec && resumePos < endSec) ? resumePos : 0;
      playAudio(offset);
    }
  };

  // Direct Time Inputs Change Handlers
  const handleStartInputBlur = () => {
    isStartFocused.current = false;
    const val = parseMSMs(startInput);
    if (val >= 0 && val < endSec - 0.5) {
      setStartSec(val);
    } else {
      setStartInput(formatSecToMSMs(startSec));
      toast.warning('Start Time must be at least 0.5s before End Time!');
    }
  };

  const handleEndInputBlur = () => {
    isEndFocused.current = false;
    const val = parseMSMs(endInput);
    if (val > startSec + 0.5 && val <= track.duration) {
      setEndSec(val);
    } else {
      setEndInput(formatSecToMSMs(endSec));
      toast.warning(`End Time must be after Start Time and not exceed track length (${formatSecToMSMs(track.duration)})!`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleSaveClip = async () => {
    if (startSec >= endSec) {
      toast.warning('Start Time must be strictly before End Time!');
      return;
    }
    if (endSec > track.duration) {
      toast.warning(`End Time cannot exceed the track duration!`);
      return;
    }

    const clipData = {
      name: clipName.trim() || `${track.title} Clip`,
      start: startSec,
      end: endSec,
    };

    if (isEditMode && playlistId) {
      try {
        await updateClipInPlaylist(playlistId, entryId, clipData);
        toast.success(`Updated clip "${clipData.name}"!`);
        navigate('playlist-details', playlist);
      } catch (e) {
        toast.error(e.message || 'Failed to update clip.');
      }
    } else if (playlistId) {
      try {
        const clip = await createClip({ trackId: track.id, ...clipData });
        await addSongToPlaylist(playlistId, track.id, clipData, clip.id);
        toast.success(`Created clip and added "${track.title}" to "${playlist.name}"!`);
        navigate('playlist-details', playlist);
      } catch (e) {
        toast.error(e.message || 'Failed to add song to playlist.');
      }
    } else {
      try {
        await createClip({ trackId: track.id, ...clipData });
        toast.success('Created clip in library!');
        navigate('search', { filter: 'clips' });
      } catch (e) {
        toast.error(e.message || 'Failed to create clip.');
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-20 text-left select-none bg-[#080711] min-h-screen text-white font-sans">

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(playlistId ? 'playlist-details' : 'search', playlistId ? playlist : { filter: 'clips' })}
            className="w-8 h-8 rounded-md border border-white/10 bg-[#0D0B1E]/40 hover:bg-[#1A1636] hover:border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg md:text-xl font-semibold text-white tracking-tight">Clip Editor</h2>
        </div>

        <button
          onClick={handleSaveClip}
          className="px-4 py-2 rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white hover:scale-105 active:scale-95 text-xs font-semibold tracking-wide transition-all shadow-md shadow-[#7C3AED]/20 flex items-center gap-1.5"
        >
          {isEditMode ? 'Update Clip' : 'Save Clip'}
        </button>
      </div>

      {/* Song Info & Text Input / Preview Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B091C]/30 border border-white/5 rounded-xl p-4 mb-4 backdrop-blur-md">

        {/* Left Side: Song Info */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 shadow-md shrink-0">
            <img
              src={track.artwork}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-white tracking-tight leading-snug">{track.title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              <span className="text-[#A78BFA] font-medium">{track.artist}</span>
              <span className="mx-1.5 text-zinc-600">•</span>
              <span className="text-zinc-500 font-normal">{track.album || 'Single'}</span>
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-mono">
              <Music className="w-3 h-3 text-zinc-500" />
              <span>{formatSecToMinSec(track.duration)}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Elegant Glassmorphic Clip Name Input & Preview Trigger */}
        <div className="flex items-end gap-3 w-full lg:max-w-md">
          <div className="flex flex-col gap-1 text-left flex-1">
            <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Clip Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Neon Highway Clip"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              className="bg-[#0B091C]/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all placeholder:text-zinc-700 w-full"
            />
          </div>

          <button
            onClick={handlePreviewToggle}
            className={`h-[34px] px-3.5 rounded-lg border text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 active:scale-95 shrink-0 shadow-sm ${isPreviewPlaying
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/25'
                : 'bg-[#0B091C]/60 border-white/10 text-zinc-300 hover:text-white hover:bg-[#1A1636]'
              }`}
          >
            {isPreviewPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                <span>Stop Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-zinc-300 text-zinc-300 translate-x-[0.5px]" />
                <span>Preview Clip</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main Interactive Waveform visualizer parent box */}
      <div
        ref={timelineRef}
        className="relative h-[210px] md:h-[250px] bg-[#080614] border border-white/5 rounded-xl flex flex-col justify-end overflow-visible select-none shadow-inner mb-6"
        style={{ touchAction: 'none' }}
      >

        {/* Dynamic Timeline Markers Ticks & Time numbers */}
        <div className="absolute top-[48px] left-0 right-0 h-5 select-none pointer-events-none">
          {getTimelineMarkers(track.duration).map((timeVal) => {
            const pct = (timeVal / track.duration) * 100;
            return (
              <div
                key={`marker-${timeVal}`}
                className="absolute flex flex-col items-center -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                <span className="text-[9px] text-zinc-500 font-mono font-normal">{formatSecToMinSec(timeVal)}</span>
                <div className="w-[1px] h-1 bg-zinc-700/80 mt-0.5" />
              </div>
            );
          })}
        </div>

        {/* Interactive Waveform Display Box */}
        <div className="absolute top-[75px] bottom-[35px] left-0 right-0 bg-[#0A091A] border-y border-white/5 overflow-hidden flex items-center">

          {/* Base Layer: Inactive/Dimmed Waveform Bars */}
          <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between gap-[2px] opacity-15 pointer-events-none">
            {waveformBars.map((height, idx) => (
              <span
                key={`base-${idx}`}
                className="flex-1 bg-zinc-500 rounded-sm"
                style={{ height: `${height}%` }}
              ></span>
            ))}
          </div>

          {/* Shading Layer for Out-of-bounds start range */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#060410]/70 pointer-events-none border-r border-white/5"
            style={{ width: `${(startSec / track.duration) * 100}%` }}
          />

          {/* Shading Layer for Out-of-bounds end range */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-[#060410]/70 pointer-events-none border-l border-white/5"
            style={{ left: `${(endSec / track.duration) * 100}%` }}
          />

          {/* Active Glowing Waveform layer with clipPath */}
          <div
            className="absolute inset-x-4 inset-y-0 flex items-center justify-between gap-[2px] pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - (endSec / track.duration) * 100}% 0 ${(startSec / track.duration) * 100}%)`
            }}
          >
            {waveformBars.map((height, idx) => (
              <span
                key={`active-${idx}`}
                className="flex-1 bg-[#8B5CF6] rounded-sm shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                style={{ height: `${height}%` }}
              ></span>
            ))}
          </div>

          {/* Active Region Highlight transparent fill overlay */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-b from-[#8B5CF6]/5 to-[#8B5CF6]/0 pointer-events-none"
            style={{
              left: `${(startSec / track.duration) * 100}%`,
              width: `${((endSec - startSec) / track.duration) * 100}%`
            }}
          />

        </div>

        {/* Start Handle Drag Assembly */}
        <div
          className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize z-30 flex items-center justify-center"
          style={{ left: `${(startSec / track.duration) * 100}%` }}
          onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
          onTouchStart={(e) => handleTimelineMouseDown(e, 'start')}
        >
          {/* Top Floating bubble */}
          <div className="absolute top-[6px] flex flex-col items-center select-none pointer-events-none">
            <div className="bg-[#4C1D95] text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold shadow-[0_0_8px_rgba(139,92,246,0.3)]">
              {formatSecToMSMs(startSec)}
            </div>
            <span className="text-[9px] text-[#A78BFA] font-semibold mt-0.5 tracking-wide">Start</span>
          </div>

          {/* Glowing Purple Vertical Line */}
          <div className="absolute top-[75px] bottom-[35px] w-[1.5px] bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.5)] pointer-events-none" />

          {/* Bottom Grip Capsule */}
          <div className="absolute bottom-[22px] w-[14px] h-[22px] bg-[#8B5CF6] rounded-md flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.7)] border border-white/20 pointer-events-none">
            <span className="text-[7px] text-black font-extrabold tracking-[-1px] rotate-90 select-none">|||</span>
          </div>
        </div>

        {/* Playhead (Current Position) Assembly */}
        {isPreviewPlaying && playheadPos >= startSec && playheadPos <= endSec && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-20 flex items-center justify-center"
            style={{ left: `${(playheadPos / track.duration) * 100}%` }}
          >
            {/* Top Floating labels */}
            <div className="absolute top-[4px] flex flex-col items-center select-none">
              <span className="text-white text-[10px] font-mono font-semibold">{formatCurrentSec(playheadPos)}</span>
              <span className="text-[9px] text-zinc-400 font-semibold mt-0.5">Current</span>
            </div>

            {/* Intersection White Dot */}
            <div className="absolute top-[71px] w-2 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.7)] z-30" />

            {/* Glowing White Line */}
            <div className="absolute top-[75px] bottom-[35px] w-[1.2px] bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
          </div>
        )}

        {/* End Handle Drag Assembly */}
        <div
          className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize z-30 flex items-center justify-center"
          style={{ left: `${(endSec / track.duration) * 100}%` }}
          onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
          onTouchStart={(e) => handleTimelineMouseDown(e, 'end')}
        >
          {/* Top Floating bubble */}
          <div className="absolute top-[6px] flex flex-col items-center select-none pointer-events-none">
            <div className="bg-[#4C1D95] text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold shadow-[0_0_8px_rgba(139,92,246,0.3)]">
              {formatSecToMSMs(endSec)}
            </div>
            <span className="text-[9px] text-[#A78BFA] font-semibold mt-0.5 tracking-wide">End</span>
          </div>

          {/* Glowing Purple Vertical Line */}
          <div className="absolute top-[75px] bottom-[35px] w-[1.5px] bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.5)] pointer-events-none" />

          {/* Bottom Grip Capsule */}
          <div className="absolute bottom-[22px] w-[14px] h-[22px] bg-[#8B5CF6] rounded-md flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.7)] border border-white/20 pointer-events-none">
            <span className="text-[7px] text-black font-extrabold tracking-[-1px] rotate-90 select-none">|||</span>
          </div>
        </div>

      </div>

      {/* Premium Footer Stats Card with sleek editable time input fields */}
      <div className="bg-[#0B091C]/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 md:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 shadow-md">

        {/* Column 1: Start Time */}
        <div className="flex flex-col gap-1 items-center md:items-start md:px-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
            <span className="text-[11px] text-zinc-400 font-semibold">Start Time</span>
          </div>
          <input
            type="text"
            value={startInput}
            onFocus={() => { isStartFocused.current = true; }}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={handleStartInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-b border-white/10 hover:border-white/30 hover:bg-white/5 focus:border-[#8B5CF6] focus:bg-white/10 text-white text-lg md:text-xl font-semibold tracking-wide font-mono mt-0.5 outline-none w-[110px] md:w-[120px] text-center md:text-left focus:ring-0 px-1 py-0.5 cursor-text transition-all rounded select-text"
            title="Click to edit Start Time"
          />
        </div>

        {/* Column 2: End Time */}
        <div className="flex flex-col gap-1 items-center md:items-start md:px-4 border-l border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
            <span className="text-[11px] text-zinc-400 font-semibold">End Time</span>
          </div>
          <input
            type="text"
            value={endInput}
            onFocus={() => { isEndFocused.current = true; }}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={handleEndInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-b border-white/10 hover:border-white/30 hover:bg-white/5 focus:border-[#8B5CF6] focus:bg-white/10 text-white text-lg md:text-xl font-semibold tracking-wide font-mono mt-0.5 outline-none w-[110px] md:w-[120px] text-center md:text-left focus:ring-0 px-1 py-0.5 cursor-text transition-all rounded select-text"
            title="Click to edit End Time"
          />
        </div>

        {/* Column 3: Total Duration */}
        <div className="flex flex-col gap-1 items-center md:items-start md:px-4 border-l border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
            <span className="text-[11px] text-zinc-400 font-semibold">Total Duration</span>
          </div>
          <span className="text-lg md:text-xl font-semibold text-[#A78BFA] tracking-wide font-mono mt-0.5 h-[28px] flex items-center">
            {formatSecToMSMs(clipDuration)}
          </span>
        </div>

        {/* Column 4: Song Duration */}
        <div className="flex flex-col gap-1 items-center md:items-start md:px-4 border-l border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
            <span className="text-[11px] text-zinc-400 font-semibold">Song Duration</span>
          </div>
          <span className="text-lg md:text-xl font-semibold text-white tracking-wide font-mono mt-0.5 h-[28px] flex items-center">
            {formatSecToMSMs(track.duration)}
          </span>
        </div>

      </div>

    </div>
  );
};

export default TrimEditor;
