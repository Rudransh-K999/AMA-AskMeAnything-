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
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-12 rounded-[48px]"
      >
        <div className="flex items-center gap-2 mb-12 justify-center">
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-black rounded-sm text-[10px]">AMA</div>
            <span className="font-display font-black tracking-tighter text-xs uppercase">AskMeAnything</span>
        </div>

        <h1 className="text-4xl font-black tracking-tighter mb-2 text-center uppercase">Identity.</h1>
        <p className="text-neutral-500 mb-12 text-xs font-mono uppercase tracking-widest text-center">Login to access your AMA vault.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest rounded-2xl">
            {error}
          </div>
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
            className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-3 mt-4 text-[10px] uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                    Continue Account
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          First time?{' '}
          <Link to="/signup" className="text-white hover:underline">Register Handle</Link>
        </p>
      </motion.div>
    </div>
  );
}
