import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  collectionGroup,
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
  Clock,
  Power
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
  const [replies, setReplies] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'replies'>('inbox');
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
          navigate('/signup');
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

    // INBOX: Questions received by me
    const inboxQuery = query(
      collection(db, `users/${user.uid}/questions`), 
      where('createdAt', '>=', fortyEightHoursAgo),
      orderBy('createdAt', 'desc')
    );
    
    const unsubInbox = onSnapshot(inboxQuery, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/questions`);
    });

    // REPLIES: Questions I ASKED others
    const outboxQuery = query(
      collectionGroup(db, 'questions'),
      where('askerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubOutbox = onSnapshot(outboxQuery, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);
    }, (error) => {
      console.error('Replies (Outbox) fetch error:', error);
    });

    return () => {
      unsubInbox();
      unsubOutbox();
    };
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

  const togglePortal = async () => {
    if (!user || !profile) return;
    const newState = !profile.isPortalOpen;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPortalOpen: newState
      });
      // Update global portal count
      fetch('/api/stats/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newState })
      }).catch(console.error);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
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
              Live at <span className="text-white hover:underline cursor-pointer" onClick={copyLink}>@{profile.username}</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-neutral-800 pb-4 gap-4">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setActiveTab('inbox')}
                  className={cn(
                    "text-xs font-mono uppercase tracking-widest transition-all",
                    activeTab === 'inbox' ? "text-white pb-4 border-b-2 border-white translate-y-[17px]" : "text-neutral-500 hover:text-white"
                  )}
                >
                  Inbox ({questions.length})
                </button>
                <button 
                  onClick={() => setActiveTab('replies')}
                  className={cn(
                    "text-xs font-mono uppercase tracking-widest transition-all",
                    activeTab === 'replies' ? "text-white pb-4 border-b-2 border-white translate-y-[17px]" : "text-neutral-500 hover:text-white"
                  )}
                >
                  My Submissions ({replies.length})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {activeTab === 'inbox' ? (
                  <motion.div 
                    key="inbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {questions.length === 0 ? (
                      <div className="col-span-full py-32 text-center glass rounded-[32px] text-neutral-600 font-mono text-xs uppercase tracking-widest">
                        Inbox empty.
                      </div>
                    ) : (
                      questions.map((q) => (
                        <motion.div 
                          key={q.id}
                          layout
                          className={cn(
                            "glass p-6 rounded-[32px] transition-all hover:border-neutral-700 flex flex-col justify-between h-full",
                            q.reply ? "opacity-60" : ""
                          )}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-600">
                                {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                              </span>
                              {q.reply && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <p className="text-lg font-display font-medium tracking-tight mb-6 line-clamp-3">
                              {q.text}
                            </p>
                          </div>

                          {replyingTo === q.id ? (
                            <div className="space-y-3">
                              <textarea
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="WRITE..."
                                className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-white transition-all resize-none h-24"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setReplyingTo(null)} className="flex-1 btn-secondary py-2 text-[8px] uppercase tracking-widest">Cancel</button>
                                <button 
                                  onClick={() => handleReply(q.id)}
                                  disabled={submittingReply || !replyText.trim()}
                                  className="flex-1 btn-primary py-2 text-[8px] uppercase tracking-widest"
                                >
                                  {submittingReply ? '...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          ) : q.reply ? (
                            <div className="pt-4 border-t border-neutral-800/50">
                                <p className="text-neutral-500 text-[10px] italic line-clamp-2">{q.reply}</p>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReplyingTo(q.id)}
                              className="w-full btn-secondary py-3 text-[8px] uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <Reply className="w-3 h-3" />
                              Reply
                            </button>
                          )}
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="replies"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {replies.length === 0 ? (
                      <div className="col-span-full py-32 text-center glass rounded-[32px] text-neutral-600 font-mono text-xs uppercase tracking-widest">
                        No submissions yet.
                      </div>
                    ) : (
                      replies.map((r) => (
                        <div key={r.id} className="glass p-6 rounded-[32px] flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-600">
                                        SENT {r.createdAt?.toDate ? formatDistanceToNow(r.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                                    </span>
                                    {r.reply ? (
                                        <span className="text-[8px] font-mono text-white bg-white/10 px-2 py-0.5 rounded-full uppercase">Replied</span>
                                    ) : (
                                        <span className="text-[8px] font-mono text-neutral-600 uppercase">Pending</span>
                                    )}
                                </div>
                                <p className="text-lg font-display font-medium tracking-tight mb-4">{r.text}</p>
                            </div>
                            {r.reply && (
                                <div className="pt-4 border-t border-neutral-800/50">
                                    <p className="text-white text-xs leading-relaxed">{r.reply}</p>
                                </div>
                            )}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-12 self-start space-y-8">
            <div className="glass p-8 rounded-[32px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500">Portal Control</h3>
                <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    profile.isPortalOpen ? "bg-green-500" : "bg-red-500"
                )} />
              </div>
              
              <button 
                onClick={togglePortal}
                className={cn(
                    "w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                    profile.isPortalOpen 
                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                        : "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                )}
              >
                <Power className="w-4 h-4" />
                {profile.isPortalOpen ? 'Close AMA Portal' : 'Open AMA Portal'}
              </button>
              <p className="mt-4 text-[8px] font-mono text-neutral-500 uppercase tracking-widest text-center leading-relaxed">
                {profile.isPortalOpen 
                    ? "Portal is live. You can receive new questions." 
                    : "Portal is dormant. New questions are blocked."}
              </p>
            </div>

            <div className="glass p-8 rounded-[32px]">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-6">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-black mb-1">{questions.length}</div>
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Inbox</div>
                </div>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-black mb-1">{replies.length}</div>
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Outbox</div>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[32px] overflow-hidden group">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">Live URL</h3>
              <div 
                onClick={copyLink}
                className="font-display font-medium text-lg mb-4 truncate text-neutral-400 group-hover:text-white transition-colors cursor-pointer"
              >
                {window.location.host}/a/{profile.username || '...'}
              </div>
              <button 
                onClick={copyLink} 
                disabled={!profile.isPortalOpen}
                className="w-full btn-primary text-xs tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {copied ? 'Link Copied' : profile.isPortalOpen ? 'Copy Invite Link' : 'Portal Closed'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
