import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  doc, 
  getDoc,
  Timestamp
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
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    // Generate or retrieve anonymous ID if not logged in
    let storedId = localStorage.getItem('portal_anon_id');
    if (!storedId) {
      storedId = 'anon_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('portal_anon_id', storedId);
    }
    setAnonId(storedId);
  }, []);

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
    if (!question.trim() || !username) return;
    const finalAskerId = user?.uid || anonId;
    if (!finalAskerId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: question, askerId: finalAskerId })
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

  const isExpired = profile.portalExpiresAt && (
    profile.portalExpiresAt instanceof Timestamp 
      ? profile.portalExpiresAt.toDate() < new Date() 
      : new Date(profile.portalExpiresAt) < new Date()
  );

  const isPortalOpen = profile.isPortalOpen && !isExpired;

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden bg-neutral-950">
      <div className="max-w-2xl mx-auto px-6 pt-24 relative z-10">
        {/* WELCOME BOX */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 p-1 bg-gradient-to-r from-brand-blue/20 via-brand-purple/20 to-brand-pink/20 rounded-3xl"
        >
          <div className="bg-neutral-900/90 backdrop-blur-xl px-8 py-6 rounded-[calc(1.5rem-1px)] border border-white/5 text-center">
            <span className="text-[10px] font-mono text-brand-purple uppercase tracking-[0.5em] font-black block mb-2">ACCESS GRANTED</span>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
              WELCOME TO {profile.displayName?.toUpperCase()} AMA
            </h2>
          </div>
        </motion.div>

        {/* Profile Header */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-36 h-36 mx-auto mb-10"
          >
            <div className="absolute -inset-10 bg-brand-blue/20 blur-3xl rounded-full animate-float"></div>
            <div className="relative w-full h-full glass-card !p-0 flex items-center justify-center text-6xl font-black border-2 border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              {profile.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : profile.displayName?.[0].toUpperCase()}
            </div>
            
            <div className={cn(
                "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-neutral-950 shadow-2xl",
                isPortalOpen ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-500 shadow-red-500/50"
            )} />
          </motion.div>

          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 uppercase italic leading-[0.75] drop-shadow-2xl text-white">
            {profile.displayName}<span className="text-brand-purple">.</span>
          </h1>
          <div className="flex items-center justify-center gap-6 mb-12">
            <span className="font-mono text-sm uppercase tracking-[0.5em] text-white font-black">@{profile.username}</span>
            <div className={cn(
              "px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
              isPortalOpen ? "bg-green-400/10 border-green-400/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              Portal {isPortalOpen ? 'ALIVE' : 'DORMANT'}
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
                {!isPortalOpen ? (
                  <div className="glass-card !p-16 text-center border-red-500/20 bg-red-500/5">
                    <AlertCircle className="w-20 h-20 text-red-500/40 mx-auto mb-10" />
                    <h2 className="text-5xl font-black mb-6 uppercase italic tracking-tighter text-white">Portal Dormant</h2>
                    <p className="text-white/60 font-mono text-xs uppercase tracking-[0.4em] leading-relaxed font-black max-w-sm mx-auto">
                      This user has temporarily closed their portal to the outside world.
                    </p>
                  </div>
                ) : !submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-10">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-8 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-[0.3em] rounded-3xl"
                      >
                        {error}
                      </motion.div>
                    )}
                    
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-brand-blue/30 via-brand-purple/30 to-brand-pink/30 rounded-[4rem] blur-xl opacity-20 group-focus-within:opacity-50 transition duration-1000"></div>
                      <div className="relative glass-card !p-0 overflow-hidden !rounded-[3rem] border border-white/10 shadow-2xl">
                         <div className="bg-white/5 px-12 py-4 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.5em] font-black">ENCRYPTED BOX</span>
                            <div className="flex gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                               <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                               <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            </div>
                         </div>
                        <textarea
                          required
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder={`SEND A CLANDESTINE MESSAGE...`}
                          className="w-full h-96 p-12 text-3xl md:text-4xl font-black focus:outline-none transition-all resize-none uppercase italic placeholder:text-neutral-900 border-none bg-transparent text-white leading-tight"
                          maxLength={1000}
                        />
                        <div className="absolute bottom-10 right-12 font-mono text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">
                          {question.length} <span className="opacity-20">/ 1000</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !question.trim()}
                      className="w-full btn-vibrant-purple !py-10 text-2xl font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-6 group shadow-[0_30px_60px_-15px_rgba(161,52,255,0.5)] active:scale-95 transition-all"
                    >
                      {submitting ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-8 h-8 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                          Launch Anonymously
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-3 group cursor-help pb-8">
                      <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                      <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.5em] font-black">
                        Identity stays hidden in the shadows
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-24 glass-card !border-brand-blue/30 !rounded-[4rem] bg-brand-blue/5">
                    <div className="relative w-32 h-32 mx-auto mb-12">
                      <div className="absolute inset-0 bg-brand-blue blur-3xl opacity-30 animate-pulse"></div>
                      <CheckCircle2 className="relative w-full h-full text-brand-blue stroke-[0.5]" />
                    </div>
                    <h2 className="text-8xl font-black mb-6 uppercase italic tracking-tighter text-white">SENT<span className="text-brand-blue">.</span></h2>
                    <p className="text-white/60 font-mono text-xs tracking-[0.4em] mb-16 uppercase italic lg:px-20 leading-loose font-black">
                      Your query has been launched into the vault. It will dissolve if not answered.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center px-12">
                      <button onClick={() => {setSubmitted(false); setQuestion('');}} className="flex-1 btn-vibrant-outline !py-5 px-10 text-xs font-black uppercase tracking-widest">Launch Another</button>
                      <Link to="/dashboard" className="flex-1 btn-vibrant-blue !py-5 px-10 text-xs font-black uppercase tracking-widest">Enter Vault</Link>
                    </div>
                  </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative background blurs */}
      <div className="absolute top-1/2 left-0 -translate-x-1/2 w-96 h-96 bg-brand-purple/10 blur-[120px] rounded-full z-0 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/3 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full z-0 animate-float"></div>
    </div>
  );
}
