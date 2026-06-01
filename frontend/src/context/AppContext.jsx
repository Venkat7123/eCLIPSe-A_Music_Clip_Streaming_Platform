import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebaseConfig';
import audioSynth from '../utils/audioSynth';
import { downloadTrack as dlTrack, removeDownload as dlRemove, getDownloadedTrackIds, getDownloadedTrack, getAllDownloads as dlGetAll, getDownloadSize as dlGetSize, formatBytes as dlFormatBytes, getArtworkUrl as dlArtUrl, getAudioUrl as dlAudioUrl } from '../utils/downloadManager';
import api, { setTokenGetter } from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  joinPlaylistRoom,
  leavePlaylistRoom,
  joinUserRoom,
  onPlaylistTrackAdded,
  onPlaylistTrackRemoved,
  onPlaylistReordered,
  offAll
} from '../services/socket';

const AppContext = createContext();

const BACKEND_URL = 'http://localhost:5000/api';

export const AppProvider = ({ children }) => {
  // Authentication State
  const [simulatedUser, setSimulatedUser] = useState(() => {
    const saved = localStorage.getItem('eclipse_sim_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authProfile, setAuthProfile] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Router States & Refs
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const originalPathRef = useRef(window.location.pathname);
  const initialNavProcessedRef = useRef(false);

  const tracksRef = useRef([]);
  const playlistsRef = useRef([]);
  const authProfileRef = useRef(null);

  // Provide token to API service
  useEffect(() => {
    setTokenGetter(() => authProfile?.token || null);
  }, [authProfile?.token]);

  // Subscribe to Firebase auth if configured
  useEffect(() => {
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setFirebaseUser(user);
          const token = await user.getIdToken();
          
          const profile = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL || null,
            avatarColor: '#a855f7',
            bio: 'Authenticated via Firebase Web Identity.',
            token,
            isSimulated: false,
            uid: user.uid,
            providerId: user.providerData[0]?.providerId || 'password'
          };
          setAuthProfile(profile);

          // Verify token against backend
          await verifyTokenWithBackend(token, profile);
          setIsAuthChecked(true);
        } else {
          setFirebaseUser(null);
          if (!simulatedUser) setAuthProfile(null);
          setIsAuthChecked(true);
        }
      });
      return unsubscribe;
    }
  }, [simulatedUser]);

  // Synchronize simulated user when Firebase is offline
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      if (simulatedUser) {
        setAuthProfile(simulatedUser);
        verifyTokenWithBackend(simulatedUser.token, simulatedUser);
      } else {
        setAuthProfile(null);
      }
      setIsAuthChecked(true);
    }
  }, [simulatedUser]);

  // Call the Express Backend login endpoint + load data
  const verifyTokenWithBackend = async (token, profile) => {
    try {
      // Use fetch directly here because authProfile state hasn't updated yet
      // (React state is async), so the API service token getter won't have the token
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user: profile }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend Verification Status:', data);
      setBackendAvailable(true);

      // Update role from backend
      if (data.user?.role) {
        setRole(data.user.role);
      }

      // Set token getter so subsequent API calls have the token
      setTokenGetter(() => token);

      // Connect Socket.io
      connectSocket();
      if (data.user?.uid) {
        joinUserRoom(data.user.uid);
      }

      // Load tracks, playlists, and clips from backend
      await loadTracksFromBackend();
      await loadPlaylistsFromBackend();
      await loadClipsFromBackend();
      await loadPlaybackFromBackend();
      setIsDataLoaded(true);
    } catch (e) {
      console.warn('Express Backend is currently offline, running client validation fallback.', e);
      setBackendAvailable(false);
      setIsDataLoaded(true);
    }
  };

  // Load tracks from backend API
  const loadTracksFromBackend = async () => {
    try {
      const data = await api.get('/tracks');
      if (data.tracks?.length > 0) {
        const mapped = data.tracks.map((t) => ({
          id: t._id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          genre: t.genre,
          duration: t.duration,
          artwork: t.artwork || '/uploads/artwork/neon_highway.png',
          audioFile: t.audioFile || null,
        }));
        setTracks(mapped);
        console.log(`[API] Loaded ${mapped.length} tracks from backend`);
      }
    } catch (e) {
      console.warn('[API] Failed to load tracks:', e.message);
    }
  };

  // Load playlists from backend API
  const loadPlaylistsFromBackend = async () => {
    try {
      const data = await api.get('/playlists');
      if (data.playlists?.length > 0) {
        const mapped = data.playlists.map((p) => ({
          id: p._id,
          name: p.name,
          description: p.description,
          creator: p.creator,
          artwork: p.artwork || '/uploads/artwork/lofi_sunset.png',
          trackIds: p.tracks
            .sort((a, b) => a.order - b.order)
            .map((t) => (typeof t.trackId === 'object' ? t.trackId._id : t.trackId)),
          entries: p.tracks
            .sort((a, b) => a.order - b.order)
            .map((t, idx) => ({
              entryId: t._id ? String(t._id) : `legacy_${p._id}_${idx}`,
              trackId: typeof t.trackId === 'object' ? String(t.trackId._id) : String(t.trackId),
              clip: t.clip || null,
              clipId: t.clipId ? String(t.clipId) : null,
            })),
          clips: p.tracks
            .filter((t) => t.clip)
            .map((t, idx) => ({
              entryId: t._id ? String(t._id) : `legacy_${p._id}_${idx}`,
              trackId: typeof t.trackId === 'object' ? String(t.trackId._id) : String(t.trackId),
              clipId: t.clipId ? String(t.clipId) : null,
              ...t.clip,
            })),
        }));
        setPlaylists(mapped);
        console.log(`[API] Loaded ${mapped.length} playlists from backend`);
      }
    } catch (e) {
      console.warn('[API] Failed to load playlists:', e.message);
    }
  };

  const loadClipsFromBackend = async () => {
    try {
      const data = await api.get('/clips');
      if (data.clips) {
        const mapped = data.clips.map((c) => ({
          id: c._id,
          trackId: typeof c.trackId === 'object' ? c.trackId._id || String(c.trackId) : String(c.trackId),
          name: c.name,
          start: c.start,
          end: c.end,
          duration: c.duration,
        }));
        setUserClips(mapped);
        console.log(`[API] Loaded ${mapped.length} clips from backend`);
      }
    } catch (e) {
      console.warn('[API] Failed to load clips:', e.message);
    }
  };

  // Load playback state from backend (per-user, cross-device)
  const loadPlaybackFromBackend = async () => {
    try {
      const data = await api.get('/user/playback');
      if (data.playbackState?.currentTrackId) {
        const track = tracks.find((t) => t.id === data.playbackState.currentTrackId);
        if (track) {
          setCurrentTrack(track);
          setCurrentTime(data.playbackState.currentTime || 0);
          setDuration(data.playbackState.duration || track.duration);
        }
        if (data.playbackState.queue) setQueue(data.playbackState.queue);
        if (data.playbackState.queueIndex >= 0) setQueueIndex(data.playbackState.queueIndex);
      }
    } catch (e) {
      console.warn('[API] Failed to load playback state:', e.message);
    }
  };

  // Socket.io: listen for real-time playlist updates
  useEffect(() => {
    const unsubAdded = onPlaylistTrackAdded((data) => {
      console.log('[SOCKET] Track added to playlist:', data);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === data.playlistId) {
            const trackId = data.track?._id || data.trackId;
            if (p.trackIds.includes(trackId)) return p;
            return { ...p, trackIds: [...p.trackIds, trackId] };
          }
          return p;
        })
      );
    });

    const unsubRemoved = onPlaylistTrackRemoved((data) => {
      console.log('[SOCKET] Track removed from playlist:', data);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === data.playlistId) {
            return { ...p, trackIds: p.trackIds.filter((id) => id !== data.trackId) };
          }
          return p;
        })
      );
    });

    const unsubReordered = onPlaylistReordered(() => {
      // No-op: reorder uses optimistic updates, no need to reload
    });

    return () => {
      unsubAdded();
      unsubRemoved();
      unsubReordered();
    };
  }, []);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      offAll();
      disconnectSocket();
    };
  }, []);

  // Auth Methods (Email + Password + Google)
  const loginWithEmail = async (email, password) => {
    if (isFirebaseConfigured() && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.error("Firebase Sign In Error: ", err);
        throw err;
      }
    } else {
      // Simulate
      simulateUserAuth(email.split('@')[0], email, 'password');
    }
  };

  const registerWithEmail = async (name, email, password) => {
    if (isFirebaseConfigured() && auth) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
      } catch (err) {
        console.error("Firebase Sign Up Error: ", err);
        throw err;
      }
    } else {
      // Simulate
      simulateUserAuth(name, email, 'password');
    }
  };

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("Firebase Google Error: ", err);
        throw err;
      }
    } else {
      // Simulate
      simulateUserAuth('Google Explorer', 'explorer@google.com', 'google.com');
    }
  };

  const simulateUserAuth = (name, email, providerId) => {
    const mockUser = {
      name,
      email,
      avatarColor: '#10b981', // Emerald
      bio: 'Developer Simulated Firebase Session.',
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlQ0xJUHNlX0ZpcmViYXNlIiwibmFtZSI6IiR7bmFtZX0iLCJlbWFpbCI6IiR7ZW1haWx9IiwidWlkIjoic2ltX2ZpcmViYXNlX3VpZF80MiJ9...`,
      isSimulated: true,
      uid: `sim_uid_${Date.now().toString().slice(-6)}`,
      providerId
    };
    localStorage.setItem('eclipse_sim_user', JSON.stringify(mockUser));
    setSimulatedUser(mockUser);
  };

  const logout = async () => {
    audioSynth.stop();
    setIsPlaying(false);

    // Disconnect socket
    disconnectSocket();

    // Clear all user-specific state
    setTracks([]);
    setPlaylists([]);
    setLikedSongs([]);
    setRecentlyPlayed([]);
    setUserClips([]);
    setQueue([]);
    setCurrentTrack(null);

    // Clear all user-specific localStorage
    localStorage.removeItem('eclipse_sim_user');
    localStorage.removeItem('eclipse_tracks');
    localStorage.removeItem('eclipse_playlists');
    localStorage.removeItem('eclipse_liked');
    localStorage.removeItem('eclipse_history');
    localStorage.removeItem('eclipse_clips');
    localStorage.removeItem('eclipse_currentTrack');
    localStorage.removeItem('eclipse_currentClip');
    localStorage.removeItem('eclipse_currentTime');
    localStorage.removeItem('eclipse_duration');
    localStorage.removeItem('eclipse_playbackMode');
    localStorage.removeItem('eclipse_queue');
    localStorage.removeItem('eclipse_queueIndex');
    localStorage.removeItem('eclipse_volume');
    localStorage.removeItem('eclipse_repeatMode');
    localStorage.removeItem('eclipse_shuffleMode');
    localStorage.removeItem('eclipse_currentTrack');
    localStorage.removeItem('eclipse_currentClip');
    localStorage.removeItem('eclipse_currentTime');
    localStorage.removeItem('eclipse_duration');
    localStorage.removeItem('eclipse_playbackMode');
    localStorage.removeItem('eclipse_queue');
    localStorage.removeItem('eclipse_queueIndex');
    localStorage.removeItem('eclipse_repeatMode');
    localStorage.removeItem('eclipse_shuffleMode');
    localStorage.removeItem('eclipse_volume');

    setSimulatedUser(null);

    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Firebase Sign Out Error: ", e);
      }
    }
    setAuthProfile(null);
  };

  // Settings modal state synced with routing
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    return window.location.pathname === '/profile';
  });

  // Path Parsing Helper
  const parsePath = (path) => {
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, '');
    if (cleanPath === 'login') {
      return { screen: 'login', data: null };
    }
    if (/^song\/[^\/]+\/trim-editor$/.test(cleanPath)) {
      const id = cleanPath.split('/')[1];
      return { screen: 'trim-editor', data: { trackId: id } };
    }
    if (cleanPath.startsWith('song/')) {
      const id = cleanPath.split('/')[1];
      return { screen: 'now-playing', data: { trackId: id } };
    }
    if (cleanPath.startsWith('playlist/')) {
      const id = cleanPath.split('/')[1];
      return { screen: 'playlist-details', data: { id } };
    }
    if (cleanPath === 'liked-songs') {
      return { screen: 'search', data: { filter: 'liked' } };
    }
    if (cleanPath === 'clips') {
      return { screen: 'search', data: { filter: 'clips' } };
    }
    const validScreens = ['home', 'search', 'playlists', 'playlist-details', 'add-song-choose', 'trim-editor', 'now-playing', 'admin', 'admin-manage-songs', 'admin-add-song', 'admin-users'];
    return { screen: validScreens.includes(cleanPath) ? cleanPath : 'home', data: null };
  };

  // Navigation
  const [activeScreen, setActiveScreen] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (/^song\/[^\/]+\/trim-editor$/.test(path)) return 'trim-editor';
    if (path.startsWith('song/')) return 'now-playing';
    if (path.startsWith('playlist/')) return 'playlist-details';
    if (['liked-songs', 'clips'].includes(path)) return 'search';
    return ['playlists', 'playlist-details', 'add-song-choose', 'trim-editor', 'now-playing', 'admin', 'admin-manage-songs', 'admin-add-song', 'admin-users'].includes(path) ? path : 'home';
  });

  const [screenData, setScreenData] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (/^song\/[^\/]+\/trim-editor$/.test(path)) return { trackId: path.split('/')[1] };
    if (path.startsWith('song/')) return { trackId: path.split('/')[1] };
    if (path.startsWith('playlist/')) return { id: path.split('/')[1] };
    if (path === 'liked-songs') return { filter: 'liked' };
    if (path === 'clips') return { filter: 'clips' };
    return null;
  });


  // Tracks & Playlists — loaded from backend, empty until auth
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  // User details, likes, history & clips
  const [likedSongs, setLikedSongs] = useState(() => {
    const saved = localStorage.getItem('eclipse_liked');
    return saved ? JSON.parse(saved) : [];
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    const saved = localStorage.getItem('eclipse_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [userClips, setUserClips] = useState([]);

  // Playback states — restore from localStorage if available
  const [currentTrack, setCurrentTrack] = useState(() => {
    try { const s = localStorage.getItem('eclipse_currentTrack'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [currentClip, setCurrentClip] = useState(() => {
    try { const s = localStorage.getItem('eclipse_currentClip'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    try { const s = localStorage.getItem('eclipse_currentTime'); return s ? parseInt(s, 10) || 0 : 0; } catch { return 0; }
  });
  const [duration, setDuration] = useState(() => {
    try { const s = localStorage.getItem('eclipse_duration'); return s ? parseInt(s, 10) || 0 : 0; } catch { return 0; }
  });
  const [volume, setVolume] = useState(() => {
    try { const s = localStorage.getItem('eclipse_volume'); return s ? parseFloat(s) || 0.5 : 0.5; } catch { return 0.5; }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackMode, setPlaybackMode] = useState(() => {
    try { return localStorage.getItem('eclipse_playbackMode') || 'normal'; } catch { return 'normal'; }
  });
  const [queue, setQueue] = useState(() => {
    try { const s = localStorage.getItem('eclipse_queue'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [queueIndex, setQueueIndex] = useState(() => {
    try { const s = localStorage.getItem('eclipse_queueIndex'); return s ? parseInt(s, 10) || -1 : -1; } catch { return -1; }
  });
  const [repeatMode, setRepeatMode] = useState(() => {
    try { return localStorage.getItem('eclipse_repeatMode') || 'none'; } catch { return 'none'; }
  });
  const [shuffleMode, setShuffleMode] = useState(() => {
    try { return localStorage.getItem('eclipse_shuffleMode') === 'true'; } catch { return false; }
  });

  // Offline downloads state
  const [downloadedTrackIds, setDownloadedTrackIds] = useState(new Set());
  const [downloadingTrackIds, setDownloadingTrackIds] = useState(new Set());

  // Load downloaded track IDs from IndexedDB on init
  useEffect(() => {
    getDownloadedTrackIds().then(setDownloadedTrackIds).catch(() => {});
  }, []);

  // Download a track for offline playback
  const downloadTrack = async (trackId, playlistMeta = null) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    setDownloadingTrackIds((prev) => new Set([...prev, trackId]));
    try {
      await dlTrack(track, authProfile, playlistMeta);
      setDownloadedTrackIds((prev) => new Set([...prev, trackId]));
    } catch (e) {
      console.error('[DOWNLOAD] Failed:', e.message);
      throw e;
    } finally {
      setDownloadingTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  };

  // Remove a download
  const removeDownload = async (trackId) => {
    try {
      await dlRemove(trackId);
      setDownloadedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    } catch (e) {
      console.error('[DOWNLOAD] Remove failed:', e.message);
    }
  };

  // Save playback state to backend (debounced, per-user cross-device)
  const savePlaybackTimeout = useRef(null);
  const savePlaybackToBackend = useCallback(() => {
    if (savePlaybackTimeout.current) clearTimeout(savePlaybackTimeout.current);
    savePlaybackTimeout.current = setTimeout(async () => {
      if (!currentTrack) return;
      try {
        await api.put('/user/playback', {
          currentTrackId: currentTrack.id,
          currentTime,
          duration,
          queue,
          queueIndex,
        });
      } catch (e) {
        console.warn('[API] Failed to save playback state:', e.message);
      }
    }, 2000);
  }, [currentTrack?.id, currentTime, duration, queue, queueIndex]);

  useEffect(() => { savePlaybackToBackend(); }, [currentTrack?.id, currentTime, queue, queueIndex]);

  // Role simulation & Dark Mode
  const [role, setRole] = useState('USER');
  const [darkMode, setDarkMode] = useState(true);

  // Real users list (fetched from backend by admin)
  const [allUsers, setAllUsers] = useState([]);

  const loadAllUsers = async () => {
    if (!backendAvailable) return;
    try {
      const data = await api.get('/user/all');
      setAllUsers(data.users || []);
    } catch (e) {
      console.warn('[API] Failed to load users:', e.message);
    }
  };

  const toggleUserStatus = async (userId) => {
    console.warn('[ADMIN] toggleUserStatus not implemented for real users');
  };

  const boostUserStreams = async (userId) => {
    console.warn('[ADMIN] boostUserStreams not implemented for real users');
  };

  // Ref to track playback interval
  const timerRef = useRef(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('eclipse_tracks', JSON.stringify(tracks));
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('eclipse_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('eclipse_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('eclipse_history', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  // Persist playback state
  useEffect(() => { localStorage.setItem('eclipse_currentTrack', JSON.stringify(currentTrack)); }, [currentTrack]);
  useEffect(() => { localStorage.setItem('eclipse_currentClip', JSON.stringify(currentClip)); }, [currentClip]);
  useEffect(() => { localStorage.setItem('eclipse_currentTime', String(currentTime)); }, [currentTime]);
  useEffect(() => { localStorage.setItem('eclipse_duration', String(duration)); }, [duration]);
  useEffect(() => { localStorage.setItem('eclipse_playbackMode', playbackMode); }, [playbackMode]);
  useEffect(() => { localStorage.setItem('eclipse_queue', JSON.stringify(queue)); }, [queue]);
  useEffect(() => { localStorage.setItem('eclipse_queueIndex', String(queueIndex)); }, [queueIndex]);
  useEffect(() => { localStorage.setItem('eclipse_repeatMode', repeatMode); }, [repeatMode]);
  useEffect(() => { localStorage.setItem('eclipse_shuffleMode', String(shuffleMode)); }, [shuffleMode]);
  useEffect(() => { localStorage.setItem('eclipse_volume', String(volume)); }, [volume]);

  // Audio Synth synchronizer — checks IndexedDB first for offline playback
  useEffect(() => {
    if (isPlaying && currentTrack) {
      const clipStart = playbackMode === 'clip' && currentClip ? currentClip.start : 0;
      const clipEnd = playbackMode === 'clip' && currentClip ? currentClip.end : null;

      // Check IndexedDB for downloaded copy first
      if (downloadedTrackIds.has(currentTrack.id)) {
        getDownloadedTrack(currentTrack.id).then((record) => {
          if (record?.audioBlob) {
            audioSynth.playFromBlob(record.audioBlob, currentTime, clipStart, clipEnd);
          }
        }).catch(() => {
          // Fallback to normal playback if IndexedDB fails
          if (currentTrack.audioFile && currentTrack.audioFile.startsWith('http')) {
            audioSynth.playAudioFile(currentTrack.audioFile, currentTime, clipStart, clipEnd);
          } else if (currentTrack.audioFile) {
            const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${currentTrack.id}`;
            audioSynth.playFromStream(streamUrl, authProfile?.token, currentTime, clipStart, clipEnd);
          }
        });
        return;
      }

      if (currentTrack.audioFile && currentTrack.audioFile.startsWith('http')) {
        // Cloudinary URL — play directly, no auth needed
        audioSynth.playAudioFile(currentTrack.audioFile, currentTime, clipStart, clipEnd);
      } else if (currentTrack.audioFile) {
        // Local file — go through backend stream endpoint with auth
        const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${currentTrack.id}`;
        audioSynth.playFromStream(streamUrl, authProfile?.token, currentTime, clipStart, clipEnd);
      } else if (playbackMode === 'clip' && currentClip) {
        // Synthesized track with clip
        audioSynth.play(
          currentTrack.title,
          currentTime,
          currentClip.start,
          currentClip.end,
          currentTrack.audioUrl
        );
      } else {
        // Seed track, no clip
        audioSynth.play(currentTrack.title, currentTime, 0, null, currentTrack.audioUrl);
      }
    } else {
      audioSynth.stop();
    }
  }, [isPlaying, currentTrack?.id, playbackMode, currentClip?.id]);

  useEffect(() => {
    audioSynth.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Time tracker loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          let next = prev + 1;
          
          if (playbackMode === 'clip' && currentClip) {
            const clipDuration = currentClip.end - currentClip.start;
            if (next >= clipDuration) {
              if (repeatMode === 'one') {
                audioSynth.play(currentTrack.title, 0, currentClip.start, currentClip.end);
                return 0;
              } else {
                handleNext();
                return 0;
              }
            }
            return next;
          }

          if (next >= duration) {
            if (repeatMode === 'one') {
              audioSynth.play(currentTrack.title, 0);
              return 0;
            } else {
              handleNext();
              return 0;
            }
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, duration, playbackMode, currentClip, repeatMode]);

  // Keep Popstate refs in sync
  useEffect(() => {
    authProfileRef.current = authProfile;
  }, [authProfile]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  // Process initial URL path on mount / auth resolution / data load
  useEffect(() => {
    if (!isAuthChecked) return;
    
    // If not authenticated, ensure URL is /login
    if (!authProfile) {
      if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
      }
      return;
    }

    // Authenticated! Now handle original path redirection once
    if (initialNavProcessedRef.current) return;

    const path = originalPathRef.current.replace(/^\//, '').replace(/\/$/, '');
    
    // If original path was login but we are now logged in, go to home
    if (path === 'login' || path === '') {
      setActiveScreen('home');
      setScreenData(null);
      initialNavProcessedRef.current = true;
      return;
    }

    if (/^song\/[^\/]+\/trim-editor$/.test(path)) {
      const id = path.split('/')[1];
      if (isDataLoaded) {
        const track = tracks.find(t => t.id === id);
        if (track) {
          setActiveScreen('trim-editor');
          setScreenData({ trackId: id });
          initialNavProcessedRef.current = true;
        } else {
          setActiveScreen('home');
          initialNavProcessedRef.current = true;
        }
      }
      return;
    }

    if (path.startsWith('song/')) {
      const id = path.split('/')[1];
      if (isDataLoaded) {
        const track = tracks.find(t => t.id === id);
        if (track) {
          // Restore track but keep paused — browser blocks autoplay on refresh
          setCurrentTrack(track);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(track.duration);
          setActiveScreen('now-playing');
          initialNavProcessedRef.current = true;
        } else {
          setActiveScreen('home');
          initialNavProcessedRef.current = true;
        }
      }
      return;
    }

    if (path.startsWith('playlist/')) {
      const id = path.split('/')[1];
      if (isDataLoaded) {
        const playlist = playlists.find(p => p.id === id);
        if (playlist) {
          setActiveScreen('playlist-details');
          setScreenData({ id });
          initialNavProcessedRef.current = true;
        } else {
          setActiveScreen('home');
          initialNavProcessedRef.current = true;
        }
      }
      return;
    }

    // Other valid screens
    const parsed = parsePath(originalPathRef.current);
    setActiveScreen(parsed.screen);
    setScreenData(parsed.data);
    initialNavProcessedRef.current = true;

  }, [isAuthChecked, authProfile, isDataLoaded, tracks, playlists]);

  // Sync state to URL path
  useEffect(() => {
    if (!isAuthChecked) return;

    let targetPath = activeScreen;
    if (!authProfile) {
      targetPath = 'login';
    } else if (isSettingsOpen) {
      targetPath = 'profile';
    } else if (activeScreen === 'trim-editor' && screenData?.trackId) {
      targetPath = `song/${screenData.trackId}/trim-editor`;
    } else if (activeScreen === 'now-playing' && currentTrack?.id) {
      targetPath = `song/${currentTrack.id}`;
    } else if (activeScreen === 'playlist-details' && (screenData?.id || screenData?._id)) {
      targetPath = `playlist/${screenData.id || screenData._id}`;
    } else if (activeScreen === 'search' && screenData?.filter === 'liked') {
      targetPath = 'liked-songs';
    } else if (activeScreen === 'search' && screenData?.filter === 'clips') {
      targetPath = 'clips';
    }

    const currentPath = window.location.pathname.replace(/^\//, '');
    if (currentPath !== targetPath) {
      window.history.pushState(null, '', `/${targetPath}`);
    }
  }, [activeScreen, screenData, isSettingsOpen, currentTrack, authProfile, isAuthChecked]);

  // Sync URL path back to state on Popstate (browser forward/back)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
      
      if (!authProfileRef.current) {
        // If not logged in, force /login
        setActiveScreen('home');
        setScreenData(null);
        setIsSettingsOpen(false);
        return;
      }

      if (path === 'login') {
        // If logged in but user goes back to login, redirect to home
        setActiveScreen('home');
        setScreenData(null);
        setIsSettingsOpen(false);
        return;
      }

      if (/^song\/[^\/]+\/trim-editor$/.test(path)) {
        const id = path.split('/')[1];
        const track = tracksRef.current.find(t => t.id === id);
        if (track) {
          setActiveScreen('trim-editor');
          setScreenData({ trackId: id });
          setIsSettingsOpen(false);
        } else {
          setActiveScreen('home');
          setScreenData(null);
          setIsSettingsOpen(false);
        }
      } else if (path.startsWith('song/')) {
        const id = path.split('/')[1];
        const track = tracksRef.current.find(t => t.id === id);
        if (track) {
          // Restore track but keep paused — browser blocks autoplay on popstate
          setCurrentTrack(track);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(track.duration);
          setActiveScreen('now-playing');
          setScreenData(null);
          setIsSettingsOpen(false);
        } else {
          setActiveScreen('home');
          setScreenData(null);
          setIsSettingsOpen(false);
        }
      } else if (path.startsWith('playlist/')) {
        const id = path.split('/')[1];
        const playlist = playlistsRef.current.find(p => p.id === id);
        if (playlist) {
          setActiveScreen('playlist-details');
          setScreenData({ id });
          setIsSettingsOpen(false);
        } else {
          setActiveScreen('home');
          setScreenData(null);
          setIsSettingsOpen(false);
        }
      } else if (path === 'liked-songs') {
        setActiveScreen('search');
        setScreenData({ filter: 'liked' });
        setIsSettingsOpen(false);
      } else if (path === 'clips') {
        setActiveScreen('search');
        setScreenData({ filter: 'clips' });
        setIsSettingsOpen(false);
      } else if (path === 'profile') {
        setActiveScreen('home');
        setScreenData(null);
        setIsSettingsOpen(true);
      } else {
        const validScreens = ['home', 'search', 'playlists', 'playlist-details', 'add-song-choose', 'trim-editor', 'now-playing', 'admin', 'admin-manage-songs', 'admin-add-song', 'admin-users'];
        setActiveScreen(validScreens.includes(path) ? path : 'home');
        setScreenData(null);
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation Helper
  const navigate = (screen, data = null) => {
    setActiveScreen(screen);
    setScreenData(data);
  };

  // Playback Control Methods
  const playTrack = (track, isClip = false, clipObj = null, fromQueue = false) => {
    if (!track) return;

    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((id) => id !== track.id);
      return [track.id, ...filtered].slice(0, 15);
    });

    setCurrentTrack(track);
    setPlaybackMode(isClip ? 'clip' : 'normal');
    setCurrentClip(clipObj);

    const activeDuration = isClip && clipObj ? (clipObj.end - clipObj.start) : track.duration;
    setDuration(activeDuration);
    setCurrentTime(0);
    setIsPlaying(true);

    // Clear queue when playing a standalone track (not from queue/playlist)
    if (!fromQueue) {
      setQueue([]);
      setQueueIndex(-1);
    }
  };

  const togglePlay = () => {
    audioSynth.init();
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const nextIdx = queueIndex + 1;
    if (queue.length > 0 && nextIdx < queue.length) {
      const next = queue[nextIdx];
      setQueueIndex(nextIdx);
      const nextTrack = tracks.find((t) => t.id === next.trackId);
      if (nextTrack) {
        playTrack(nextTrack, !!next.clip, next.clip, true);
      } else {
        // Fallback: check IndexedDB for downloaded tracks (e.g., offline)
        getDownloadedTrack(next.trackId).then(record => {
          if (record) {
            const offlineTrack = {
              id: record.id,
              title: record.title,
              artist: record.artist,
              album: record.album,
              duration: record.duration,
              artwork: record.artworkUrl,
              audioFile: record.audioFile || null,
            };
            playTrack(offlineTrack, !!next.clip, next.clip, true);
          }
        });
      }
    } else if (repeatMode === 'all' || shuffleMode) {
      if (shuffleMode && tracks.length > 0) {
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        playTrack(randomTrack, false, null, true);
      } else if (repeatMode === 'all' && tracks.length > 0) {
        playTrack(tracks[0], false, null, true);
      }
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      audioSynth.stop();
    }
  };

  const handlePrev = () => {
    if (currentTime > 4) {
      setCurrentTime(0);
      if (isPlaying) {
        if (currentTrack?.audioFile && currentTrack.audioFile.startsWith('http')) {
          audioSynth.playAudioFile(currentTrack.audioFile, 0, playbackMode === 'clip' && currentClip ? currentClip.start : 0, playbackMode === 'clip' && currentClip ? currentClip.end : null);
        } else if (currentTrack?.audioFile) {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
          const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${currentTrack.id}`;
          audioSynth.playFromStream(streamUrl, null, 0, playbackMode === 'clip' && currentClip ? currentClip.start : 0, playbackMode === 'clip' && currentClip ? currentClip.end : null);
        } else if (currentTrack) {
          audioSynth.play(currentTrack.title, 0, playbackMode === 'clip' && currentClip ? currentClip.start : 0, playbackMode === 'clip' && currentClip ? currentClip.end : null);
        }
      }
    } else if (queue.length > 0 && queueIndex > 0) {
      // Navigate to previous item in queue
      const prevIdx = queueIndex - 1;
      const prev = queue[prevIdx];
      setQueueIndex(prevIdx);
      const prevTrack = tracks.find((t) => t.id === prev.trackId);
      if (prevTrack) {
        playTrack(prevTrack, !!prev.clip, prev.clip, true);
      } else {
        getDownloadedTrack(prev.trackId).then(record => {
          if (record) {
            const offlineTrack = {
              id: record.id,
              title: record.title,
              artist: record.artist,
              album: record.album,
              duration: record.duration,
              artwork: record.artworkUrl,
              audioFile: record.audioFile || null,
            };
            playTrack(offlineTrack, !!prev.clip, prev.clip, true);
          }
        });
      }
    } else {
      // No queue, restart current track
      setCurrentTime(0);
      if (isPlaying && currentTrack) {
        if (currentTrack?.audioFile && currentTrack.audioFile.startsWith('http')) {
          audioSynth.playAudioFile(currentTrack.audioFile, 0, playbackMode === 'clip' && currentClip ? currentClip.start : 0, playbackMode === 'clip' && currentClip ? currentClip.end : null);
        }
      }
    }
  };

  const playPlaylist = (entries, startIndex = 0, shuffle = false) => {
    if (!entries || entries.length === 0) return;

    let ordered = [...entries];
    if (startIndex > 0 && startIndex < ordered.length) {
      const selected = ordered.splice(startIndex, 1)[0];
      ordered.unshift(selected);
    }
    if (shuffle && ordered.length > 1) {
      const first = ordered[0];
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      }
      const firstIdx = ordered.indexOf(first);
      if (firstIdx > 0) {
        ordered.splice(firstIdx, 1);
        ordered.unshift(first);
      }
    }

    const first = ordered[0];
    const track = tracks.find(t => t.id === first.trackId);
    if (track) {
      playTrack(track, !!first.clip, first.clip, true);
    }

    setQueue(ordered.map(e => ({ trackId: e.trackId, clip: e.clip || null })));
    setQueueIndex(0);
  };

  const playDownloads = async (downloads, startIndex = 0) => {
    if (!downloads || downloads.length === 0) return;

    const selected = downloads[startIndex];
    const track = {
      id: selected.id,
      title: selected.title,
      artist: selected.artist,
      album: selected.album,
      duration: selected.duration,
      artwork: selected.artworkUrl,
      audioFile: selected.audioFile || null,
    };

    playTrack(track, false, null, true);

    const queueEntries = downloads.map(d => ({ trackId: d.id, clip: null }));
    setQueue(queueEntries);
    setQueueIndex(startIndex);
  };

  const playLibraryTracks = (filteredTracks, startIndex = 0) => {
    if (!filteredTracks || filteredTracks.length === 0) return;

    const entries = filteredTracks.map(t => ({
      trackId: t.isClip ? t.clipObj.trackId : t.id,
      clip: t.isClip ? { name: t.clipObj.name, start: t.clipObj.start, end: t.clipObj.end } : null,
    }));

    playPlaylist(entries, startIndex);
  };

  const seek = (newTime) => {
    const cleanTime = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(cleanTime);
    if (isPlaying) {
      if (currentTrack?.audioFile && currentTrack.audioFile.startsWith('http')) {
        audioSynth.playAudioFile(
          currentTrack.audioFile,
          cleanTime,
          playbackMode === 'clip' && currentClip ? currentClip.start : 0,
          playbackMode === 'clip' && currentClip ? currentClip.end : null
        );
      } else if (currentTrack?.audioFile) {
        const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${currentTrack.id}`;
        audioSynth.playFromStream(
          streamUrl,
          authProfile?.token,
          cleanTime,
          playbackMode === 'clip' && currentClip ? currentClip.start : 0,
          playbackMode === 'clip' && currentClip ? currentClip.end : null
        );
      } else if (playbackMode === 'clip' && currentClip) {
        audioSynth.play(currentTrack.title, cleanTime, currentClip.start, currentClip.end, currentTrack.audioUrl);
      } else {
        audioSynth.play(currentTrack.title, cleanTime, 0, null, currentTrack.audioUrl);
      }
    }
  };

  const addToQueue = (trackId, clip = null) => {
    setQueue((prev) => [...prev, { trackId, clip }]);
  };

  const playNext = (trackId, clip = null) => {
    setQueue((prev) => {
      const insertAt = queueIndex >= 0 ? queueIndex + 1 : 0;
      const next = [...prev];
      next.splice(insertAt, 0, { trackId, clip });
      return next;
    });
  };

  const removeFromQueue = (index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    } else if (index === queueIndex) {
      setQueueIndex((prev) => prev); // keep same, next handleNext will advance
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(-1);
  };

  const moveQueueItem = (fromIndex, toIndex) => {
    setQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    // Adjust queueIndex to follow the playing item
    if (queueIndex >= 0) {
      if (fromIndex === queueIndex) {
        setQueueIndex(toIndex);
      } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
        setQueueIndex((prev) => prev - 1);
      } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
        setQueueIndex((prev) => prev + 1);
      }
    }
  };

  const toggleLikeSong = (trackId) => {
    setLikedSongs((prev) => {
      if (prev.includes(trackId)) {
        return prev.filter((id) => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  // Playlists management
  const createPlaylist = async (name, description = '', initialTrackId = null, clip = null) => {
    try {
      const body = { name, description };
      if (initialTrackId) {
        body.initialTrackId = initialTrackId;
        if (clip) body.clip = clip;
      }
      const data = await api.post('/playlists', body);
      const firstTrack = initialTrackId ? tracks.find((t) => t.id === initialTrackId) : null;
      const mapped = {
        id: data.playlist._id,
        name: data.playlist.name,
        description: data.playlist.description,
        creator: data.playlist.creator,
        artwork: data.playlist.artwork || firstTrack?.artwork || '/uploads/artwork/lofi_sunset.png',
        trackIds: data.playlist.tracks.map((t) => (typeof t.trackId === 'object' ? t.trackId._id : t.trackId)),
      };
      setPlaylists((prev) => [...prev, mapped]);
      setBackendAvailable(true);
      return mapped;
    } catch (e) {
      console.error('[API] createPlaylist failed:', e.status, e.message);
      setBackendAvailable(false);
      throw e;
    }
  };

  const deletePlaylist = async (playlistId) => {
    try {
      await api.delete(`/playlists/${playlistId}`);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (activeScreen === 'playlist-details' && screenData?.id === playlistId) {
        navigate('playlists');
      }
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] deletePlaylist failed:', e.status, e.message);
    }
  };

  const updatePlaylistArtwork = async (playlistId, artworkUrl) => {
    try {
      const data = await api.put(`/playlists/${playlistId}`, { artwork: artworkUrl });
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, artwork: artworkUrl } : p))
      );
      setBackendAvailable(true);
      return data.playlist;
    } catch (e) {
      console.error('[API] updatePlaylistArtwork failed:', e.status, e.message);
      throw e;
    }
  };

  const reorderPlaylistEntries = async (playlistId, entryIds) => {
    // Optimistic update — reorder locally first
    let previousEntries = null;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        previousEntries = p.entries;
        const entryMap = new Map((p.entries || []).map((e) => [e.entryId, e]));
        const reordered = entryIds.map((eid) => entryMap.get(eid)).filter(Boolean);
        return {
          ...p,
          entries: reordered,
          trackIds: reordered.map((e) => e.trackId),
          clips: reordered.filter((e) => e.clip),
        };
      })
    );

    // Then sync to backend
    try {
      await api.patch(`/playlists/${playlistId}/reorder`, { entryIds });
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] reorderPlaylistEntries failed:', e.status, e.message);
      // Revert on failure
      if (previousEntries) {
        setPlaylists((prev) =>
          prev.map((p) => {
            if (p.id !== playlistId) return p;
            return {
              ...p,
              entries: previousEntries,
              trackIds: previousEntries.map((e) => e.trackId),
              clips: previousEntries.filter((e) => e.clip),
            };
          })
        );
      }
    }
  };

  const addSongToPlaylist = async (playlistId, trackId, clip = null, clipId = null) => {
    try {
      const body = { trackId };
      if (clip) body.clip = clip;
      if (clipId) body.clipId = clipId;
      const data = await api.post(`/playlists/${playlistId}/tracks`, body);

      // Get the newly added entry from the backend response
      const backendPlaylist = data.playlist;
      const lastEntry = backendPlaylist.tracks[backendPlaylist.tracks.length - 1];
      const entryId = String(lastEntry?._id) || `tmp_${Date.now()}`;

      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            let updatedArt = p.artwork;
            if ((p.trackIds || []).length === 0) {
              const trackObj = tracks.find((t) => t.id === trackId);
              if (trackObj) updatedArt = trackObj.artwork;
            }
            const newEntry = { entryId, trackId, clip: clip || null, clipId: clipId || null };
            const updated = {
              ...p,
              trackIds: [...(p.trackIds || []), trackId],
              entries: [...(p.entries || []), newEntry],
              artwork: updatedArt,
            };
            if (clip) {
              updated.clips = [...(p.clips || []), { entryId, trackId, ...clip }];
            }
            return updated;
          }
          return p;
        })
      );
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] addSongToPlaylist failed:', e.status, e.message);
      throw e;
    }
  };

  const removeSongFromPlaylist = async (playlistId, trackId, entryId = null) => {
    try {
      const eid = entryId ? String(entryId) : null;
      const url = eid
        ? `/playlists/${playlistId}/tracks/${trackId}?entryId=${eid}`
        : `/playlists/${playlistId}/tracks/${trackId}`;
      await api.delete(url);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            const updatedEntries = (p.entries || []).filter(
              (e) => String(e.entryId) !== eid
            );
            return {
              ...p,
              trackIds: updatedEntries.map((e) => e.trackId),
              entries: updatedEntries,
              clips: (p.clips || []).filter(
                (c) => String(c.entryId) !== eid
              ),
            };
          }
          return p;
        })
      );
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] removeSongFromPlaylist failed:', e.status, e.message);
      throw e;
    }
  };

  const updateClipInPlaylist = async (playlistId, entryId, clip) => {
    try {
      const eid = String(entryId);
      const data = await api.patch(`/playlists/${playlistId}/tracks/${eid}/clip`, clip);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            const updatedEntries = (p.entries || []).map((e) =>
              String(e.entryId) === eid ? { ...e, clip } : e
            );
            const updatedClips = (p.clips || []).map((c) =>
              String(c.entryId) === eid ? { ...c, ...clip } : c
            );
            // If clip wasn't in clips array before, add it
            const hasClip = updatedClips.some((c) => String(c.entryId) === eid);
            if (!hasClip) {
              const entry = updatedEntries.find((e) => String(e.entryId) === eid);
              if (entry) {
                updatedClips.push({ entryId: eid, trackId: entry.trackId, ...clip });
              }
            }
            return { ...p, entries: updatedEntries, clips: updatedClips };
          }
          return p;
        })
      );
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] updateClipInPlaylist failed:', e.status, e.message);
      throw e;
    }
  };

  // Library/Admin Actions
  const addSongToLibrary = async (songData) => {
    if (songData instanceof FormData) {
      const data = await api.upload('/tracks', songData);
      const mapped = {
        id: data.track._id,
        title: data.track.title,
        artist: data.track.artist,
        album: data.track.album,
        duration: data.track.duration,
        artwork: data.track.artwork || '/uploads/artwork/neon_highway.png',
        audioFile: data.track.audioFile || null,
      };
      setTracks((prev) => [...prev, mapped]);
      setBackendAvailable(true);
      return mapped;
    }

    throw new Error('Audio file is required. Please select a file to upload.');
  };

  const deleteSongFromLibrary = async (songId) => {
    try {
      await api.delete(`/tracks/${songId}`);
      setTracks((prev) => prev.filter((t) => t.id !== songId));
      setPlaylists((prev) =>
        prev.map((p) => ({ ...p, trackIds: p.trackIds.filter((id) => id !== songId) }))
      );
      setQueue((prev) => prev.filter((id) => id !== songId));
      setLikedSongs((prev) => prev.filter((id) => id !== songId));
      setBackendAvailable(true);
    } catch (e) {
      console.error('[API] deleteTrack failed:', e.status, e.message);
    }
  };

  const createClip = async (clipData) => {
    try {
      const data = await api.post('/clips', {
        trackId: clipData.trackId,
        name: clipData.name || 'My Clip',
        start: parseFloat(clipData.start),
        end: parseFloat(clipData.end),
      });
      const newClip = {
        id: data.clip._id,
        trackId: typeof data.clip.trackId === 'object' ? data.clip.trackId._id : data.clip.trackId,
        name: data.clip.name,
        start: data.clip.start,
        end: data.clip.end,
        duration: data.clip.duration,
      };
      setUserClips((prev) => [...prev, newClip]);
      return newClip;
    } catch (e) {
      console.error('[API] createClip failed:', e.status, e.message);
      throw e;
    }
  };

  const deleteClip = async (clipId) => {
    try {
      await api.delete(`/clips/${clipId}`);
      setUserClips((prev) => prev.filter((c) => c.id !== clipId));
    } catch (e) {
      console.error('[API] deleteClip failed:', e.status, e.message);
      throw e;
    }
  };

  const updateAuthProfile = async (updated) => {
    setAuthProfile((prev) => {
      const next = { ...prev, ...updated };
      if (prev.isSimulated) {
        localStorage.setItem('eclipse_sim_user', JSON.stringify(next));
        setSimulatedUser(next);
      }
      return next;
    });

    // Sync with backend
    if (backendAvailable) {
      try {
        await api.put('/user/profile', updated);
      } catch (e) {
        console.warn('[API] updateProfile failed:', e.message);
      }
    }
  };

  // Toggle role via backend (dev only)
  const toggleRole = async (newRole) => {
    setRole(newRole);
    if (backendAvailable && authProfile) {
      try {
        await api.patch('/user/role', { role: newRole });
      } catch (e) {
        console.warn('[API] toggleRole failed:', e.message);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        // Authentication Context (Firebase)
        authProfile,
        isFirebaseConfigured: isFirebaseConfigured(),
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateAuthProfile,

        // Nav
        activeScreen,
        screenData,
        navigate,
        isSettingsOpen,
        setIsSettingsOpen,
        
        // Data lists
        tracks,
        playlists,
        likedSongs,
        recentlyPlayed,
        userClips,
        
        // Playback State
        currentTrack,
        currentClip,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackMode,
        queue,
        queueIndex,
        repeatMode,
        shuffleMode,
        
        // State updates
        setCurrentTime,
        setVolume,
        setIsMuted,
        setRepeatMode,
        setShuffleMode,
        
        // Methods
        playTrack,
        togglePlay,
        handleNext,
        handlePrev,
        seek,
        playPlaylist,
        playDownloads,
        playLibraryTracks,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        moveQueueItem,
        toggleLikeSong,
        createPlaylist,
        deletePlaylist,
        updatePlaylistArtwork,
        downloadedTrackIds,
        downloadingTrackIds,
        downloadTrack,
        removeDownload,
        reorderPlaylistEntries,
        addSongToPlaylist,
        removeSongFromPlaylist,
        updateClipInPlaylist,
        addSongToLibrary,
        deleteSongFromLibrary,
        createClip,
        deleteClip,
        
        // Config Toggles
        role,
        setRole,
        toggleRole,
        darkMode,
        setDarkMode,
        backendAvailable,
        isOnline,

        // Users Context (from backend)
        allUsers,
        loadAllUsers,
        toggleUserStatus,
        boostUserStreams
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
