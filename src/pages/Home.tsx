import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Clock, Infinity, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900 px-3 py-1 rounded-full mb-8 inline-block">
          Anonymous feedback
        </span>
        <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
          Collect truths.<br />
          <span className="text-neutral-600">Then watch them vanish.</span>
        </h1>
        <p className="text-neutral-400 text-lg sm:text-xl max-w-xl mx-auto mb-12">
          A temporary anonymous question drop box with strict rules. 
          Expires in 48 hours. Max 100 questions. No replies.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-neutral-200 transition-all transform hover:scale-105">
            Create your AskDrop
          </Link>
          <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-transparent border border-neutral-800 text-white font-semibold rounded-2xl hover:bg-neutral-900 transition-all">
            Login to dashboard
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-32 text-left">
        {[
          { icon: Clock, title: "48h Expiry", desc: "Forms and all questions are permanently deleted after 48 hours. No traces." },
          { icon: Shield, title: "Purely Anonymous", desc: "One question per IP. No accounts required for askers. Hashed IP tracking." },
          { icon: Infinity, title: "Strictly Limited", desc: "Maximum 100 questions per drop. No public feed. Privacy by design." },
          { icon: Smartphone, title: "Minimal UI", desc: "Focused on the message. No clutter, no ads, no distraction. Just questions." }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 border border-neutral-900 rounded-3xl bg-neutral-950 hover:bg-neutral-900/50 transition-colors"
          >
            <feat.icon className="w-8 h-8 text-neutral-500 mb-6" />
            <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
            <p className="text-neutral-500 leading-relaxed text-sm">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
