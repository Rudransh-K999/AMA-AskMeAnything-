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
      // Clear error after 5s
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white font-mono text-[10px] tracking-[0.2em] animate-pulse uppercase">AMA // LOADING PROFILE</div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 text-center">
      <AlertCircle className="w-12 h-12 text-neutral-800 mb-6" />
      <h1 className="text-3xl font-black mb-4">MEMBER NOT FOUND.</h1>
      <Link to="/" className="btn-secondary text-xs uppercase tracking-widest px-8">Back to home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-24">
      <div className="max-w-2xl mx-auto px-6 pt-24">
        {/* Profile Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black rounded-lg text-xs">AMA</div>
            <span className="font-display font-black tracking-tighter text-sm uppercase">AskMeAnything</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-24 h-24 bg-neutral-900 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-4xl font-bold border border-neutral-800 overflow-hidden relative"
          >
            {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
            ) : profile.displayName?.[0].toUpperCase()}
            
            <div className={cn(
                "absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-neutral-900",
                profile.isPortalOpen ? "bg-green-500" : "bg-red-500"
            )} />
          </motion.div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2 uppercase">
            {profile.displayName}
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-8">
            @{profile.username}
          </p>

          <div className="p-1 px-4 bg-neutral-900/50 rounded-full inline-flex items-center gap-2 border border-neutral-800">
             <div className={cn("w-1.5 h-1.5 rounded-full", profile.isPortalOpen ? "bg-green-500" : "bg-red-500")} />
             <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                Portal {profile.isPortalOpen ? 'Alive' : 'Dormant'}
             </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
            <motion.div 
                key="ask"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
            >
                {!profile.isPortalOpen ? (
                    <div className="text-center py-20 glass rounded-[40px] px-8">
                        <AlertCircle className="w-12 h-12 text-neutral-800 mx-auto mb-6" />
                        <h2 className="text-2xl font-black tracking-tighter mb-4 uppercase">Portal Dormant.</h2>
                        <p className="text-neutral-500 font-mono text-[10px] tracking-widest uppercase italic leading-relaxed">
                            This user is currently not accepting new questions. 
                            Check back later or follow their social updates.
                        </p>
                    </div>
                ) : !user ? (
                    <div className="text-center py-20 glass rounded-[40px] px-8">
                        <h2 className="text-2xl font-black tracking-tighter mb-4 uppercase">Authentication Required.</h2>
                        <p className="text-neutral-500 font-mono text-[10px] tracking-widest uppercase mb-12 italic leading-relaxed">
                            To ensure privacy and track replies, you must be logged in to ask a question. 
                            Your identity remains hidden from the recipient.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup" className="btn-primary px-10 text-[10px] tracking-widest uppercase py-4">Register</Link>
                            <Link to="/login" className="btn-secondary px-10 text-[10px] tracking-widest uppercase py-4">Access Account</Link>
                        </div>
                    </div>
                ) : !submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest rounded-2xl">
                                {error}
                            </div>
                        )}
                        <div className="relative">
                            <textarea
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder={`ASK ${profile.displayName?.toUpperCase()} ANYTHING...`}
                                className="w-full h-64 bg-neutral-900/50 border border-neutral-800 rounded-[40px] p-10 text-xl font-medium focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all resize-none font-display uppercase tracking-tight placeholder:text-neutral-800"
                                maxLength={1000}
                            />
                            <div className="absolute bottom-10 right-10 font-mono text-[10px] text-neutral-800 uppercase tracking-widest">
                                {question.length} / 1000
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !question.trim()}
                            className="w-full btn-primary py-6 text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Drop Authenticated Anonymous
                                </>
                            )}
                        </button>
                        <p className="text-center text-neutral-700 font-mono text-[8px] uppercase tracking-[0.1em]">
                            Recipient only sees your question. You see the reply in your dashboard.
                        </p>
                    </form>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <CheckCircle2 className="w-20 h-20 text-white mx-auto mb-8 stroke-1" />
                        <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">SENT.</h2>
                        <p className="text-neutral-500 font-mono text-[10px] tracking-widest mb-12 uppercase italic">Success is a quiet echo. Check your vault for replies.</p>
                        <button onClick={() => {setSubmitted(false); setQuestion('');}} className="btn-secondary px-10 text-[10px] tracking-widest uppercase">Send another</button>
                        <Link to="/dashboard" className="block mt-6 text-neutral-600 hover:text-white font-mono text-[8px] uppercase tracking-widest">Go to my vault</Link>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
