import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  doc, 
  getDoc,
} from 'firebase/firestore';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!username) return;
      try {
        const uDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
        if (!uDoc.exists()) {
          setError('User not found.');
          return;
        }
        const { userId } = uDoc.data();
        const profileDoc = await getDoc(doc(db, 'users', userId));
        if (!profileDoc.exists()) {
          setError('Profile not found.');
          return;
        }
        setProfile({ id: profileDoc.id, ...profileDoc.data() } as UserProfile);
      } catch (err) {
        setError('Connection failed.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !username || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: question, askerId: user.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-brand-purple font-mono font-black text-[10px] tracking-[0.2em] animate-pulse uppercase">Syncing Portal...</div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <AlertCircle className="w-16 h-16 text-neutral-800 mb-8" />
      <h1 className="text-5xl font-black mb-6 tracking-tighter uppercase italic">MEMBER NOT FOUND</h1>
      <Link to="/" className="btn-vibrant-outline">Back to Origin</Link>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-6 pt-24">
        {/* Profile Header */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-32 h-32 mx-auto mb-10"
          >
            <div className="absolute -inset-4 bg-brand-purple/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-full h-full glass-card !p-0 flex items-center justify-center text-5xl font-black border-2 border-white/10 overflow-hidden shadow-2xl">
              {profile.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : profile.displayName?.[0].toUpperCase()}
            </div>
            
            <div className={cn(
                "absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-neutral-950 shadow-lg",
                profile?.isPortalOpen ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
            )} />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase italic leading-[0.9]">
            {profile.displayName}
          </h1>
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">@{profile.username}</span>
            <div className={cn(
              "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest",
              profile?.isPortalOpen ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              Portal {profile?.isPortalOpen ? 'Alive' : 'Dormant'}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
            <motion.div 
                key={submitted ? "success" : "form"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
            >
                {!profile?.isPortalOpen ? (
                  <div className="glass-card !p-12 text-center border-red-500/10">
                    <AlertCircle className="w-16 h-16 text-red-500/20 mx-auto mb-8" />
                    <h2 className="text-3xl font-black mb-4 uppercase italic">Portal Dormant</h2>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-[0.2em] leading-relaxed">
                      This user has temporarily closed their portal to the outside world.
                    </p>
                  </div>
                ) : !user ? (
                  <div className="glass-card !p-12 text-center">
                    <h2 className="text-3xl font-black mb-6 uppercase italic">Access Restricted</h2>
                    <p className="text-neutral-500 font-mono text-[11px] uppercase tracking-[0.2em] mb-12 italic leading-relaxed">
                      Anonymous interactions require a verified account. Your identity stays hidden.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/signup" className="btn-vibrant-blue px-12">Register</Link>
                      <Link to="/login" className="btn-vibrant-outline px-12">Access</Link>
                    </div>
                  </div>
                ) : !submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl"
                      >
                        {error}
                      </motion.div>
                    )}
                    
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink rounded-[3rem] blur opacity-10 group-focus-within:opacity-30 transition duration-1000"></div>
                      <textarea
                        required
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={`Message ${profile.displayName?.toUpperCase()}...`}
                        className="relative w-full h-80 glass-card !p-12 text-2xl font-black focus:outline-none focus:border-brand-blue/30 transition-all resize-none uppercase italic placeholder:text-neutral-800"
                        maxLength={1000}
                      />
                      <div className="absolute bottom-10 right-12 font-mono text-[10px] font-black text-neutral-800 uppercase tracking-widest">
                        {question.length} <span className="opacity-30">/ 1000</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !question.trim()}
                      className="w-full btn-vibrant-purple !py-8 text-lg flex items-center justify-center gap-4 group"
                    >
                      {submitting ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          Launch Anonymously
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 group cursor-help">
                      <div className="w-1 h-1 bg-neutral-800 rounded-full group-hover:bg-brand-blue transition-colors" />
                      <p className="text-neutral-700 font-mono text-[9px] uppercase tracking-widest">
                        Identity encrypted for recipient
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-20 glass-card !border-brand-blue/20">
                    <div className="relative w-24 h-24 mx-auto mb-10">
                      <div className="absolute inset-0 bg-brand-blue blur-3xl opacity-20"></div>
                      <CheckCircle2 className="relative w-full h-full text-brand-blue stroke-1" />
                    </div>
                    <h2 className="text-6xl font-black mb-4 uppercase italic tracking-tighter">SENT</h2>
                    <p className="text-neutral-500 font-mono text-[11px] tracking-[0.2em] mb-12 uppercase italic lg:px-20 leading-relaxed">
                      Your query has been launched into the vault. Check your dashboard for the echo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button onClick={() => {setSubmitted(false); setQuestion('');}} className="btn-vibrant-outline !py-4 px-10">Launch Another</button>
                      <Link to="/dashboard" className="btn-vibrant-purple !py-4 px-10">Enter Vault</Link>
                    </div>
                  </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
