import React from 'react';
import { useApp } from '../context/AppContext';
import { X, LogOut, Mail } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const { authProfile, logout } = useApp();

  if (!isOpen || !authProfile) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 select-none backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-zinc-900/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative p-8 flex flex-col items-center text-center select-none backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Absolute Close Icon */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition duration-200 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Avatar Frame */}
        <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(168,85,247,0.3)] mb-4 flex items-center justify-center bg-zinc-950 shrink-0">
          {authProfile.photoURL ? (
            <img 
              src={authProfile.photoURL} 
              alt={authProfile.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center font-black text-2xl text-zinc-950 bg-gradient-to-tr from-brand-primary to-purple-400"
            >
              {authProfile.name[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info details */}
        <h3 className="text-lg font-black text-white tracking-wide mb-1">
          {authProfile.name}
        </h3>
        
        <p className="text-xs text-zinc-400 font-semibold mb-8 flex items-center gap-1 justify-center">
          <Mail className="w-3.5 h-3.5 text-zinc-500" />
          {authProfile.email}
        </p>

        {/* Action Button: Sign Out */}
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="w-full py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition duration-200 shadow-md hover:shadow-red-500/20 active:scale-[0.98] cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out of Account</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
