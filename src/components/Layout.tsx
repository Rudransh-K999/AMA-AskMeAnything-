import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { LogOut, LayoutDashboard } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen text-neutral-100">
      <nav className="fixed top-0 w-full border-b border-white/5 bg-neutral-950/80 backdrop-blur-2xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-brand-blue blur-sm opacity-20 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-10 h-10 bg-brand-blue text-black flex items-center justify-center font-black rounded-xl text-xs transform group-hover:rotate-12 transition-transform duration-500">AMA</div>
            </div>
            <span className="font-display font-black tracking-tighter text-2xl uppercase hidden sm:block">AskMe<span className="text-brand-blue">Anything</span></span>
          </Link>
          
          <div className="flex items-center gap-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-blue transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-pink transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-8">
                <Link to="/login" className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors font-bold">Sign In</Link>
                <Link to="/signup" className="btn-vibrant-blue !py-3">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <main className="pt-24 min-h-screen">
        {children}
      </main>
    </div>
  );
}
