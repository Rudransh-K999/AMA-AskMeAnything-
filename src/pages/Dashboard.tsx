import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { 
  Plus, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AskDropForm, Question } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeForm, setActiveForm] = useState<AskDropForm | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchForm = async () => {
      try {
        // Simplest possible query to avoid index requirements
        const q = query(
          collection(db, 'forms'), 
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const forms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AskDropForm[];
        
        // Sort in memory to avoid index requirements
        forms.sort((a, b) => {
          const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
          const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
          return timeB - timeA;
        });

        const current = forms.find(f => {
          const expiresAt = f.expiresAt instanceof Timestamp ? f.expiresAt.toDate() : new Date(f.expiresAt as any);
          return expiresAt > new Date() && f.isExpired !== true;
        });

        if (current) {
          setActiveForm(current);
        } else {
          setActiveForm(null);
          setQuestions([]);
        }
      } catch (err: any) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message || "Failed to load your drops. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [user]);

  useEffect(() => {
    if (!activeForm) return;

    const timer = setInterval(() => {
      const expiresAt = activeForm.expiresAt instanceof Timestamp 
        ? activeForm.expiresAt.toDate() 
        : new Date(activeForm.expiresAt as any);
      const diff = expiresAt.getTime() - new Date().getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        setActiveForm((prev: any) => prev ? ({ ...prev, isExpired: true }) : null);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeForm]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (activeForm) {
      const q = query(
        collection(db, `forms/${activeForm.id}/questions`), 
        orderBy('createdAt', 'desc')
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `forms/${activeForm.id}/questions`);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeForm]);

  const createForm = async () => {
    if (!user) return;
    const slug = nanoid(10);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    try {
      const formRef = await addDoc(collection(db, 'forms'), {
        userId: user.uid,
        slug,
        createdAt,
        expiresAt,
        questionCount: 0,
        isExpired: false,
      });

      const newForm: AskDropForm = { id: formRef.id, userId: user.uid, slug, createdAt, expiresAt, questionCount: 0, isExpired: false };
      setActiveForm(newForm);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forms');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!activeForm) return;
    try {
      await deleteDoc(doc(db, `forms/${activeForm.id}/questions/${questionId}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `forms/${activeForm.id}/questions/${questionId}`);
    }
  };

  const copyLink = () => {
    if (!activeForm) return;
    const url = `${window.location.origin}/a/${activeForm.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-neutral-500 font-mono text-xs animate-pulse">CONNECTING TO DATABASE...</div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="ml-auto underline font-bold">Retry</button>
        </div>
      )}
      {!activeForm ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-neutral-900 rounded-[40px] bg-neutral-900/10"
        >
          <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center mb-8">
            <Plus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">No active drop</h2>
          <p className="text-neutral-500 mb-10 max-w-sm">Create a temporary form to receive anonymous questions from anyone.</p>
          <button 
            onClick={createForm}
            className="px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all transform hover:scale-105"
          >
            Create AskDrop
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-neutral-900/50 rounded-[32px] border border-neutral-800">
              <div className="flex items-center gap-3 text-neutral-500 mb-6">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-widest">Time Remaining</span>
              </div>
              <div className="text-4xl font-bold font-mono tracking-tighter mb-8">
                {timeLeft || '--:--:--'}
              </div>
              
              <div className="space-y-6 pt-6 border-t border-neutral-800">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-500 uppercase font-mono tracking-widest">Questions</span>
                    <span className="text-xs font-bold text-white">{questions.length} / 100</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(questions.length / 100) * 100}%` }}
                      className="h-full bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={copyLink}
                    className="w-full flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl hover:border-neutral-600 transition-all group"
                  >
                    <span className="text-xs font-mono text-neutral-400 truncate max-w-[180px]">/a/{activeForm.slug}</span>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-500 group-hover:text-white" />}
                  </button>
                  <a 
                    href={`/a/${activeForm.slug}`}
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
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-500/80 leading-relaxed">
                This drop will be permanently deleted when the timer hits zero. Export any questions you want to keep.
              </p>
            </div>
          </div>

          {/* Questions Main Section */}
          <div className="lg:col-span-8">
            <h1 className="text-4xl font-bold tracking-tight mb-8 flex items-center gap-4">
              Inbox
              {questions.length > 0 && (
                <span className="text-sm font-mono font-medium px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-500">
                  {questions.length}
                </span>
              )}
            </h1>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {questions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center text-neutral-600 italic"
                  >
                    Waiting for the first question...
                  </motion.div>
                ) : (
                  questions.map((q) => (
                    <motion.div 
                      key={q.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group p-8 bg-neutral-900/30 border border-neutral-900 hover:border-neutral-800 rounded-[32px] transition-all relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-600">
                          {q.createdAt?.toDate ? formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </span>
                        <button 
                          onClick={() => deleteQuestion(q.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-lg leading-relaxed text-neutral-200 break-words">
                        {q.text}
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
