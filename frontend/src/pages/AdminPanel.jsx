import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManageSongs from './admin/ManageSongs';
import AddNewSong from './admin/AddNewSong';
import ManageUsers from './admin/ManageUsers';
import { Music, Plus, Users, ShieldAlert } from 'lucide-react';

const AdminPanel = () => {
  const toast = useToast();
  const {
    role,
    tracks,
    playlists,
    addSongToLibrary,
    deleteSongFromLibrary,
    allUsers,
    loadAllUsers,
    toggleUserStatus,
    boostUserStreams
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('Songs'); // 'Songs', 'AddSong', 'Users'
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  if (role !== 'ADMIN') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#0c0d12] text-[#a0aec0] font-outfit h-full">
        <div className="relative mb-6">
          <ShieldAlert className="w-16 h-16 text-brand-primary" />
          <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full"></div>
        </div>
        <h3 className="text-xl font-semibold text-white uppercase tracking-wider font-outfit">Access Restricted</h3>
        <p className="text-zinc-500 text-xs mt-2 max-w-sm leading-relaxed font-medium font-outfit">
          The Admin Control Console is only available for <span className="text-brand-primary font-semibold">Admin users</span>. Your role is assigned by the server.
        </p>
      </div>
    );
  }

  const renderActiveSubView = () => {
    switch (activeSubTab) {
      case 'Songs':
        return (
          <ManageSongs 
            tracks={tracks}
            playlists={playlists}
            onAddSongClick={() => setActiveSubTab('AddSong')}
            onSongDelete={deleteSongFromLibrary}
            onSongEdit={() => setActiveSubTab('AddSong')}
          />
        );
      case 'AddSong':
        return (
          <AddNewSong
            tracks={tracks}
            onBackClick={() => setActiveSubTab('Songs')}
            onSongAdded={async (songData) => {
              try {
                const result = await addSongToLibrary(songData);
                setSuccessMsg(`"${result.title}" uploaded successfully!`);
                setActiveSubTab('Songs');
              } catch (e) {
                toast.error(e.message || 'Upload failed. Is the backend running?');
                throw e;
              }
            }}
          />
        );
      case 'Users':
        return (
          <ManageUsers
            users={allUsers}
            loadUsers={loadAllUsers}
            onToggleStatus={toggleUserStatus}
            onBoostStreams={boostUserStreams}
          />
        );
      default:
        return (
          <ManageSongs 
            tracks={tracks}
            playlists={playlists}
            onAddSongClick={() => setActiveSubTab('AddSong')}
            onSongDelete={deleteSongFromLibrary}
            onSongEdit={() => setActiveSubTab('AddSong')}
          />
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b10] text-[#a0aec0] font-sans h-full relative">
      
      {/* Success Toast Notification */}
      {successMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-xl text-emerald-300 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-outfit text-xs font-semibold max-w-lg">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="ml-2 text-emerald-400/60 hover:text-emerald-300 transition cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Scrollable sub-view wrapper */}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 pb-32">
        {renderActiveSubView()}
      </div>

      {/* GORGEOUS BOTTOM SIMULATOR TAB SWITCHER FOR MOBILE */}
      <div className="absolute bottom-2 left-4 right-4 bg-[#131520]/95 backdrop-blur-xl border border-white/5 p-1.5 rounded-2xl flex items-center justify-around shadow-2xl z-30 select-none font-outfit">
        <button
          onClick={() => setActiveSubTab('Songs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-2xs font-semibold uppercase tracking-wider transition duration-200 cursor-pointer ${
            activeSubTab === 'Songs'
               ? 'bg-brand-primary text-black font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Catalogue</span>
        </button>

        <button
          onClick={() => setActiveSubTab('AddSong')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-2xs font-semibold uppercase tracking-wider transition duration-200 cursor-pointer ${
            activeSubTab === 'AddSong'
               ? 'bg-brand-primary text-black font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Song</span>
        </button>

        <button
          onClick={() => setActiveSubTab('Users')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-2xs font-semibold uppercase tracking-wider transition duration-200 cursor-pointer ${
            activeSubTab === 'Users'
               ? 'bg-brand-primary text-black font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Registry</span>
        </button>
      </div>

    </div>
  );
};

export default AdminPanel;
