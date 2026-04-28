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
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check,
  AlertCircle,
  MessageCircle,
  Reply,
  Globe,
  Settings,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile, Question, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-error';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // State for replying
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
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;

    const q = query(
      collection(db, `users/${user.uid}/questions`), 
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
        isPublic: true // Publish automatically on reply
      });
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `questions/${questionId}`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/questions`, questionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${questionId}`);
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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-neutral-500 font-mono text-xs animate-pulse">CONNECTING...</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Header/Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-8 bg-neutral-900/50 rounded-[32px] border border-neutral-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-neutral-700">
                {profile.displayName?.[0].toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <h2 className="font-bold text-xl truncate">{profile.displayName}</h2>
                <p className="text-neutral-500 text-sm font-mono truncate">@{profile.username}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-neutral-800">
              <div className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-mono text-neutral-400">Total Questions</span>
                </div>
                <span className="font-bold text-white">{questions.length}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={copyLink}
                  className="w-full flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl hover:border-neutral-600 transition-all group"
                >
                  <span className="text-xs font-mono text-neutral-400 truncate max-w-[180px]">/a/{profile.username}</span>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-500 group-hover:text-white" />}
                </button>
                <a 
                  href={`/a/${profile.username}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 p-4 bg-neutral-800 text-white rounded-2xl hover:bg-neutral-700 transition-all text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Public Link
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex gap-4">
            <Globe className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-500/80 leading-relaxed">
              Your profile is live! Anyone with the link can send you anonymous questions.
            </p>
          </div>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
            <div className="flex gap-2">
               {/* Could add filters here */}
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {questions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-[32px] text-neutral-600 italic"
                >
                  No questions yet. Share your link to start receiving them!
                </motion.div>
              ) : (
                questions.map((q) => (
                  <motion.div 
                    key={q.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group p-8 bg-neutral-900/30 border rounded-[32px] transition-all relative overflow-hidden",
                      q.reply ? "border-neutral-800" : "border-neutral-900 bg-neutral-900/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-600">
                        {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                      </span>
                      <div className="flex items-center gap-2">
                        {q.isPublic && (
                          <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">PUBLIC</span>
                        )}
                        <button 
                          onClick={() => deleteQuestion(q.id)}
                          className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xl leading-relaxed text-neutral-100 break-words mb-6">
                      {q.text}
                    </p>

                    {/* Reply Section */}
                    {replyingTo === q.id ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-neutral-600 transition-all resize-none min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => setReplyingTo(null)}
                            className="px-4 py-2 text-sm text-neutral-500 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleReply(q.id)}
                            disabled={submittingReply || !replyText.trim()}
                            className="bg-white text-black px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                          >
                            {submittingReply ? 'Replying...' : 'Reply & Publish'}
                          </button>
                        </div>
                      </motion.div>
                    ) : q.reply ? (
                      <div className="pt-6 border-t border-neutral-800 flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
                          YOU
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-neutral-500 font-bold">Replied</span>
                            <button 
                              onClick={() => {
                                setReplyingTo(q.id);
                                setReplyText(q.reply!);
                              }}
                              className="text-[10px] text-neutral-500 hover:text-white font-mono"
                            >
                              EDIT
                            </button>
                          </div>
                          <p className="text-neutral-400 text-sm whitespace-pre-wrap">{q.reply}</p>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setReplyingTo(q.id)}
                        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-neutral-800 rounded-2xl text-neutral-500 hover:text-white hover:border-neutral-600 transition-all text-sm font-medium"
                      >
                        <Reply className="w-4 h-4" />
                        Reply to this question
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
