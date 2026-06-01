import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Search,
  Music,
  Play,
  Heart,
  Scissors,
  ShieldCheck,
  UserCheck,
  LogOut,
  Plus,
  Users,
  Download
} from 'lucide-react';

const Sidebar = ({ onOpenSettings }) => {
  const {
    activeScreen,
    screenData,
    navigate,
    role,
    likedSongs,
    userClips,
    authProfile,
    logout,
    downloadedTrackIds
  } = useApp();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'playlists', label: 'Playlists', icon: Music },
    { id: 'now-playing', label: 'Now Playing', icon: Play },
  ];

  return (
    <aside className="w-64 bg-zinc-950/70 backdrop-blur-xl border-r border-white/5 hidden md:flex flex-col h-full overflow-y-auto text-sm shrink-0 select-none">
      
      {/* Brand Logo Header */}
      <div className="p-6 pb-4 flex items-center justify-start cursor-pointer" onClick={() => navigate('home')}>
        <img src="/logo1.png" alt="eCLIPSe Logo" className="h-25 w-auto object-contain" />
      </div>

      {/* Primary Navigation */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2 px-2">Navigation</h3>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              (item.id === 'search' && activeScreen === 'search' && !screenData?.filter) ||
              (item.id === 'home' && activeScreen === 'home') ||
              (item.id === 'playlists' && (activeScreen === 'playlists' || activeScreen === 'playlist-details')) ||
              (item.id === 'now-playing' && activeScreen === 'now-playing');
              
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Your Library Section */}
      <div className="px-4 py-2 mt-2">
        <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2 px-2">Your Library</h3>
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => navigate('search', { filter: 'liked' })}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left ${
              activeScreen === 'search' && screenData?.filter === 'liked'
                ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className={`w-4 h-4 ${activeScreen === 'search' && screenData?.filter === 'liked' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Liked Songs</span>
            </div>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-medium">
              {likedSongs.length}
            </span>
          </button>
          
          <button
            onClick={() => navigate('search', { filter: 'clips' })}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left ${
              activeScreen === 'search' && screenData?.filter === 'clips'
                ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Scissors className={`w-4 h-4 ${activeScreen === 'search' && screenData?.filter === 'clips' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Your Clips</span>
            </div>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-medium">
              {userClips.length}
            </span>
          </button>

          <button
            onClick={() => navigate('downloads')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left ${
              activeScreen === 'downloads'
                ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Download className={`w-4 h-4 ${activeScreen === 'downloads' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Downloads</span>
            </div>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-medium">
              {downloadedTrackIds.size}
            </span>
          </button>

        </nav>
      </div>

      {/* Admin Portal Section (Desktop only, displayed only for Admins) */}
      {role === 'ADMIN' && (
        <div className="px-4 py-2 mt-2 select-none animate-[fadeIn_0.2s_ease-out]">
          <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2 px-2">Admin Portal</h3>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => navigate('admin-manage-songs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left cursor-pointer ${
                activeScreen === 'admin-manage-songs'
                  ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Music className={`w-4 h-4 ${activeScreen === 'admin-manage-songs' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Manage Songs</span>
            </button>
            
            <button
              onClick={() => navigate('admin-add-song')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left cursor-pointer ${
                activeScreen === 'admin-add-song'
                  ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className={`w-4 h-4 ${activeScreen === 'admin-add-song' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Add New Song</span>
            </button>

            <button
              onClick={() => navigate('admin-users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-left cursor-pointer ${
                activeScreen === 'admin-users'
                  ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-2.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className={`w-4 h-4 ${activeScreen === 'admin-users' ? 'text-brand-primary' : 'text-zinc-400'}`} />
              <span>Manage Users</span>
            </button>
          </nav>
        </div>
      )}

      {/* Account Profile Display */}
      {authProfile && (
        <div 
          className="mx-3 my-3 p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 shrink-0 relative"
        >
          {authProfile.photoURL ? (
            <img 
              src={authProfile.photoURL} 
              alt={authProfile.name} 
              className="w-9 h-9 rounded-full object-cover border border-white/5 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-black text-xs shrink-0 border border-white/5 shadow-md bg-gradient-to-tr from-brand-primary to-purple-400"
            >
              {authProfile.name[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex flex-col min-w-0 text-left">
            <span className="font-semibold text-white truncate text-xs">
              {authProfile.name}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono truncate max-w-[110px]">
              {authProfile.email}
            </span>
            <span className="text-[8px] font-bold text-brand-primary flex items-center gap-1 mt-0.5">
              {role === 'ADMIN' ? (
                <>
                  <ShieldCheck className="w-2.5 h-2.5 text-red-400" /> Admin
                </>
              ) : (
                <>
                  <UserCheck className="w-2.5 h-2.5 text-emerald-400" /> Curator
                </>
              )}
            </span>
          </div>

          <button 
            onClick={logout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white ml-auto transition duration-200 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </aside>
  );
};

export default Sidebar;
