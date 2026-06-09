import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Home from './pages/Home';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import PlaylistDetails from './pages/PlaylistDetails';
import AddSongChoose from './pages/AddSongChoose';
import TrimEditor from './pages/TrimEditor';
import NowPlaying from './pages/NowPlaying';
import Downloads from './pages/Downloads';
import AdminPanel from './pages/AdminPanel';
import ManageSongs from './pages/admin/ManageSongs';
import AddNewSong from './pages/admin/AddNewSong';
import ManageUsers from './pages/admin/ManageUsers';
import Login from './pages/Login';
import SettingsModal from './components/SettingsModal';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Music as MusicIcon,
  FolderHeart,
  Play,
  Pause,
  SkipForward,
  ShieldCheck,
  Download,
  CheckCircle2,
  ShieldOff
} from 'lucide-react';

function AccessDenied() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
      <ShieldOff className="w-16 h-16 text-red-500/60" />
      <h1 className="text-2xl font-bold text-white">Access Denied</h1>
      <p className="text-zinc-400 text-sm max-w-xs">You don't have permission to view this page. Admin access is required.</p>
    </div>
  );
}

function App() {
  const {
    authProfile,
    isAuthChecked,
    loginWithEntraSimulated,
    activeScreen,
    screenData,
    navigate,
    darkMode,
    isSettingsOpen,
    setIsSettingsOpen,
    currentTrack,
    isPlaying,
    togglePlay,
    handleNext,
    currentTime,
    duration,
    
    // Core Admin contexts
    tracks,
    playlists,
    allUsers,
    loadAllUsers,
    addSongToLibrary,
    updateSongInLibrary,
    addSongFromYouTube,
    extractSongFromYouTube,
    deleteSongFromLibrary,
    toggleUserStatus,
    boostUserStreams,
    role,
    downloadTrack,
    downloadedTrackIds
  } = useApp();

  const [adminEditingTrack, setAdminEditingTrack] = useState(null);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'playlists':
        return <Playlists />;
      case 'playlist-details':
        return <PlaylistDetails />;
      case 'add-song-choose':
        return <AddSongChoose />;
      case 'trim-editor':
        return <TrimEditor />;
      case 'downloads':
        return <Downloads />;
      case 'now-playing':
        return <NowPlaying />;
      case 'downloads':
        return <Downloads />;
      case 'admin':
        if (role !== 'ADMIN') return <AccessDenied />;
        return <AdminPanel />;
      case 'admin-manage-songs':
        if (role !== 'ADMIN') return <AccessDenied />;
        return (
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 pb-24">
            <ManageSongs
              tracks={tracks}
              playlists={playlists}
              onAddSongClick={() => { setAdminEditingTrack(null); navigate('admin-add-song'); }}
              onSongDelete={deleteSongFromLibrary}
              onSongEdit={(track) => { setAdminEditingTrack(track); navigate('admin-add-song'); }}
            />
          </div>
        );
      case 'admin-add-song':
        if (role !== 'ADMIN') return <AccessDenied />;
        return (
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 pb-24">
            <AddNewSong
              tracks={tracks}
              editingTrack={adminEditingTrack}
              onBackClick={() => navigate('admin-manage-songs')}
              onSongAdded={addSongToLibrary}
              onSongUpdate={updateSongInLibrary}
              onYouTubeExtract={extractSongFromYouTube}
            />
          </div>
        );
      case 'admin-users':
        if (role !== 'ADMIN') return <AccessDenied />;
        return (
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 pb-24">
            <ManageUsers
              users={allUsers}
              loadUsers={loadAllUsers}
              onToggleStatus={toggleUserStatus}
              onBoostStreams={boostUserStreams}
            />
          </div>
        );
      default:
        return <Home />;
    }
  };

  // Authentication Guard — show loading until auth state is determined
  if (!isAuthChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm font-outfit">Loading...</span>
        </div>
      </div>
    );
  }

  if (!authProfile) {
    return <Login onSimulateLogin={loginWithEntraSimulated} />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-bg-base text-zinc-100 ${darkMode ? 'dark' : ''
      }`}>

      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5 relative z-20 shrink-0 select-none">
        <div className="flex items-center" onClick={() => navigate('home')}>
          <img src="/logo1.png" alt="eCLIPSe Logo" className="h-16 w-auto object-contain cursor-pointer" />
        </div>
        {authProfile && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-xs shrink-0 border border-white/5 hover:scale-105 active:scale-95 transition shadow-inner"
            style={{ backgroundColor: authProfile.avatarColor }}
          >
            {authProfile.name[0].toUpperCase()}
          </button>
        )}
      </header>

      {/* Top Section: Sidebar + Active Screen */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-zinc-950/20">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Mobile Mini-Player (Floating just above bottom navbar, hidden when full now playing screen is active) */}
      {currentTrack && activeScreen !== 'now-playing' && (
        <div
          onClick={() => navigate('now-playing')}
          className="md:hidden mx-3 mb-2 p-2 bg-[#121214]/90 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] cursor-pointer active:scale-[0.99] transition relative z-20 select-none overflow-hidden"
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
              style={{ width: `${(currentTime / duration) * 100}%` }}
            ></div>
          </div>

          {/* Simple controls */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={async () => {
                if (downloadedTrackIds.has(currentTrack.id)) return;
                try { await downloadTrack(currentTrack.id); } catch {}
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                downloadedTrackIds.has(currentTrack.id) 
                  ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
              }`}
              title={downloadedTrackIds.has(currentTrack.id) ? 'Downloaded' : 'Download'}
            >
              {downloadedTrackIds.has(currentTrack.id) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Player (Desktop only) */}
      <div className="hidden md:block shrink-0">
        <Player />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`md:hidden grid ${role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'} items-center justify-around py-2.5 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/5 relative z-20 shrink-0 select-none`}>
        <button
          onClick={() => navigate('home')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeScreen === 'home' ? 'text-brand-primary font-bold shadow-[0_-2px_10px_rgba(168,85,247,0.1)]' : 'text-zinc-500 hover:text-zinc-400'
            }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Home</span>
        </button>

        <button
          onClick={() => navigate('search')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeScreen === 'search' && !screenData?.filter ? 'text-brand-primary font-bold shadow-[0_-2px_10px_rgba(168,85,247,0.1)]' : 'text-zinc-500 hover:text-zinc-400'
            }`}
        >
          <SearchIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Search</span>
        </button>

        <button
          onClick={() => navigate('playlists')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeScreen === 'playlists' || activeScreen === 'playlist-details' ? 'text-brand-primary font-bold shadow-[0_-2px_10px_rgba(168,85,247,0.1)]' : 'text-zinc-500 hover:text-zinc-400'
            }`}
        >
          <MusicIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Playlists</span>
        </button>

        <button
          onClick={() => navigate('search', { filter: 'liked' })}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeScreen === 'search' && (screenData?.filter === 'liked' || screenData?.filter === 'clips') ? 'text-brand-primary font-bold shadow-[0_-2px_10px_rgba(168,85,247,0.1)]' : 'text-zinc-500 hover:text-zinc-400'
            }`}
        >
          <FolderHeart className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Libraries</span>
        </button>

        {role === 'ADMIN' && (
          <button
            onClick={() => navigate('admin')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              ['admin', 'admin-manage-songs', 'admin-add-song', 'admin-users'].includes(activeScreen) 
                ? 'text-brand-primary font-bold shadow-[0_-2px_10px_rgba(168,85,247,0.1)]' 
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider uppercase">Admin</span>
          </button>
        )}
      </nav>

      {/* Interactive Account & Settings Portal Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
