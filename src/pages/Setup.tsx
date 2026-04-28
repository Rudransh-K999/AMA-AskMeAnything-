import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { AtSign, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Setup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username) return;

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 characters and only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Check if username is already taken
      const usernameRef = doc(db, 'usernames', cleanUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        setError('This username is already taken.');
        setLoading(false);
        return;
      }

      // 2. Create profile and username claim
      const batch = writeBatch(db);
      
      batch.set(doc(db, 'users', user.uid), {
        email: user.email,
        username: cleanUsername,
        displayName: user.displayName || cleanUsername,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });

      batch.set(usernameRef, {
        userId: user.uid
      });

      await batch.commit();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black rounded-lg text-xs">AMA</div>
          <span className="font-display font-black tracking-tighter text-lg uppercase">AskMeAnything</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 uppercase">Claim your handle</h1>
        <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest leading-relaxed">Pick a unique username for your AMA page.</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-white transition-colors">
            <AtSign className="w-5 h-5" />
          </div>
          <input
            required
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="username"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-lg focus:outline-none focus:border-neutral-600 transition-all"
            autoFocus
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username}
          className={cn(
            "w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all",
            loading || !username
              ? "bg-neutral-900 text-neutral-600 cursor-not-allowed"
              : "bg-white text-black hover:bg-neutral-200"
          )}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Finish Setup
            </>
          )}
        </button>
      </form>
    </div>
  );
}
