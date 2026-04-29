import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  doc, 
  onSnapshot, 
  orderBy, 
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  Trash2, 
  Download,
  Copy, 
  Check,
  MessageCircle,
  Globe,
  Plus,
  Clock,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, addHours } from 'date-fns';
import { UserProfile, Question, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-error';
import { cn } from '../lib/utils';
import { toPng } from 'html-to-image';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setTotalLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile({ id: docSnap.id, ...data });
        setTotalLoading(false);
      } else {
        navigate('/signup');
      }
    }, (error) => {
      console.error("Dashboard Profile Listener Error:", error);
      setTotalLoading(false);
    });

    return () => unsubProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;

    const inboxQuery = query(
      collection(db, `users/${user.uid}/questions`), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubInbox = onSnapshot(inboxQuery, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/questions`);
    });

    return () => unsubInbox();
  }, [user, profile]);

  // Timer logic for portal expiry
  useEffect(() => {
    if (!profile?.portalExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const expiry = profile.portalExpiresAt instanceof Timestamp 
        ? profile.portalExpiresAt.toDate().getTime() 
        : new Date(profile.portalExpiresAt).getTime();
      
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        // Automatically close portal in DB if not already
        if (profile.isPortalOpen) {
          updateDoc(doc(db, 'users', profile.id), { isPortalOpen: false });
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.portalExpiresAt, profile?.isPortalOpen, profile?.id]);

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

  const handleDeleteQuestion = async (questionId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) return;
    
    try {
      await deleteDoc(doc(db, `users/${user.uid}/questions`, questionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${questionId}`);
    }
  };

  const activatePortal = async () => {
    if (!user || !profile) return;
    const expiryDate = addHours(new Date(), 48);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPortalOpen: true,
        portalExpiresAt: Timestamp.fromDate(expiryDate)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const downloadScreenshot = async (id: string) => {
    const node = cardRefs.current[id];
    if (!node) return;

    try {
      // Find the action bar to hide it during screenshot
      const actionBar = node.querySelector('.screenshot-hide');
      if (actionBar) (actionBar as HTMLElement).style.display = 'none';

      const dataUrl = await toPng(node, {
        backgroundColor: '#0a0a0a',
        style: {
          padding: '20px',
          borderRadius: '0'
        }
      });

      if (actionBar) (actionBar as HTMLElement).style.display = 'flex';

      const link = document.createElement('a');
      link.download = `portal-response-${id.slice(0, 5)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot error:', err);
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

  const isPortalActive = profile.isPortalOpen && timeLeft !== "EXPIRED";

  return (
    <div className="min-h-screen flex flex-col md:flex-row pt-0 overflow-hidden relative">
      <aside className="w-full md:w-80 bg-neutral-900/40 border-r border-white/5 flex flex-col p-6 gap-8 overflow-y-auto relative z-10">
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
            <p className="text-[11px] font-mono text-white/50 uppercase tracking-[0.3em] mt-2 font-black">@{profile.username}</p>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={copyLink}
            className="w-full bg-white text-black py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.1em] shadow-[0_15px_30px_-10px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all group"
          >
            {copied ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />}
            {copied ? 'LINK COPIED' : 'SHARE PORTAL LINK'}
          </motion.button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-mono text-white uppercase tracking-[0.4em] px-4 font-black">PORTAL STATUS</p>
          
          <div className="p-6 glass-card border-white/10 bg-white/5 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] font-black">LIFESPAN</span>
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]",
                   isPortalActive ? "bg-green-400 animate-pulse" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                )} />
             </div>
             <div className="text-3xl font-black font-mono tracking-tighter text-white">
                {timeLeft || "--:--:--"}
             </div>
             
             {!isPortalActive ? (
                <button 
                  onClick={activatePortal}
                  className="w-full py-4 bg-brand-blue text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-blue/80 transition-colors shadow-lg shadow-brand-blue/20"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  ACTIVATE PORTAL (48H)
                </button>
             ) : (
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] italic leading-relaxed font-black">
                  PORTAL WILL SELF-DESTRUCT. INCOMING VOICES WILL BE SILENCED.
                </p>
             )}
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-white/5">
            <a 
              href={`/a/${profile.username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center gap-4 px-6 py-4 text-white/40 hover:text-white transition-colors rounded-2xl hover:bg-white/10"
            >
              <Globe className="w-5 h-5 text-white/20" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em]">LIVE VIEW</span>
            </a>
        </div>
      </aside>

      <main className="flex-1 bg-neutral-950 p-6 md:p-12 lg:p-20 overflow-y-auto relative z-10">
        <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-black tracking-tighter uppercase leading-[0.75] italic mb-8"
            >
              Vault <span className="text-brand-blue">Inbox</span><span className="text-brand-purple">.</span>
            </motion.h1>
            <p className="text-sm md:text-lg font-mono text-white/40 uppercase tracking-[0.5em] italic font-black leading-loose">
              INTERCEPTED MESSAGES FROM THE SHADOWS. <span className="text-white">THE VAULT IS ACTIVE.</span>
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-10 pb-32">
          <AnimatePresence mode="popLayout">
            {questions.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-48 flex flex-col items-center justify-center glass-card !bg-white/5 text-center !rounded-[3rem] border-white/10"
              >
                <Clock className="w-16 h-16 text-white/10 mb-8" />
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white italic">NO ACTIVITY DETECTED</h3>
                <p className="text-[11px] font-mono text-white/30 uppercase tracking-[0.5em] mt-4 font-black">SILENCE DOMINATES THE VOULT.</p>
              </motion.div>
            ) : (
              questions.map((q) => (
                <motion.div 
                  key={q.id}
                  layout
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  ref={el => cardRefs.current[q.id] = el}
                  className={cn(
                    "glass-card group relative flex flex-col border-white/5 hover:border-white/10 transition-all",
                    q.reply ? "border-brand-blue/30" : ""
                  )}
                >
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_15px_rgba(37,99,235,0.7)]" />
                        <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.4em]">ID // {q.id.slice(0, 8)}</span>
                     </div>
                     <div className="flex items-center gap-4 screenshot-hide">
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-3 text-white/20 hover:text-red-500 transition-colors bg-white/5 rounded-xl border border-white/5 hover:border-red-500/30"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 font-black uppercase">
                          {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'NOW'}
                        </span>
                     </div>
                  </div>

                  {/* SCREENSHOT WRAPPER */}
                  <div 
                    ref={el => cardRefs.current[q.id] = el}
                    className="p-8 md:p-12 bg-neutral-950 flex flex-col gap-10"
                  >
                    <div>
                       <span className="text-[10px] md:text-xs font-mono text-brand-blue/60 uppercase tracking-[0.5em] block mb-4 font-black">QUESTION // {q.id.slice(0, 8)}</span>
                       <p className="text-3xl md:text-5xl font-display font-black tracking-tighter text-white leading-[0.9] uppercase italic drop-shadow-2xl">
                          {q.text}
                       </p>
                    </div>

                    {q.reply && (
                      <div className="pt-10 border-t border-white/5">
                          <span className="text-[10px] md:text-xs font-mono text-brand-purple uppercase tracking-[0.5em] font-black block mb-4">RESPONSE:</span>
                          <p className="text-2xl md:text-4xl font-display font-medium italic text-white/90 leading-[1] uppercase tracking-tighter drop-shadow-xl">
                             {q.reply}
                          </p>
                      </div>
                    )}
                  </div>

                  {/* ACTION BAR (EXCLUDED FROM SCREENSHOT) */}
                  <div className="screenshot-hide p-6 md:p-8 bg-white/5 border-t border-white/5 flex flex-col gap-4 mt-auto">
                    {replyingTo === q.id ? (
                      <div className="space-y-4">
                        <textarea
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="TYPE RESPONSE..."
                          className="w-full bg-transparent p-0 text-xl font-display italic uppercase tracking-tighter focus:outline-none transition-all resize-none h-40 placeholder:text-neutral-800 text-brand-blue"
                        />
                        <div className="flex gap-4">
                          <button onClick={() => setReplyingTo(null)} className="flex-1 btn-vibrant-outline !py-4 !rounded-2xl !text-[10px]">Cancel</button>
                          <button 
                            onClick={() => handleReply(q.id)}
                            disabled={submittingReply || !replyText.trim() || !isPortalActive}
                            className="flex-1 btn-vibrant-blue !py-4 !rounded-2xl !text-[10px]"
                          >
                            {submittingReply ? '...' : 'COMMIT ANSWER'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {!q.reply && (
                          <button 
                            onClick={() => setReplyingTo(q.id)}
                            disabled={!isPortalActive}
                            className={cn(
                              "flex-1 py-4 rounded-2xl border flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                              isPortalActive 
                                ? "bg-white/5 border-white/10 text-neutral-400 hover:border-brand-blue hover:text-brand-blue" 
                                : "bg-neutral-900 border-neutral-800 text-neutral-700 cursor-not-allowed"
                            )}
                          >
                            {isPortalActive ? <><Plus className="w-4 h-4" /> VAULT RESPONSE</> : "PORTAL EXPIRED"}
                          </button>
                        )}
                        
                        {q.reply && (
                          <button 
                            onClick={() => downloadScreenshot(q.id)}
                            className="flex-1 btn-vibrant-purple !py-4 !rounded-2xl !text-[10px] flex items-center justify-center gap-3"
                          >
                            <Download className="w-4 h-4" />
                            SAVE FOR SCREENSHOT
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-4 text-neutral-600 hover:text-red-500 transition-colors bg-white/5 rounded-2xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Decorative background blurs */}
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-brand-purple/5 blur-[120px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 left-80 w-[400px] h-[400px] bg-brand-blue/5 blur-[100px] rounded-full z-0 pointer-events-none"></div>
    </div>
  );
}
