import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Bell,
  Music,
  Upload,
  FileImage,
  FileAudio,
  X,
  Pause,
  Play,
  Clock,
  RotateCcw,
  Link,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const Youtube = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const AddNewSong = ({
  tracks,
  onBackClick,
  onSongAdded,
  onSongUpdate,
  onYouTubeExtract,
  editingTrack,
}) => {
  const toast = useToast();
  // Form state
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [durationStr, setDurationStr] = useState('00:00');
  const [durationSecs, setDurationSecs] = useState(210);
  const [artworkUrl, setArtworkUrl] = useState('');

  // Local File Upload states
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState('');
  const [artworkFileName, setArtworkFileName] = useState('');
  const [selectedAudioUrl, setSelectedAudioUrl] = useState('');
  const [isDurationCalculated, setIsDurationCalculated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [serverAudioUrl, setServerAudioUrl] = useState('');
  const [serverArtworkUrl, setServerArtworkUrl] = useState('');

  // Form initialization for Edit Mode
  useEffect(() => {
    if (editingTrack) {
      setTitle(editingTrack.title || '');
      setArtist(editingTrack.artist || '');
      setAlbum(editingTrack.album || '');
      setDurationSecs(editingTrack.duration || 0);
      const mins = Math.floor((editingTrack.duration || 0) / 60);
      const secs = (editingTrack.duration || 0) % 60;
      setDurationStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setIsDurationCalculated(true);
      setArtworkUrl(editingTrack.artwork || '');
      setSelectedAudioUrl(editingTrack.audioFile || '');
    } else {
      handleFormReset();
    }
  }, [editingTrack]);

  // YouTube extraction states
  const [ytUrl, setYtUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState('');

  // Audio Preview Progress synchronization
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef(null);

  // Interactive Waveform Drag-to-Seek reference and state
  const [isDragging, setIsDragging] = useState(false);
  const waveformRef = useRef(null);

  // Input refs
  const audioInputRef = useRef(null);
  const artworkInputRef = useRef(null);

  // Handle click or drag interaction on the preview waveform to seek
  const handleWaveformInteraction = (clientX) => {
    if (!selectedAudioUrl || !durationSecs || !waveformRef.current) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    const targetTime = percentage * durationSecs;
    
    setPreviewCurrentTime(targetTime);
    
    // Instantiate audio element if it doesn't exist
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(selectedAudioUrl);
      previewAudioRef.current.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      });
    }
    
    previewAudioRef.current.currentTime = targetTime;
  };

  const handleWaveformMouseDown = (e) => {
    if (!selectedAudioUrl) return;
    setIsDragging(true);
    handleWaveformInteraction(e.clientX);
  };

  const handleWaveformTouchStart = (e) => {
    if (!selectedAudioUrl || !e.touches || !e.touches[0]) return;
    setIsDragging(true);
    handleWaveformInteraction(e.touches[0].clientX);
  };

  // Manage global mouse and touch events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return;
      handleWaveformInteraction(e.clientX);
    };

    const handleGlobalTouchMove = (e) => {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      handleWaveformInteraction(e.touches[0].clientX);
    };

    const handleGlobalDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalDragEnd);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalDragEnd);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalDragEnd);
    };
  }, [isDragging, durationSecs, selectedAudioUrl]);

  // Synchronize playing time of preview audio
  useEffect(() => {
    let timer;
    if (isPreviewPlaying && previewAudioRef.current) {
      timer = setInterval(() => {
        if (previewAudioRef.current) {
          setPreviewCurrentTime(previewAudioRef.current.currentTime);
        }
      }, 100);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPreviewPlaying]);

  // Clean preview on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  // Audio File Selection & Duration Extractor
  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAudioFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setAudioFileSize(`${sizeInMB} MB`);
    
    // Create temporary blob URL
    const fileUrl = URL.createObjectURL(file);
    setSelectedAudioUrl(fileUrl);

    // Pre-fill Title with file name (without extension) if title is currently empty
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    if (!title) {
      setTitle(baseName);
    }

    // Load in-memory Audio metadata to retrieve duration
    const audio = new Audio(fileUrl);
    audio.addEventListener('loadedmetadata', () => {
      const durationSeconds = Math.floor(audio.duration);
      setDurationSecs(durationSeconds);
      
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      setDurationStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setIsDurationCalculated(true);
    });

    // Reset preview audio element
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
    }
  };

  // Image Artwork Selection
  const handleArtworkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArtworkFileName(file.name);
    const imgUrl = URL.createObjectURL(file);
    setArtworkUrl(imgUrl);
  };

  // YouTube URL extraction handler
  const handleYouTubeExtract = async () => {
    const url = ytUrl.trim();
    if (!url) {
      setYtError('Please enter a YouTube URL');
      return;
    }

    setYtLoading(true);
    setYtError('');

    try {
      const result = await onYouTubeExtract(url);
      setYtUrl('');
      
      setTitle(result.title);
      setArtist(result.artist);
      if (result.album) setAlbum(result.album);
      setDurationSecs(result.duration);
      const mins = Math.floor(result.duration / 60);
      const secs = result.duration % 60;
      setDurationStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setIsDurationCalculated(true);
      
      const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '').replace(/\/api$/, '');
      const fullAudioUrl = result.audioUrl.startsWith('http') ? result.audioUrl : `${baseApiUrl}${result.audioUrl}`;
      const fullArtworkUrl = result.artworkUrl.startsWith('http') ? result.artworkUrl : `${baseApiUrl}${result.artworkUrl}`;
      
      setSelectedAudioUrl(fullAudioUrl);
      setArtworkUrl(fullArtworkUrl);
      setServerAudioUrl(result.audioUrl);
      setServerArtworkUrl(result.artworkUrl);
      setAudioFileName(`YouTube: ${result.title}`);
      
      toast.success(`Extracted "${result.title}"! Review and click Add Song.`);
    } catch (err) {
      setYtError(err.message || 'Failed to extract from YouTube');
    } finally {
      setYtLoading(false);
    }
  };

  // Submit Handler
  const handleAddSongSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      toast.warning('Title and Artist are required fields!');
      return;
    }

    const audioFile = audioInputRef.current?.files?.[0];
    if (!editingTrack && !audioFile && !serverAudioUrl) {
      toast.warning('Please select an audio file to upload or extract from YouTube.');
      return;
    }

    const artworkFile = artworkInputRef.current?.files?.[0];

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('artist', artist.trim());
    formData.append('album', album.trim() || 'Single');
    formData.append('duration', durationSecs);
    
    if (audioFile) {
      formData.append('audio', audioFile);
    } else if (serverAudioUrl) {
      formData.append('serverAudioUrl', serverAudioUrl);
    }
    
    if (artworkFile) {
      formData.append('artwork', artworkFile);
    } else if (serverArtworkUrl) {
      formData.append('serverArtworkUrl', serverArtworkUrl);
    }

    setIsUploading(true);
    try {
      if (editingTrack && onSongUpdate) {
        await onSongUpdate(editingTrack.id, formData);
        toast.success(`"${title}" updated successfully!`);
        onBackClick();
      } else {
        await onSongAdded(formData);
        handleFormReset();
      }
    } catch (err) {
      // Error already handled by AppContext/AdminPanel
    } finally {
      setIsUploading(false);
    }
  };

  // Form Reset
  const handleFormReset = () => {
    setTitle('');
    setArtist('');
    setAlbum('');
    setDurationStr('00:00');
    setDurationSecs(210);
    setArtworkUrl('');
    setAudioFileName('');
    setArtworkFileName('');
    setSelectedAudioUrl('');
    setIsDurationCalculated(false);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setServerAudioUrl('');
    setServerArtworkUrl('');
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    // Clear the actual file input elements so re-uploading same file works
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (artworkInputRef.current) artworkInputRef.current.value = '';
  };

  // Toggle play/pause preview audio
  const togglePreviewPlay = () => {
    if (!selectedAudioUrl) return;
    
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(selectedAudioUrl);
      previewAudioRef.current.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      });
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().catch(err => console.warn(err));
      setIsPreviewPlaying(true);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.15s_ease-out] text-[#a0aec0] font-outfit">
      
      {/* Header section with back navigation */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 font-outfit">
        <div className="flex items-center gap-3.5 font-outfit">
          <button
            onClick={onBackClick}
            className="p-2.5 rounded-full bg-[#131520] hover:bg-white/5 border border-white/5 text-white transition cursor-pointer active:scale-90"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left font-outfit">
          <h1 className="text-2xl font-semibold text-white leading-tight font-outfit">
            {editingTrack ? 'Edit Song' : 'Add New Song'}
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1.5">
            {editingTrack ? 'Update metadata and artwork for this track' : 'Upload an audio file or extract from a YouTube link'}
          </p>
        </div>
        </div>

        <div className="flex items-center gap-3 font-outfit">
          <button
            onClick={onBackClick}
            className="bg-brand-primary hover:bg-purple-400 text-black text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer font-outfit"
          >
            <Music className="w-4 h-4 text-black shrink-0" />
            <span>View Songs</span>
          </button>
        </div>
      </div>

      {/* YouTube URL Extraction */}
      {!editingTrack && (
        <div className="bg-[#131520] border border-white/5 rounded-3xl p-8 flex flex-col gap-5 text-left font-outfit shadow-sm">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 font-outfit">
          <Youtube className="w-4 h-4 text-red-500" />
          Import from YouTube
        </h3>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={ytUrl}
              onChange={(e) => { setYtUrl(e.target.value); setYtError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleYouTubeExtract()}
              placeholder="https://www.youtube.com/watch?v=... or music.youtube.com"
              className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-xs outline-none focus:border-brand-primary transition duration-200 font-outfit font-medium"
            />
          </div>
          <button
            type="button"
            onClick={handleYouTubeExtract}
            disabled={ytLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 cursor-pointer font-outfit"
          >
            {ytLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4" />
                Extract
              </>
            )}
          </button>
        </div>

        {ytError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{ytError}</p>
          </div>
        )}
      </div>
      )}

      {/* Split layout cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start text-left">
        
        {/* Left Column Card: "Song Details" */}
        <div className="bg-[#131520] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 text-left font-outfit shadow-sm">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-white/5 pb-2.5 font-outfit">
            Song Details
          </h3>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400 font-outfit">
            <label className="font-outfit font-medium text-zinc-400">Song Title <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Midnight Drive"
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#0b0c10] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-primary transition duration-200 font-outfit font-medium"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400 font-outfit">
            <label className="font-outfit font-medium text-zinc-400">Artist / Author <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Night Runner"
              value={artist} 
              onChange={(e) => setArtist(e.target.value)}
              className="bg-[#0b0c10] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-primary transition duration-200 font-outfit font-medium"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400 font-outfit">
            <label className="font-outfit font-medium text-zinc-400">Album <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. City Lights"
              value={album} 
              onChange={(e) => setAlbum(e.target.value)}
              className="bg-[#0b0c10] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-primary transition duration-200 font-outfit font-medium"
              required
            />
          </div>
          {/* Cover Image Upload box */}
          <div className="flex flex-col gap-1.5 text-xs font-medium text-[#a0aec0] font-outfit">
            <label className="font-outfit font-medium text-zinc-400">Cover Image <span className="text-red-400">*</span></label>
            
            <input 
              type="file" 
              ref={artworkInputRef} 
              onChange={handleArtworkFileChange} 
              accept="image/*"
              className="hidden"
            />

            <div className="flex gap-5 items-center font-outfit">
              <div className="w-28 h-28 rounded-2xl bg-[#0b0c10] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                {artworkUrl ? (
                  <img src={artworkUrl} alt="Artwork" className="w-full h-full object-cover animate-[fadeIn_0.2s_ease-out]" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-[10px] text-zinc-500 font-medium bg-[#0b0c10] font-outfit">
                    <FileImage className="w-6 h-6 text-zinc-600 mb-1" />
                    <span>No Cover</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2 font-outfit">
                <div 
                  onClick={() => artworkInputRef.current?.click()}
                  className="border border-dashed border-white/10 hover:border-brand-primary rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-[#0b0c10]/40 font-outfit"
                >
                  <Upload className="w-5 h-5 text-zinc-500 mb-1" />
                  <span className="text-white text-[10px] font-semibold font-outfit">Click to upload</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 font-outfit">JPG, PNG (Max 5MB)</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => artworkInputRef.current?.click()}
                  className="w-full py-2.5 bg-[#1b1e2a] hover:bg-[#252a3b] text-brand-primary border border-brand-primary/10 hover:border-brand-primary/30 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition cursor-pointer font-outfit"
                >
                  Replace Image
                </button>
              </div>
            </div>
            <span className="text-[9px] text-zinc-500 font-medium block mt-1 font-outfit">Recommended size: 1000x1000px</span>
          </div>

        </div>

        {/* Right Column Card: "Audio Upload" */}
        <div className="flex flex-col gap-8 font-outfit">


          {/* 1. File Upload Dropzone card */}
          {!editingTrack && (
          <div className="bg-[#131520] border border-white/5 rounded-3xl p-8 flex flex-col gap-5 text-left font-outfit shadow-sm">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-outfit">
              Audio Upload
            </h3>

            <input 
              type="file" 
              ref={audioInputRef} 
              onChange={handleAudioFileChange} 
              accept="audio/*"
              className="hidden"
            />

            <div className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400 font-outfit">
              <label className="font-outfit font-medium text-zinc-400">Upload Audio File <span className="text-red-400">*</span></label>
              
              {audioFileName ? (
                /* Active selected audio file info display panel */
                <div className="p-4 bg-[#1b1e2b]/80 border border-brand-primary/20 rounded-2xl flex items-center justify-between gap-3 animate-[fadeIn_0.2s_ease-out] font-outfit">
                  <div className="flex items-center gap-3 min-w-0 font-outfit">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="text-left min-w-0 font-outfit">
                      <span className="text-white text-xs font-semibold truncate block leading-tight max-w-[180px] font-outfit">{audioFileName}</span>
                      <span className="text-[9px] text-zinc-500 font-medium block mt-1 font-space">{audioFileSize}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFileName('');
                      setAudioFileSize('');
                      setSelectedAudioUrl('');
                      setIsDurationCalculated(false);
                      setIsPreviewPlaying(false);
                      setPreviewCurrentTime(0);
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        previewAudioRef.current = null;
                      }
                    }}
                    className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Blank dropzone selector frame */
                <div 
                  onClick={() => audioInputRef.current?.click()}
                  className="border border-dashed border-white/10 hover:border-brand-primary rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-[#0b0c10]/40 min-h-[140px] font-outfit"
                >
                  <Upload className="w-7 h-7 text-zinc-500 mb-2" />
                  <span className="text-white text-xs font-semibold font-outfit">Click to upload or drag and drop</span>
                  <span className="text-[9px] text-zinc-500 mt-1 font-outfit">MP3, WAV, FLAC, M4A (Max 50MB)</span>
                </div>
              )}
            </div>
          </div>
          )}

          {/* 2. Audio Preview Card */}
          <div className="bg-[#131520] border border-white/5 rounded-3xl p-8 flex flex-col gap-5 text-left font-outfit shadow-sm">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-outfit">
              Audio Preview
            </h3>

            {/* Audio wave control panel */}
            <div className="flex items-center gap-4 bg-[#0b0c10]/60 border border-white/5 p-4 rounded-2xl font-outfit">
              <button
                type="button"
                onClick={togglePreviewPlay}
                disabled={!selectedAudioUrl}
                className={`w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center text-black hover:scale-105 active:scale-95 transition shrink-0 ${
                  selectedAudioUrl ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
                title={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPreviewPlaying ? (
                  <Pause className="w-4.5 h-4.5 text-black fill-black" />
                ) : (
                  <Play className="w-4.5 h-4.5 text-black fill-black" />
                )}
              </button>

              {/* Waveform progress bar tracker (Click & Drag to seek!) */}
              <div className="flex-1 flex flex-col gap-1 min-w-0 font-outfit">
                <div 
                  ref={waveformRef}
                  onMouseDown={handleWaveformMouseDown}
                  onTouchStart={handleWaveformTouchStart}
                  className={`flex items-end gap-0.5 h-10 w-full select-none justify-start px-1 overflow-hidden relative transition-opacity duration-200 ${
                    selectedAudioUrl 
                      ? 'cursor-ew-resize hover:opacity-90 active:opacity-95' 
                      : 'cursor-not-allowed opacity-45'
                  }`}
                >
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const height = Math.abs(Math.sin(idx * 0.15)) * 32 + 6;
                    
                    // Wave progress active bar math
                    const progressPercent = durationSecs > 0 ? (previewCurrentTime / durationSecs) : 0;
                    const isActive = selectedAudioUrl && (idx / 48) <= progressPercent;
                    
                    return (
                      <span 
                        key={idx} 
                        className={`w-1 rounded-full transition-all duration-100 ${
                          isActive ? 'bg-brand-primary shadow-[0_0_10px_rgba(168,85,247,0.45)]' : 'bg-zinc-700/60'
                        }`}
                        style={{ height: `${height}px` }}
                      ></span>
                    );
                  })}
                </div>
                
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-0.5 select-none font-medium font-space">
                  <span className="font-space">{formatDuration(previewCurrentTime)}</span>
                  <span className="font-space">{durationStr}</span>
                </div>
              </div>
            </div>

            {/* Auto calculated duration stopwatch panel */}
            <div className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400 font-outfit">
              <label className="font-outfit font-medium text-zinc-400">Duration (Auto Calculated)</label>
              <div className="flex items-center gap-3 bg-[#0b0c10]/50 border border-white/5 rounded-2xl p-4 font-outfit">
                <Clock className="w-5 h-5 text-brand-primary" />
                <span className="font-mono text-base font-semibold text-white font-space">{durationStr}</span>
              </div>
            </div>

          </div>

          {/* Card Action triggers footer */}
          <div className="grid grid-cols-2 gap-6 font-outfit">
            <button
              type="button"
              onClick={handleFormReset}
              className="py-3.5 rounded-2xl bg-[#131520] hover:bg-white/5 border border-white/5 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer font-outfit"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleAddSongSubmit}
              disabled={isUploading}
              className={`py-3.5 rounded-2xl bg-brand-primary hover:bg-[#a855f7]/95 text-black font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-brand-primary/15 font-outfit ${
                isUploading ? 'opacity-70 cursor-wait' : 'cursor-pointer'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 shrink-0" />
                  <span>{editingTrack ? 'Save Changes' : 'Add Song'}</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AddNewSong;
