import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, AtSign, MessageSquareQuote, Clock, Infinity } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { GlobalStats } from '../types';

import { cn } from '../lib/utils';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const [typedText, setTypedText] = useState("");
  const fullText = "Anonymously";

  useEffect(() => {
    let i = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      setTypedText(fullText.slice(0, i));

      if (!isDeleting && i < fullText.length) {
        i++;
        timeoutId = setTimeout(type, 150);
      } else if (isDeleting && i > 0) {
        i--;
        timeoutId = setTimeout(type, 75);
      } else if (!isDeleting && i === fullText.length) {
        isDeleting = true;
        timeoutId = setTimeout(type, 2000); // Pause at end
      } else {
        isDeleting = false;
        i = 0;
        timeoutId = setTimeout(type, 500); // Pause before restarting
      }
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-6xl mx-auto text-center">


          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-7xl md:text-[8rem] lg:text-[10rem] font-black tracking-tighter mb-10 leading-[0.8] uppercase italic"
          >
            Ask <span className="text-brand-purple inline-flex items-center">
              {typedText}
              <motion.span 
                animate={{ opacity: [1, 0] }} 
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                className="w-1 md:w-2 h-[0.7em] bg-brand-purple ml-1"
              />
              <motion.span 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-4 drop-shadow-[0_0_20px_rgba(161,52,255,0.4)] not-italic"
              >
                🤫
              </motion.span>
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="max-w-xl mx-auto text-neutral-500 text-lg md:text-xl font-medium mb-12 uppercase tracking-tighter"
          >
            The world's most vibrant platform for anonymous curiosity. 
            Connect deeply, ask bravely, and see only what matters.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link to="/signup" className="btn-vibrant-blue text-lg px-12 py-5 w-full sm:w-auto">
              Start Your Portal
            </Link>
            <Link to="/login" className="btn-vibrant-outline text-lg px-12 py-5 w-full sm:w-auto">
              Access Account
            </Link>
          </motion.div>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 w-96 h-96 bg-brand-purple/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full -z-10 animate-float"></div>
      </section>

      {/* Live Stats Bar */}
      <section className="py-20 bg-white/5 border-y border-white/5 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { label: 'Total Portals', value: stats?.totalPortals || 0, color: 'text-brand-blue' },
              { label: 'Questions Asked', value: stats?.totalQuestions || 0, color: 'text-brand-purple' },
              { label: 'Community Members', value: stats?.totalUsers || 0, color: 'text-brand-pink' }
            ].map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className={cn("text-6xl md:text-7xl font-black mb-3 tabular-nums tracking-tighter transition-all group-hover:scale-110", s.color)}>
                  {s.value.toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.4em] font-black">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Tiles Section */}
      <section className="py-40 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { 
                title: "PRIVATE VAULT", 
                desc: "Your identity remains hidden. Secure, encrypted, and completely untraceable.",
                icon: Shield,
                color: "bg-brand-blue"
              },
              { 
                title: "PORTAL ACCESS", 
                desc: "Control who can reach you. Open or close your portal with a single tap.",
                icon: Smartphone,
                color: "bg-brand-purple"
              },
              { 
                title: "SMART REPLIES", 
                desc: "Respond directly in your vault. Every conversation stays private and personal.",
                icon: MessageSquareQuote,
                color: "bg-brand-orange"
              },
              { 
                title: "48H LIFETIME", 
                desc: "Ephemeral by design. Preserving space and privacy with automatic cleanup.",
                icon: Clock,
                color: "bg-brand-pink"
              },
              { 
                title: "LINK SYSTEM", 
                desc: "Share your custom link and start receiving meaningful insights immediately.",
                icon: AtSign,
                color: "bg-neutral-800"
              },
              { 
                title: "UNLIMITED", 
                desc: "A platform built for infinite curiosity. No limits on your authentic self.",
                icon: Infinity,
                color: "bg-brand-blue"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className="glass-card group flex flex-col justify-between cursor-default"
              >
                <div>
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-xl shadow-black/40", feature.color)}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-4xl font-black mb-6 uppercase tracking-tighter leading-none">{feature.title}</h3>
                  <p className="text-neutral-500 font-mono text-[11px] leading-relaxed tracking-widest uppercase italic">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Joyful Vibe Section */}
      <section className="py-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-4">
          {['Vibrant', 'Private', 'Bold', 'Anonymous', 'Secure', 'Fun', 'Authentic', 'Encrypted'].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                delay: i * 0.05,
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2 + (i * 0.2)
              }}
              className={cn(
                "px-8 py-4 rounded-full text-xl font-black uppercase italic tracking-tighter border-2",
                i % 4 === 0 ? "border-brand-blue text-brand-blue" :
                i % 4 === 1 ? "border-brand-purple text-brand-purple" :
                i % 4 === 2 ? "border-brand-orange text-brand-orange" :
                "border-brand-pink text-brand-pink"
              )}
            >
              {text}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="py-40 px-6 text-center relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto glass-card !p-20 relative z-10 overflow-hidden group"
        >
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter uppercase italic leading-[0.85]">
            READY TO JOIN THE <br /><span className="text-brand-purple">VAULTED</span> NETWORK?
          </h2>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/signup" className="btn-vibrant-purple text-xl px-16 !py-6 inline-block shadow-[0_0_40px_-5px_var(--color-brand-purple)]">
              CLAIM YOUR LINK NOW
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
