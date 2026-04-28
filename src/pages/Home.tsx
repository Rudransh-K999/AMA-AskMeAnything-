import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, AtSign, MessageSquareQuote, Clock, Infinity } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { GlobalStats } from '../types';

export default function Home() {
  const [stats, setStats] = useState<GlobalStats>({ totalUsers: 0, totalQuestions: 0, totalPortals: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as GlobalStats);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold tracking-widest uppercase mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          System Live
        </motion.div>

        <h1 className="text-6xl sm:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
          AMA<br />
          <span className="text-neutral-700">STAY UNKNOWN.</span>
        </h1>
        <p className="text-neutral-400 text-lg sm:text-xl max-w-lg mx-auto mb-12 font-medium">
          Ask Anything. Stay Unknown.<br />Claim your free AMA link now.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup" className="btn-primary w-full sm:w-auto px-10 py-5 text-lg">
            Claim my free AMA link
          </Link>
        </div>

        {/* Live Stats Bar */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-12 pt-12 border-t border-neutral-900/50">
            {[
                { label: 'Portals Opened', value: stats.totalPortals },
                { label: 'Questions Asked', value: stats.totalQuestions },
                { label: 'Registered Users', value: stats.totalUsers }
            ].map((s, i) => (
                <div key={i} className="text-center">
                    <div className="text-3xl font-black mb-1">{s.value.toLocaleString()}</div>
                    <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">{s.label}</div>
                </div>
            ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-32 text-left">
        {[
          { icon: Shield, title: "Purely Anonymous", desc: "Askers remain completely anonymous. No IP leaks, no tracking, just honest communication." },
          { icon: Clock, title: "48 hrs life", desc: "Questions exist for a limited time. Stay active or watch the inbox reset to preserve privacy." },
          { icon: Infinity, title: "100 Questions", desc: "Each link is free and supports up to 100 questions. Quality over quantity, always." },
          { icon: MessageSquareQuote, title: "Inbuilt Reply", desc: "Respond to questions directly on your public feed. Share your truths with the world." }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 glass rounded-[32px] group hover:border-neutral-700 transition-all"
          >
            <feat.icon className="w-8 h-8 text-white mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold mb-2 uppercase">{feat.title}</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* About Developer Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-40 pt-20 border-t border-neutral-900 text-center"
      >
        <div className="max-w-2xl mx-auto">
          <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-8 border border-neutral-800">
            <Smartphone className="w-6 h-6 text-neutral-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter mb-6 uppercase">About the Developer</h2>
          <p className="text-neutral-500 leading-relaxed mb-8">
            AMA was built with a single vision: to provide a secure, minimalist, and truly anonymous space for communication. 
            We believe that the best conversations happen when people feel safe to express their true thoughts without judgment.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="px-4 py-2 bg-neutral-900 rounded-full text-[10px] font-mono text-neutral-500 uppercase tracking-widest border border-neutral-800">
              Privacy First
            </div>
            <div className="px-4 py-2 bg-neutral-900 rounded-full text-[10px] font-mono text-neutral-500 uppercase tracking-widest border border-neutral-800">
              Minimalist Design
            </div>
            <div className="px-4 py-2 bg-neutral-900 rounded-full text-[10px] font-mono text-neutral-500 uppercase tracking-widest border border-neutral-800">
              Open Communication
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
