import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, AtSign, MessageSquareQuote, Clock, Infinity } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { GlobalStats } from '../types';

import { cn } from '../lib/utils';

function Counter({ value, color }: { value: number; color: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 800; // Faster duration
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, isInView]);

  return (
    <div ref={ref} className={cn("text-6xl md:text-7xl font-black mb-3 tabular-nums tracking-tighter transition-all group-hover:scale-110", color)}>
      {displayValue.toLocaleString()}
    </div>
  );
}

function FeatureCard({ feature, index, leftItemVariants, rightItemVariants }: any) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-100, 100], [15, -15]);
  const rotateY = useTransform(smoothX, [-100, 100], [-15, 15]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(event.clientX - centerX);
    mouseY.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div 
      variants={index < 3 ? leftItemVariants : rightItemVariants}
      className="perspective-1000"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ 
          y: [0, -15, 0],
          rotateZ: [0, index % 2 === 0 ? 1.5 : -1.5, 0]
        }}
        transition={{ 
          y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 },
          rotateZ: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
        }}
        whileHover={{ 
          scale: 1.1,
          y: -25,
          transition: { duration: 0.1, ease: "circOut" }
        }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          rotateX, 
          rotateY, 
          transformStyle: 'preserve-3d' 
        }}
        className="glass-card group flex flex-col justify-between cursor-default h-full transition-shadow duration-300 hover:shadow-brand-purple/20"
      >
        <div style={{ transform: 'translateZ(40px)' }} className="relative z-10">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-xl shadow-black/40", feature.color)}>
            <feature.icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-4xl font-black mb-6 uppercase tracking-tighter leading-none text-white">{feature.title}</h3>
          <p className="text-white/40 font-mono text-[11px] leading-relaxed tracking-[0.2em] uppercase italic font-black">
            {feature.desc}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

  const leftItemVariants = {
    hidden: { opacity: 0, x: -100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const rightItemVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
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
            Ask Anything<br />
            <span className="text-brand-purple inline-flex items-center min-h-[0.9em]">
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
        className="max-w-xl mx-auto text-white/40 text-lg md:text-xl font-black mb-16 uppercase tracking-[0.4em] italic leading-relaxed"
      >
        Let your friends drop their <span className="text-white">unfiltered questions</span>. 
        Completely anonymous. Completely secure.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-8"
      >
        <Link to="/signup" className="btn-vibrant-blue text-xl px-16 py-6 w-full sm:w-auto shadow-[0_20px_40px_-15px_rgba(37,99,235,0.5)]">
          CLAIM YOUR LINK
        </Link>
        <Link to="/login" className="btn-vibrant-outline text-xl px-16 py-6 w-full sm:w-auto hover:bg-white/5">
          LOGIN
        </Link>
      </motion.div>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 w-96 h-96 bg-brand-purple/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full -z-10 animate-float"></div>
      </section>

      {/* Live Stats Bar */}
      <section className="py-24 bg-white/5 border-y border-white/5 backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-purple/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
          <h2 className="text-sm font-mono text-brand-purple uppercase tracking-[0.6em] mb-4 font-black">REAL-TIME TELEMETRY</h2>
          <div className="h-px w-24 bg-brand-purple/40 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {[
            { label: 'TOTAL PORTALS', value: stats?.totalPortals || 0, color: 'text-white' },
            { label: 'QUESTIONS ASKED', value: stats?.totalQuestions || 0, color: 'text-brand-purple' },
            { label: 'VAULT MEMBERS', value: stats?.totalUsers || 0, color: 'text-brand-blue' }
          ].map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center group"
            >
              <Counter value={s.value} color={s.color} />
              <div className="text-[11px] font-mono text-white/30 uppercase tracking-[0.5em] font-black">{s.label}</div>
            </motion.div>
          ))}
          </div>
        </div>
      </section>

      {/* Feature Tiles Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center md:text-left">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 leading-none">
              Core <span className="text-brand-blue">Features.</span>
            </h2>
          </div>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
              <FeatureCard 
                key={i} 
                feature={feature} 
                index={i} 
                leftItemVariants={leftItemVariants} 
                rightItemVariants={rightItemVariants} 
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-24 px-6 overflow-hidden bg-neutral-950/50 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-white/90">
            What the <span className="text-brand-purple underline decoration-brand-purple/30 underline-offset-8">Community</span> says
          </h2>
        </div>

        <div className="relative flex flex-col gap-8 overflow-hidden group">
          <div className="flex animate-marquee whitespace-nowrap gap-8 hover:pause-animation">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-8 items-center">
                {[
                  { name: "@alex_v", text: "Best anonymous app I've used, period.", color: "border-brand-blue" },
                  { name: "@sarah.dev", text: "Finally something that feels secure and private.", color: "border-brand-purple" },
                  { name: "@jordan_k", text: "The design is absolutely stunning. Smooth AF.", color: "border-brand-pink" },
                  { name: "@mika_u", text: "Love the 48h lifetime feature. Keeps it fresh.", color: "border-brand-orange" },
                  { name: "@debbie_w", text: "My friends are dropping some deep questions lol.", color: "border-white/20" },
                  { name: "@zane_dev", text: "The interface is so snappy. Love the motion.", color: "border-brand-blue" },
                  { name: "@lara_j", text: "Totally addicted to checking my vault daily.", color: "border-brand-purple" },
                  { name: "@echo_user", text: "A better way to connect with my followers.", color: "border-brand-pink" },
                  { name: "@ruverse_fan", text: "The Ruverse ecosystem is growing fast!", color: "border-brand-orange" },
                  { name: "@cave_lover", text: "Developers Cave did it again! Global quality.", color: "border-white/20" },
                ].map((review, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex-shrink-0 w-80 p-6 glass-card !rounded-2xl border-l-4",
                      review.color
                    )}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                        {review.name[1].toUpperCase()}
                      </div>
                      <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest">{review.name}</span>
                    </div>
                    <p className="text-white/80 font-medium text-sm italic italic leading-relaxed whitespace-normal tracking-tight">
                      "{review.text}"
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-2">
              VAULTED<span className="text-brand-purple italic">.</span>
            </h2>
            <p className="text-neutral-500 font-mono text-[10px] tracking-[0.3em] uppercase">
              By The Ruverse
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-10">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 group"
            >
              <div className="w-1 h-1 bg-brand-blue rounded-full group-hover:scale-150 transition-transform" />
              Github
            </a>
            <a 
              href="#" 
              className="text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 group"
            >
              <div className="w-1 h-1 bg-brand-purple rounded-full group-hover:scale-150 transition-transform" />
              Developers Cave
            </a>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
              Copyright © {new Date().getFullYear()} @The Ruverse
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
