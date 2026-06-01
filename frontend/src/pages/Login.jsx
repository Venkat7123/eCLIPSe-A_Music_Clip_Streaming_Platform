import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Music, 
  Scissors, 
  ListMusic, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Eye, 
  EyeOff 
} from 'lucide-react';
const loginBg = '/login_bg.jpg';

const Login = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, confirmResetPassword, isFirebaseConfigured } = useApp();
  const [activeTab, setActiveTab] = useState('signin'); // 'signin', 'signup', 'forgot', or 'resetPassword'
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset password states
  const [oobCode, setOobCode] = useState('');
  
  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Check URL parameters for custom action codes (e.g. from password reset emails)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('oobCode');
    if (mode === 'resetPassword' && code) {
      setActiveTab('resetPassword');
      setOobCode(code);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
    } else if (activeTab === 'resetPassword') {
      if (!password.trim()) {
        setErrorMsg('Please enter a new password.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmNewPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('Please populate all credential fields.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (activeTab === 'signin') {
        await loginWithEmail(email.trim(), password);
      } else if (activeTab === 'signup') {
        if (!name.trim()) {
          setErrorMsg('Display Name is required to register accounts.');
          setLoading(false);
          return;
        }
        await registerWithEmail(name.trim(), email.trim(), password);
      } else if (activeTab === 'forgot') {
        await resetPassword(email.trim());
        if (!isFirebaseConfigured) {
          const simLink = `${window.location.origin}/login?mode=resetPassword&oobCode=sim_oob_code_${Date.now()}`;
          setSuccessMsg(
            <span>
              Password reset email sent (simulated). <br />
              <a href={simLink} className="text-brand-primary underline hover:text-brand-primary-hover font-bold transition-all mt-1 inline-block">
                Click here to follow the app's routing link
              </a>
            </span>
          );
        } else {
          setSuccessMsg('A password reset link has been sent to your email.');
        }
      } else if (activeTab === 'resetPassword') {
        await confirmResetPassword(oobCode, password);
        setSuccessMsg('Password has been reset successfully! Redirecting to Sign In...');
        setTimeout(() => {
          // Clear query params from location bar
          window.history.replaceState(null, '', window.location.pathname);
          setActiveTab('signin');
          setPassword('');
          setConfirmNewPassword('');
          setSuccessMsg('');
        }, 2500);
      }
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
        setErrorMsg('Invalid login credentials provided.');
      } else if (code.includes('auth/email-already-in-use')) {
        setErrorMsg('This email address is already registered.');
      } else if (code.includes('auth/weak-password')) {
        setErrorMsg('Password should be at least 6 characters.');
      } else if (code.includes('auth/user-not-found')) {
        setErrorMsg('No account found with this email address.');
      } else if (code.includes('auth/expired-action-code')) {
        setErrorMsg('The password reset link has expired. Please request a new one.');
      } else if (code.includes('auth/invalid-action-code')) {
        setErrorMsg('The password reset link is invalid or has already been used.');
      } else {
        setErrorMsg(err.message || 'Action failed. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('auth/operation-not-allowed')) {
        setErrorMsg('Google sign-in is not enabled in Firebase Console. Go to Authentication > Sign-in method and enable the Google provider.');
      } else {
        setErrorMsg(err.message || 'Google Auth aborted.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-bg-base text-zinc-100 flex overflow-hidden font-sans select-none">
      
      {/* LEFT SIDE PANEL (Hidden on Mobile) */}
      <div className="relative w-1/2 h-full hidden md:flex flex-col justify-start p-8 lg:p-12 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
          style={{ backgroundImage: `url(${loginBg})` }}
        ></div>

        {/* Top Left Logo Replacement */}
        <div className="relative z-10 flex items-center gap-3 mb-4 lg:mb-8">
          <img src="/logo1.png" alt="eCLIPSe Logo" className="h-30 w-auto object-contain" />
        </div>

        {/* Headline and Tagline Content */}
        <div className="relative z-10 max-w-lg flex flex-col justify-start">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-3 text-white">
            Your Music.<br />
            Your Clips.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 active-glow drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Your Energy.</span>
          </h1>
          
          <p className="text-zinc-400 text-xs lg:text-sm leading-relaxed mb-6 lg:mb-8 max-w-sm">
            Discover. Play. Clip. Create. All your favorite sounds, in one epic experience.
          </p>

          {/* Premium Features List */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <div className="flex gap-3 items-start group">
              <div className="p-2.5 bg-purple-950/40 border border-purple-500/10 rounded-xl text-brand-primary group-hover:scale-110 transition duration-200">
                <Music className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs lg:text-sm">Millions of Tracks</h4>
                <p className="text-zinc-400 text-[11px] lg:text-xs mt-0.5">Explore a world of sounds.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start group">
              <div className="p-2.5 bg-purple-950/40 border border-purple-500/10 rounded-2xl text-brand-primary group-hover:scale-110 transition duration-200">
                <Scissors className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs lg:text-sm">Clip & Customize</h4>
                <p className="text-zinc-400 text-[11px] lg:text-xs mt-0.5">Trim your favorite parts and make them your own.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start group font-sans">
              <div className="p-2.5 bg-purple-950/40 border border-purple-500/10 rounded-2xl text-brand-primary group-hover:scale-110 transition duration-200">
                <ListMusic className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs lg:text-sm">Build Playlists</h4>
                <p className="text-zinc-400 text-[11px] lg:text-xs mt-0.5">Create, organize and share playlists that vibe with you.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-between p-6 md:p-12 bg-[#09090b]/95 overflow-y-auto relative border-l border-white/5">
        
        {/* Soft neon auras */}
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>

        {/* Mobile Header Logo (Visible on small screens only) */}
        <div className="md:hidden flex justify-center mt-4">
          <img src="/logo1.png" alt="eCLIPSe Logo" className="h-20 w-auto object-contain" />
        </div>

        {/* Main card box container */}
        <div className="w-full max-w-[420px] mx-auto my-auto relative z-10 py-8">
          
          <div className="bg-[#121214]/65 border border-white/5 rounded-3xl p-8 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.4)]">
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {activeTab === 'forgot' ? (
                  'Reset Password'
                ) : activeTab === 'resetPassword' ? (
                  'Set New Password'
                ) : (
                  <>Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500 font-extrabold">eCLIPSe</span></>
                )}
              </h2>
              <p className="text-zinc-400 text-xs mt-1 font-semibold">
                {activeTab === 'forgot' ? (
                  'Enter your email address to receive a secure password reset link'
                ) : activeTab === 'resetPassword' ? (
                  'Complete the form below to secure your account'
                ) : (
                  'Sign in to continue your music journey'
                )}
              </p>
            </div>

            {/* Line tabs matching screenshot exactly, hidden in forgot/reset password views */}
            {activeTab !== 'forgot' && activeTab !== 'resetPassword' && (
              <div className="relative flex border-b border-white/5 mb-6">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`w-1/2 pb-3.5 text-xs font-bold tracking-wider text-center transition-all duration-200 relative ${
                    activeTab === 'signin' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Sign In
                  {activeTab === 'signin' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)] animate-[fadeIn_0.15s_ease-out]"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`w-1/2 pb-3.5 text-xs font-bold tracking-wider text-center transition-all duration-200 relative ${
                    activeTab === 'signup' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Sign Up
                  {activeTab === 'signup' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)] animate-[fadeIn_0.15s_ease-out]"></span>
                  )}
                </button>
              </div>
            )}

            {/* Success notifications */}
            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold p-3.5 rounded-xl mb-4 text-left animate-[slideDown_0.2s_ease-out]">
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error notifications */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold p-3.5 rounded-xl mb-4 flex items-start gap-2.5 text-left animate-[slideDown_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              
              {/* Display Name for sign up */}
              {activeTab === 'signup' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Display Name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                    required
                  />
                </div>
              )}

              {/* Email Input (only for forgot pwd or normal signin/signup) */}
              {activeTab !== 'resetPassword' && (
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="email" 
                    placeholder="Email address"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                    required
                  />
                </div>
              )}

              {/* Password Input (for signin, signup, or resetPassword) */}
              {activeTab !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder={activeTab === 'resetPassword' ? "New Password" : "Password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 pl-11 pr-12 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Confirm New Password (only for resetPassword screen) */}
              {activeTab === 'resetPassword' && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Confirm New Password"
                    value={confirmNewPassword} 
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-white text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder-zinc-500"
                    required
                  />
                </div>
              )}

              {/* Remember me & Forgot Link */}
              {activeTab !== 'forgot' && activeTab !== 'resetPassword' && (
                <div className="flex items-center justify-between text-xs mt-1 font-semibold">
                  <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-brand-primary focus:ring-brand-primary/40 focus:ring-offset-zinc-900 focus:ring-1"
                    />
                    <span>Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setActiveTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-brand-primary hover:text-brand-primary-hover transition-all"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-black font-extrabold text-xs transition duration-200 shadow-[0_4px_20px_rgba(168,85,247,0.25)] hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                {loading ? (
                  'Processing secure request...'
                ) : activeTab === 'forgot' ? (
                  'Send Reset Link'
                ) : activeTab === 'resetPassword' ? (
                  'Reset Password'
                ) : activeTab === 'signin' ? (
                  'Sign In'
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            {/* Separator / Google auth only for signin/signup */}
            {activeTab !== 'forgot' && activeTab !== 'resetPassword' && (
              <>
                <div className="relative flex items-center justify-center my-6">
                  <span className="absolute left-0 right-0 h-[1px] bg-white/5"></span>
                  <span className="relative bg-[#121214] px-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">OR</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold text-xs flex items-center justify-center gap-3 transition shadow-sm hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50 cursor-pointer font-sans"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            {/* Alternating tab footer switcher */}
            <div className="text-center text-xs mt-6 text-zinc-500 font-semibold">
              {activeTab === 'forgot' || activeTab === 'resetPassword' ? (
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-brand-primary hover:text-brand-primary-hover font-bold transition-all"
                >
                  Back to Sign In
                </button>
              ) : activeTab === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-brand-primary hover:text-brand-primary-hover font-bold ml-1 transition-all"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-brand-primary hover:text-brand-primary-hover font-bold ml-1 transition-all"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;
