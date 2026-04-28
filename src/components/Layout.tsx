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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-800 selection:text-white">
      <nav className="fixed top-0 w-full border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-md z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
            Ask<span className="text-neutral-500">Drop</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium">Login</Link>
                <Link to="/signup" className="px-4 py-1.5 bg-white text-black rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors">Start dropping</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
