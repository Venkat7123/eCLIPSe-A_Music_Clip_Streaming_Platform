import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const { authProfile, logout, changePassword } = useApp();
  
  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !authProfile) return null;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMsg('Password cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await changePassword(newPassword);
      setSuccessMsg('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const isPasswordProvider = authProfile.providerId === 'password';

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 select-none backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-sm bg-zinc-900/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative p-6 flex flex-col items-center text-center select-none backdrop-blur-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Absolute Close Icon */}
        <button 
          onClick={handleClose}
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
              {authProfile.name ? authProfile.name[0].toUpperCase() : 'U'}
            </div>
          )}
        </div>

        {/* User Info details */}
        <h3 className="text-lg font-black text-white tracking-wide mb-1">
          {authProfile.name}
        </h3>
        
        <p className="text-xs text-zinc-400 font-semibold mb-6 flex items-center gap-1 justify-center">
          <Mail className="w-3.5 h-3.5 text-zinc-500" />
          {authProfile.email}
        </p>

        {/* Change Password Form (only for standard email/pass users) */}
        {isPasswordProvider && (
          <div className="w-full border-t border-white/5 pt-4 mb-6">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-left mb-3">
              Change Password
            </h4>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold p-3 rounded-xl mb-3 flex items-start gap-2 text-left animate-[slideDown_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold p-3 rounded-xl mb-3 flex items-start gap-2 text-left animate-[slideDown_0.2s_ease-out]">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-2.5 pl-9 pr-10 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-black font-extrabold text-xs transition duration-200 shadow-md hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* Action Button: Sign Out */}
        <button
          onClick={() => {
            handleClose();
            logout();
          }}
          className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition duration-200 shadow-md hover:shadow-red-500/20 active:scale-[0.98] cursor-pointer shrink-0 mt-auto"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out of Account</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
