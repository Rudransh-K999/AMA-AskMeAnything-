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
  MessageCircle,
  MessageSquareQuote
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, Question } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [repliedQuestions, setRepliedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'replies'>('ask');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      try {
        setLoading(true);
        // 1. Resolve username to userId
        const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
        
        if (!usernameDoc.exists()) {
          setError('User not found.');
          return;
        }

        const { userId } = usernameDoc.data();
        
        // 2. Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          setError('Profile not found.');
          return;
        }

        setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);

        // 3. Fetch public replies
        const q = query(
          collection(db, `users/${userId}/questions`),
          where('isPublic', '==', true),
          orderBy('repliedAt', 'desc'),
          limit(50)
        );
        const repliesSnapshot = await getDocs(q);
        setRepliedQuestions(repliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[]);

      } catch (err: any) {
        console.error("Public Profile Fetch Error:", err);
        setError('Something went wrong while loading the profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !username) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: question })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-neutral-800" />
    </div>
  );

  if (error || !profile) return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-8 h-8 text-neutral-600" />
      </div>
      <h1 className="text-2xl font-bold mb-4">{error || 'Something went wrong.'}</h1>
      <Link to="/" className="text-neutral-500 hover:text-white inline-flex items-center gap-2 group transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to AskDrop
      </Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-24">
      {/* Profile Header */}
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-neutral-800 rounded-full mx-auto mb-6 overflow-hidden border-4 border-neutral-900">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-bold">
              {profile.displayName?.[0].toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{profile.displayName}</h1>
        <p className="text-neutral-500 font-mono text-sm mb-4">@{profile.username}</p>
        {profile.bio && (
          <p className="text-neutral-400 max-w-sm mx-auto mb-8">{profile.bio}</p>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 p-1 bg-neutral-900/50 rounded-2xl inline-flex mb-8">
          <button 
            onClick={() => setActiveTab('ask')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'ask' ? "bg-white text-black" : "text-neutral-500 hover:text-white"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Ask
          </button>
          <button 
            onClick={() => setActiveTab('replies')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'replies' ? "bg-white text-black" : "text-neutral-500 hover:text-white"
            )}
          >
            <MessageSquareQuote className="w-4 h-4" />
            Replies
            {repliedQuestions.length > 0 && (
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-md">
                {repliedQuestions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ask' ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group">
                  <textarea
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={`Ask ${profile.displayName} anything...`}
                    className="w-full h-48 bg-neutral-900/50 border border-neutral-800 rounded-[32px] p-8 text-lg focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all resize-none shadow-2xl group-hover:border-neutral-700"
                    maxLength={1000}
                  />
                  <div className="absolute bottom-6 right-8 text-xs font-mono text-neutral-600">
                    {question.length}/1000
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !question.trim()}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all",
                    submitting || !question.trim() 
                      ? "bg-neutral-900 text-neutral-600 cursor-not-allowed" 
                      : "bg-white text-black hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Drop question
                    </>
                  )}
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight">Question Sent!</h2>
                <p className="text-neutral-500 mb-8">Your anonymous question was delivered.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="text-white font-bold hover:underline"
                >
                  Ask another?
                </button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="replies"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {repliedQuestions.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 italic">
                No questions answered yet.
              </div>
            ) : (
              repliedQuestions.map((q) => (
                <div key={q.id} className="bg-neutral-900/50 border border-neutral-800 rounded-[32px] overflow-hidden">
                  <div className="p-8">
                    <p className="text-lg text-neutral-300 mb-6 font-medium">"{q.text}"</p>
                    <div className="flex items-start gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold shrink-0 text-xs">
                        {profile.displayName?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{profile.displayName} replied</span>
                          <span className="text-[10px] font-mono text-neutral-600">
                            {q.repliedAt?.toDate ? formatDistanceToNow(q.repliedAt.toDate(), { addSuffix: true }) : 'Recently'}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-wrap">{q.reply}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
