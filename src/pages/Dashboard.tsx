import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  doc, 
  getDoc,
  onSnapshot, 
  orderBy, 
  where,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check,
  MessageCircle,
  Reply,
  Globe,
  Plus,
  Clock
} from 'lucide-react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { UserProfile, Question, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-error';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          navigate('/setup');
          return;
        }
        setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
      } catch (err: any) {
        console.error("Dashboard Config Error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;

    // Filter for 48 hours life
    const fortyEightHoursAgo = Timestamp.fromDate(subDays(new Date(), 2));

    const q = query(
      collection(db, `users/${user.uid}/questions`), 
      where('createdAt', '>=', fortyEightHoursAgo),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/questions`);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const handleReply = async (questionId: string) => {
    if (!user || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await updateDoc(doc(db, `users/${user.uid}/questions`, questionId), {
        reply: replyText,
        repliedAt: serverTimestamp(),
        isPublic: true
      });
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `questions/${questionId}`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const url = `${window.location.origin}/a/${profile.username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white font-mono text-[10px] tracking-[0.2em] animate-pulse">AMA // CONNECTING</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-20">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-black rounded-lg text-lg">AMA</div>
              <span className="font-display font-black tracking-tighter text-xl uppercase">AskMeAnything</span>
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tighter leading-[0.8] mb-4">
              WELCOME BACK, {profile.displayName?.toUpperCase().split(' ')[0]}.
            </h1>
            <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
              Live at <span className="text-white hover:underline cursor-pointer" onClick={copyLink}>/a/{profile.username}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={copyLink} className="btn-secondary flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-8">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            <a href={`/a/${profile.username}`} target="_blank" className="btn-primary flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-8">
              <Globe className="w-4 h-4" />
              Public View
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Feed */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-4">
              <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <Plus className="w-3 h-3" />
                Inbox ({questions.length})
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {questions.length === 0 ? (
                    <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 text-center glass rounded-[32px] text-neutral-600 font-mono text-xs uppercase tracking-widest"
                    >
                    Inbox empty. Share your link.
                    </motion.div>
                ) : (
                    questions.map((q) => (
                    <motion.div 
                        key={q.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                        "glass p-8 rounded-[32px] transition-all hover:border-neutral-700 group",
                        q.reply ? "opacity-60 grayscale-[0.5]" : ""
                        )}
                    >
                        <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-600">
                            RECEIVED {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                        </span>
                        </div>
                        
                        <p className="text-2xl font-display font-medium tracking-tight mb-8">
                        {q.text}
                        </p>

                        {replyingTo === q.id ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <textarea
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your response..."
                            className="w-full bg-black border border-neutral-800 rounded-2xl p-6 text-sm focus:outline-none focus:border-white transition-all resize-none min-h-[120px]"
                            />
                            <div className="flex gap-2 justify-end">
                            <button onClick={() => setReplyingTo(null)} className="btn-secondary px-6 text-[10px] uppercase tracking-widest">Cancel</button>
                            <button 
                                onClick={() => handleReply(q.id)}
                                disabled={submittingReply || !replyText.trim()}
                                className="btn-primary px-8 text-[10px] uppercase tracking-widest"
                            >
                                {submittingReply ? 'Sending...' : 'Publish Reply'}
                            </button>
                            </div>
                        </div>
                        ) : q.reply ? (
                        <div className="pt-6 border-t border-neutral-800/50">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Replied publicly</span>
                                <button onClick={() => {setReplyingTo(q.id); setReplyText(q.reply!);}} className="text-[10px] font-mono text-neutral-400 hover:text-white underline">Edit</button>
                            </div>
                            <p className="text-neutral-400 text-sm leading-relaxed">{q.reply}</p>
                        </div>
                        ) : (
                        <button 
                            onClick={() => setReplyingTo(q.id)}
                            className="w-full btn-secondary py-4 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Reply className="w-3 h-3" />
                            Compose Reply
                        </button>
                        )}
                    </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-12 self-start space-y-8">
            <div className="glass p-8 rounded-[32px]">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-6">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-black mb-1">{questions.length}</div>
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Total</div>
                </div>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-black mb-1">{questions.filter(q => q.reply).length}</div>
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Answered</div>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[32px] overflow-hidden group">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">Live URL</h3>
              <div 
                onClick={copyLink}
                className="font-display font-medium text-lg mb-4 truncate text-neutral-400 group-hover:text-white transition-colors cursor-pointer"
              >
                ama.xyz/a/{profile.username}
              </div>
              <button onClick={copyLink} className="w-full btn-primary text-xs tracking-widest uppercase">
                {copied ? 'Link Copied' : 'Copy Invite Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
