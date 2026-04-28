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
    <div className="min-h-screen bg-black text-neutral-100 selection:bg-white selection:text-black font-sans">
      <nav className="fixed top-0 w-full border-b border-neutral-900 bg-black/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black rounded-lg text-xs">AMA</div>
            <span className="font-display font-black tracking-tighter text-lg uppercase">AskMeAnything</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span className="hidden sm:inline">Vault</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/login" className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors font-medium">Access</Link>
                <Link to="/signup" className="btn-primary py-2 px-5 text-[10px] uppercase tracking-widest">Register</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <main className="pt-20 min-h-screen">
        {children}
      </main>
    </div>
  );
}
