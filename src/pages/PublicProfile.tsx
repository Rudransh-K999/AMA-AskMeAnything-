import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  doc, 
  getDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, Question } from '../types';
import { formatDistanceToNow, subDays } from 'date-fns';

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [replies, setReplies] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<'ask' | 'feed'>('ask');

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

        const fortyEightHoursAgo = Timestamp.fromDate(subDays(new Date(), 2));

        const q = query(
          collection(db, `users/${userId}/questions`),
          where('isPublic', '==', true),
          where('createdAt', '>=', fortyEightHoursAgo),
          orderBy('createdAt', 'desc'),
          limit(25)
        );
        const snapshot = await getDocs(q);
        setReplies(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);

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
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: question })
      });
      if (!res.ok) throw new Error('Submission failed.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white font-mono text-[10px] tracking-[0.2em] animate-pulse uppercase">AMA // LOADING PROFILE</div>
    </div>
  );

  if (error || !profile) return (
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
            className="w-24 h-24 bg-neutral-900 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-4xl font-bold border border-neutral-800 overflow-hidden"
          >
            {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
            ) : profile.displayName?.[0].toUpperCase()}
          </motion.div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2 uppercase">
            {profile.displayName}
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-8">
            @{profile.username}
          </p>

          <div className="flex items-center justify-center gap-2 p-1 glass rounded-2xl inline-flex">
            <button 
              onClick={() => setTab('ask')}
              className={cn(
                "px-8 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                tab === 'ask' ? "bg-white text-black" : "text-neutral-500 hover:text-white"
              )}
            >
              Ask
            </button>
            <button 
              onClick={() => setTab('feed')}
              className={cn(
                "px-8 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                tab === 'feed' ? "bg-white text-black" : "text-neutral-500 hover:text-white"
              )}
            >
              Replies ({replies.length})
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'ask' ? (
            <motion.div 
                key="ask"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
            >
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    Drop Anonymously
                                </>
                            )}
                        </button>
                        <p className="text-center text-neutral-700 font-mono text-[8px] uppercase tracking-[0.1em]">
                            End-to-end encrypted. Fully anonymous.
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
                        <p className="text-neutral-500 font-mono text-[10px] tracking-widest mb-12 uppercase italic">Success is a quiet echo.</p>
                        <button onClick={() => {setSubmitted(false); setQuestion('');}} className="btn-secondary px-10 text-[10px] tracking-widest uppercase">Send another</button>
                    </motion.div>
                )}
            </motion.div>
          ) : (
            <motion.div 
                key="feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
            >
                {replies.length === 0 ? (
                    <div className="py-20 text-center glass rounded-[40px] text-neutral-700 font-mono text-xs uppercase tracking-widest">
                        SILENCE.
                    </div>
                ) : (
                    replies.map((r) => (
                        <div key={r.id} className="glass p-10 rounded-[40px]">
                            <div className="flex items-center gap-2 mb-6">
                                <Plus className="w-2 h-2 text-neutral-700" />
                                <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                                    {r.repliedAt?.toDate ? formatDistanceToNow(r.repliedAt.toDate(), { addSuffix: true }).toUpperCase() : 'RECENTLY'}
                                </span>
                            </div>
                            <p className="text-2xl font-display font-medium tracking-tight mb-8">
                                {r.text}
                            </p>
                            <div className="pt-8 border-t border-neutral-800/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-5 h-5 bg-white text-black font-black text-[8px] flex items-center justify-center rounded-sm">R</div>
                                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Response</span>
                                </div>
                                <p className="text-neutral-500 text-sm leading-relaxed whitespace-pre-wrap">
                                    {r.reply}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
