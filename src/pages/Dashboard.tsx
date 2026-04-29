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

    const fortyEightHoursAgo = Timestamp.fromDate(subDays(new Date(), 2));

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-brand-blue font-mono text-[10px] tracking-[0.2em] animate-pulse uppercase font-black">Connecting to Vault...</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row pt-0 overflow-hidden">
      {/* PROFESSIONAL SIDEBAR (Gmail inspired) */}
      <aside className="w-full md:w-80 bg-neutral-900/40 border-r border-white/5 flex flex-col p-6 gap-8 overflow-y-auto">
        <div className="flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 glass-card !rounded-[2rem] !p-6 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/10 blur-3xl -z-10"></div>
            <div className="w-20 h-20 rounded-3xl bg-brand-purple flex items-center justify-center text-4xl font-black mb-4 shadow-2xl shadow-brand-purple/30">
              {profile.displayName?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-xl font-display font-black tracking-tighter uppercase leading-none">{profile.displayName}</h2>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-2 font-bold">@{profile.username}</p>
          </motion.div>

          {/* Gmail-style Compose Button */}
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={copyLink}
            className="w-full bg-white text-black py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.1em] shadow-[0_10px_20px_-10px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-95 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Share My Vault
          </motion.button>
        </div>

        <nav className="flex flex-col gap-1">
          <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-[0.3em] mb-4 px-4 font-black">Portal Navigation</p>
          {[
            { id: 'inbox', label: 'Vault Inbox', icon: MessageCircle, count: questions.length, color: 'text-brand-blue' },
            { id: 'replies', label: 'Sent Queries', icon: Reply, count: replies.length, color: 'text-brand-purple' }
          ].map((item, idx) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (idx * 0.05) }}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex items-center justify-between px-6 py-4 rounded-2xl transition-all group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-white/10 text-white" 
                  : "text-neutral-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? item.color : "text-neutral-600")} />
                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
              </div>
              <span className={cn(
                "text-[10px] font-mono font-black px-3 py-1 rounded-lg",
                activeTab === item.id ? "bg-white/10 text-white" : "bg-white/5 text-neutral-800"
              )}>
                {item.count}
              </span>
            </motion.button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-3">
          <button 
            onClick={togglePortal}
            className={cn(
              "w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
              profile.isPortalOpen 
                ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
            )}
          >
            <Power className="w-4 h-4" />
            Portal {profile.isPortalOpen ? 'Online' : 'Offline'}
          </button>
          
          <a 
            href={`/a/${profile.username}`} 
            target="_blank" 
            className="w-full flex items-center gap-4 px-6 py-4 text-neutral-600 hover:text-brand-blue transition-colors rounded-2xl hover:bg-white/5"
          >
            <Globe className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-widest">Public View</span>
          </a>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 bg-neutral-950 p-6 md:p-12 overflow-y-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85] italic mb-4">
              {activeTab === 'inbox' ? 'Active ' : 'Your '}<span className={activeTab === 'inbox' ? 'text-brand-blue' : 'text-brand-purple'}>{activeTab === 'inbox' ? 'Inbox' : 'Replies'}</span>
            </h1>
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest max-w-xl italic">
              {activeTab === 'inbox' 
                ? "Questions received within the last 48 hours. Answer them before they vanish." 
                : "Questions you've asked others across the portal network."}
            </p>
          </div>

          {activeTab === 'inbox' && (
            <div className={cn(
              "px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
              profile.isPortalOpen ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", profile.isPortalOpen ? "bg-green-500" : "bg-red-500")} />
              Portal {profile.isPortalOpen ? 'Alive' : 'Dormant'}
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'inbox' ? (
              <motion.div 
                key="inbox-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="contents"
              >
                {questions.length === 0 ? (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center glass-card !bg-transparent text-center">
                    <Clock className="w-12 h-12 text-neutral-800 mb-6" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-700 italic">No activity found</h3>
                    <p className="text-[10px] font-mono text-neutral-800 uppercase tracking-widest mt-2">Wait for the curious to find you.</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <motion.div 
                      key={q.id}
                      layout
                      className={cn(
                        "glass-card group relative flex flex-col justify-between overflow-hidden",
                        q.reply ? "opacity-50" : "hover:scale-[1.02]"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-4">
                        <span className="text-[8px] font-mono font-black text-neutral-600 bg-neutral-900/50 px-2 py-1 rounded tracking-[0.2em]">
                          {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                        </span>
                      </div>

                      <div className="pt-4">
                        <p className={cn(
                          "text-2xl font-display font-medium tracking-tight mb-8 leading-tight uppercase italic transition-colors",
                          q.reply ? "text-neutral-500" : "text-white"
                        )}>
                          {q.text}
                        </p>
                      </div>

                      {replyingTo === q.id ? (
                        <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                          <textarea
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="YOUR MESSAGE..."
                            className="w-full bg-transparent p-0 text-xs font-mono uppercase tracking-widest focus:outline-none transition-all resize-none h-24 placeholder:text-neutral-700"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setReplyingTo(null)} className="flex-1 btn-vibrant-outline !py-2 !rounded-xl !text-[9px]">Cancel</button>
                            <button 
                              onClick={() => handleReply(q.id)}
                              disabled={submittingReply || !replyText.trim()}
                              className="flex-1 btn-vibrant-purple !py-2 !rounded-xl !text-[9px]"
                            >
                              {submittingReply ? '...' : 'Launch Reply'}
                            </button>
                          </div>
                        </div>
                      ) : q.reply ? (
                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-1 bg-brand-blue rounded-full" />
                              <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Vaulted Reply</span>
                            </div>
                            <p className="text-neutral-400 text-sm italic font-medium leading-relaxed">{q.reply}</p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setReplyingTo(q.id)}
                          className="w-full mt-4 btn-vibrant-outline !py-3 !rounded-xl text-[9px] flex items-center justify-center gap-2 border-brand-blue/20 hover:border-brand-blue hover:text-brand-blue"
                        >
                          <Reply className="w-3 h-3" />
                          Craft Response
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="replies-list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="contents"
              >
                {replies.length === 0 ? (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center glass-card !bg-transparent text-center">
                    <MessageCircle className="w-12 h-12 text-neutral-800 mb-6" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-700 italic">No outbox data</h3>
                    <p className="text-[10px] font-mono text-neutral-800 uppercase tracking-widest mt-2">Go out and explore other portals.</p>
                  </div>
                ) : (
                  replies.map((r) => (
                    <div key={r.id} className="glass-card flex flex-col justify-between hover:border-brand-purple/20 transition-all">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[8px] font-mono font-black text-neutral-600 bg-neutral-900 focus:outline bg-neutral-900/50 px-2 py-1 rounded tracking-[0.2em] uppercase">
                                    SENT {r.createdAt?.toDate ? formatDistanceToNow(r.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                                </span>
                                {r.reply ? (
                                    <span className="text-[9px] font-black text-brand-purple bg-brand-purple/10 px-3 py-1 rounded-full uppercase italic tracking-widest">Vaulted</span>
                                ) : (
                                    <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">Awaiting...</span>
                                )}
                            </div>
                            <p className="text-2xl font-display font-medium tracking-tight mb-8 leading-tight uppercase italic">{r.text}</p>
                        </div>
                        {r.reply && (
                            <div className="pt-6 border-t border-white/5 bg-brand-purple/5 -mx-8 -mb-8 p-8 mt-4">
                                <span className="text-[8px] font-mono text-brand-purple uppercase tracking-[0.3em] font-black block mb-3">Target Response:</span>
                                <p className="text-white text-sm font-medium leading-relaxed italic">{r.reply}</p>
                            </div>
                        )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
