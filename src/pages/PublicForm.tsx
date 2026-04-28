import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { AskDropForm } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState<AskDropForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      if (!slug) return;
      try {
        const q = query(collection(db, 'forms'), where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError('This AskDrop does not exist.');
          setLoading(false);
          return;
        }

        const formData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as AskDropForm;
        const expiresAt = formData.expiresAt instanceof Timestamp 
          ? formData.expiresAt.toDate() 
          : new Date(formData.expiresAt as any);
        
        if (expiresAt < new Date()) {
          setError('This AskDrop has expired.');
        } else if (formData.questionCount >= 100) {
          setError('This AskDrop has reached its limit of 100 questions.');
        } else {
          setForm(formData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'forms');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !form) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: form.id, text: question })
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

  if (error || !form) return (
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
    <div className="max-w-2xl mx-auto px-6 py-24">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-bold tracking-tight mb-4">Ask Anonymously</h1>
              <p className="text-neutral-500">You can only submit one question.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <textarea
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What's on your mind?"
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
                    Drop message
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </motion.div>
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Question Dropped</h1>
            <p className="text-neutral-500 mb-12">Your message was sent into the void. It will be seen by the creator and deleted in 48 hours.</p>
            <Link to="/" className="px-8 py-3 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
              Create your own drop
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
