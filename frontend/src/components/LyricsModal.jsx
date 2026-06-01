import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Music } from 'lucide-react';

const TRACK_LYRICS = {
  '1': [
    { time: 0, text: '🎵 [Lo-Fi Sunset - Dusty Lofi Beats] 🎵' },
    { time: 4, text: 'Watching the warm sun go down...' },
    { time: 10, text: 'Soft pink skies above this sleepy town...' },
    { time: 16, text: 'Chill guitar loops in my ears...' },
    { time: 22, text: 'Sipping tea, washing away the years...' },
    { time: 28, text: 'Feel the vinyl crackle on the plate...' },
    { time: 34, text: 'Relax your mind, it is never too late...' },
    { time: 40, text: 'Let the ambient dust settle low...' },
    { time: 46, text: 'Lofi sunset, sweet and slow...' }
  ],
  '2': [
    { time: 0, text: '⚡ [Neon Highway - Heavy Synthwave Grid] ⚡' },
    { time: 5, text: 'Driving down the neon highway...' },
    { time: 12, text: 'Purple wireframes lighting up the grid...' },
    { time: 18, text: 'Synthesizers take me higher...' },
    { time: 25, text: 'Doing things we never did...' },
    { time: 31, text: 'In the shadows of the cyber city...' },
    { time: 38, text: 'Engine revving at a steady pace...' },
    { time: 45, text: 'Cruising through the retro future...' },
    { time: 52, text: 'Time and space in this neon race...' }
  ],
  '3': [
    { time: 0, text: '🌌 [Deep Focus - Ambient Focus Space] 🌌' },
    { time: 5, text: '🎹 (Beautiful electronic pads fade in) 🎹' },
    { time: 15, text: '🧘 [Ambient Instrumental - Relax and Focus] 🧘' },
    { time: 30, text: 'Concentrate on your breathing...' },
    { time: 45, text: 'Let thoughts drift like stellar clouds...' }
  ],
  '4': [
    { time: 0, text: '🍃 [Acoustic Breeze - Cozy Guitar Strums] 🍃' },
    { time: 4, text: 'Acoustic breeze through the pine tree...' },
    { time: 10, text: 'Nylon strings feel so wild and free...' },
    { time: 16, text: 'Sunlight breaks through the green grass...' },
    { time: 22, text: 'Happy hours that will slowly pass...' }
  ],
  '5': [
    { time: 0, text: '🔊 [Techno Pulse - 128 BPM Acid Bass] 🔊' },
    { time: 4, text: '💥 (Acid synthesizer starts modulating) 💥' },
    { time: 8, text: 'Feel the heavy techno pulse!' },
    { time: 15, text: 'Lose yourself inside the bass...' },
    { time: 22, text: 'Four-on-the-floor kick keeps slamming!' },
    { time: 29, text: 'Moving together in this dark space...' }
  ],
  '6': [
    { time: 0, text: '🌊 [Ocean Whispers - Calm Surf Sounds] 🌊' },
    { time: 5, text: 'Listen to the ocean whispers...' },
    { time: 12, text: 'Soothing waves kissing the shore...' },
    { time: 20, text: 'Release the heavy load you carry...' },
    { time: 28, text: 'Rest your soul, wander no more...' }
  ]
};

const LyricsModal = ({ isOpen, onClose }) => {
  const { currentTrack, currentTime } = useApp();
  const activeLyricRef = useRef(null);

  const lyrics = currentTrack ? (TRACK_LYRICS[currentTrack.id] || [
    { time: 0, text: `🎵 [Instrumental Track] - Playing "${currentTrack.title}" 🎵` },
    { time: 10, text: 'Sit back, close your eyes, and enjoy the synthesized vibration.' }
  ]) : [];

  // Find the index of active lyric
  let activeIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth scroll to highlighted lyric
  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 select-none backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col h-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-brand-primary animate-bounce" />
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Karaoke Neon Lyrics</h3>
              <p className="text-[11px] text-zinc-400">{currentTrack?.title} • {currentTrack?.artist}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Lyric lines */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 text-center">
          <div className="h-20 shrink-0"></div> {/* Spacer at top */}
          
          {lyrics.map((lyric, index) => {
            const isActive = index === activeIndex;
            const isPassed = index < activeIndex;
            
            return (
              <p
                key={index}
                ref={isActive ? activeLyricRef : null}
                className={`text-base md:text-lg font-bold transition-all duration-300 leading-relaxed ${
                  isActive 
                    ? 'text-brand-primary scale-110 active-glow opacity-100 font-extrabold translate-y-[-2px]' 
                    : isPassed 
                      ? 'text-zinc-500 opacity-60 font-medium' 
                      : 'text-zinc-300 opacity-80 font-medium'
                }`}
              >
                {lyric.text}
              </p>
            );
          })}

          <div className="h-20 shrink-0"></div> {/* Spacer at bottom */}
        </div>
      </div>
    </div>
  );
};

export default LyricsModal;
