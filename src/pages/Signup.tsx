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
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-12 rounded-[48px]"
      >
        <div className="flex items-center gap-2 mb-12 justify-center">
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-black rounded-sm text-[10px]">AMA</div>
            <span className="font-display font-black tracking-tighter text-xs uppercase">AskMeAnything</span>
        </div>

        <h1 className="text-4xl font-black tracking-tighter mb-2 text-center uppercase">Genesis.</h1>
        <p className="text-neutral-500 mb-12 text-xs font-mono uppercase tracking-widest text-center">Create your presence on AMA.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest rounded-2xl leading-relaxed">
            {error}
          </div>
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
            className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-3 mt-4 text-[10px] uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                    Start Journey
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          Already a member?{' '}
          <Link to="/login" className="text-white hover:underline">Access Account</Link>
        </p>
      </motion.div>
    </div>
  );
}
