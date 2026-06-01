import React from 'react';
import { useApp } from '../context/AppContext';
import { WifiOff, Download, ArrowRight } from 'lucide-react';

const OfflineView = ({ pageName = 'this page' }) => {
  const { navigate } = useApp();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none min-h-[70vh] animate-fadeIn font-outfit">
      {/* Outer pulsing neon glow ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-brand-primary/20 blur-xl animate-pulse" />
        <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <WifiOff className="w-10 h-10 text-brand-primary animate-none" />
          {/* Miniature absolute download icon on the shoulder */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-primary text-black flex items-center justify-center border-4 border-zinc-950 shadow-lg">
            <Download className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white tracking-tight font-outfit mb-3">
        You're currently offline
      </h2>
      
      <p className="text-zinc-400 text-sm max-w-md mb-8 leading-relaxed font-outfit px-4">
        To view {pageName}, you need an active internet connection. However, your offline library is fully loaded and ready to play!
      </p>

      <button
        onClick={() => navigate('downloads')}
        className="group relative px-6 py-3 rounded-full bg-gradient-to-r from-brand-primary to-purple-600 hover:from-brand-primary-hover hover:to-purple-700 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2.5 transition duration-300 shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.5)] active:scale-95 cursor-pointer"
      >
        <span>Explore Downloads</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default OfflineView;
