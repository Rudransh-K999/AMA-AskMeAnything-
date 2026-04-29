import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'Invalid email or password.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full glass-card p-12 !rounded-[3rem] relative z-10"
      >
        <div className="flex items-center gap-2 mb-16 justify-center">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
              VAULTED<span className="text-brand-purple italic">.</span>
            </h2>
        </div>

        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-center uppercase italic leading-[0.8]">Identity<span className="text-brand-blue">.</span></h1>
        <p className="text-white/40 mb-12 text-xs font-mono uppercase tracking-[0.4em] text-center font-black">LOGIN TO ACCESS YOUR AMA VAULT.</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-2xl"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="EMAIL ADDRESS"
                className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-white transition-all placeholder:text-neutral-800"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PASSWORD"
                className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-white transition-all placeholder:text-neutral-800"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-vibrant-blue py-5 rounded-2xl flex items-center justify-center gap-3 mt-4 text-[11px] uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                    Continue Account
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-[11px] font-mono uppercase tracking-[0.3em] text-white/30 font-black leading-relaxed">
          FIRST TIME? <Link to="/signup" className="text-white hover:text-brand-purple transition-colors">REGISTER HANDLE</Link>
        </p>
      </motion.div>

      {/* Decorative background blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-96 h-96 bg-brand-purple/20 blur-[120px] rounded-full -z-0 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full -z-0 animate-float"></div>
    </div>
  );
}
