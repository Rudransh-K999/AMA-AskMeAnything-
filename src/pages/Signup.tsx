import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Mail, Lock, Loader2, ArrowRight, AtSign } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return;

    setLoading(true);
    setError('');

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 characters and only contain letters, numbers, and underscores.');
      setLoading(false);
      return;
    }

    try {
      // 1. Check if username is taken
      const usernameRef = doc(db, 'usernames', cleanUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        setError('This username is already taken.');
        setLoading(false);
        return;
      }

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Set Display Name in Auth
      await updateProfile(user, { displayName: cleanUsername });

      // 4. Create Profile Docs in Batch
      const batch = writeBatch(db);
      
      batch.set(doc(db, 'users', user.uid), {
        email: user.email,
        username: cleanUsername,
        displayName: cleanUsername,
        isPortalOpen: false,
        createdAt: serverTimestamp(),
      });

      batch.set(usernameRef, {
        userId: user.uid
      });

      await batch.commit();
      
      // Increment global user stat
      fetch('/api/stats/user', { method: 'POST' }).catch(console.error);

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message);
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

        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-center uppercase italic leading-[0.8]">Genesis<span className="text-brand-purple">.</span></h1>
        <p className="text-white/40 mb-12 text-xs font-mono uppercase tracking-[0.4em] text-center font-black">CREATE YOUR PRESENCE ON THE VAULT.</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-6 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-2xl leading-relaxed"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <AtSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="CHOOSE USERNAME"
              className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-white transition-all placeholder:text-neutral-800"
            />
          </div>

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
          
          <div className="relative">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD (6+ CHARS)"
              className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-white transition-all placeholder:text-neutral-800"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-vibrant-purple py-5 rounded-2xl flex items-center justify-center gap-3 mt-4 text-[11px] uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                    Start Journey
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-[11px] font-mono uppercase tracking-[0.3em] text-white/30 font-black leading-relaxed">
          ALREADY A MEMBER? <Link to="/login" className="text-white hover:text-brand-blue transition-colors font-black">ACCESS ACCOUNT</Link>
        </p>
      </motion.div>

      {/* Decorative background blurs */}
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 w-96 h-96 bg-brand-blue/20 blur-[120px] rounded-full -z-0 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/3 w-[500px] h-[500px] bg-brand-purple/10 blur-[150px] rounded-full -z-0 animate-float"></div>
    </div>
  );
}
