
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FirestoreService } from '@/lib/firebase/firestore';
import { SystemUser } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: SystemUser | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isAdmin = user?.role === 'admin';

  const navLinks = isAdmin 
    ? [
        { name: 'Dashboard', path: '/admin/dashboard' },
        { name: 'Items', path: '/admin/items' },
        { name: 'Claims', path: '/admin/claims' },
        { name: 'CCTV', path: '/admin/cctv' },
        { name: 'Inbox', path: '/admin/tickets' },
      ]
    : [
        { name: 'Browse', path: '/browse' },
        { name: 'Report', path: '/report' },
        { name: 'Dashboard', path: '/dashboard' },
      ];

  const handleLogout = async () => {
    await db.logout();
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* NAVBAR */}
      <div className="sticky top-0 bg-white/90 border-b border-border backdrop-blur-md z-50">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-5 py-[14px]">
          {/* Brand */}
          <div className="flex items-center gap-[10px] cursor-pointer" onClick={() => navigate('/')}>
            <img src="TRACEBACK.png" alt="TraceBack" className="w-[70px] h-[70px] rounded-[10px] object-cover" />
            <h1 className="text-[22px] text-brand m-0 font-extrabold hidden sm:block">TraceBack</h1>
          </div>

          {/* Nav Actions */}
          <div className="flex gap-[10px] items-center">
            {/* Desktop Links */}
            <div className="hidden md:flex gap-2 mr-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-[10px] rounded-full font-semibold text-sm transition-all duration-200 
                    ${location.pathname === link.path 
                      ? 'bg-brand/10 text-brand' 
                      : 'text-ink hover:bg-gray-50'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                 <span className="text-sm text-muted hidden md:inline">
                    {user.email} {isAdmin && <span className="text-xs bg-brand text-white px-2 py-0.5 rounded ml-1">ADMIN</span>}
                 </span>
                 <button
                    onClick={handleLogout}
                    className="px-4 py-[10px] border border-border rounded-full bg-white font-semibold cursor-pointer transition hover:shadow-soft text-sm text-brand"
                  >
                    Log out
                  </button>
              </div>
            ) : (
              <>
                 <Link to="/login" className="px-4 py-[10px] border border-border rounded-full bg-white font-semibold cursor-pointer transition hover:shadow-soft text-sm text-ink">
                    Log in
                 </Link>
                 <Link to="/login" className="px-4 py-[10px] border border-brand rounded-full bg-brand text-white font-semibold cursor-pointer transition hover:shadow-soft text-sm hover:bg-brand-600">
                    Sign up
                 </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-border p-4 space-y-2">
           {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl font-medium text-ink hover:bg-gray-50"
              >
                {link.name}
              </Link>
            ))}
        </div>
      )}

      <main className="flex-grow w-full">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="max-w-[1200px] mx-auto w-full py-12 px-5 mt-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
                <img src="TRACEBACK.png" alt="TraceBack" className="w-12 h-12 rounded-lg" />
                <div>
                    <h3 className="font-bold text-lg text-ink">TraceBack</h3>
                    <p className="text-muted text-sm">Lost & Found, Reimagined.</p>
                </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/browse" className="hover:text-brand">Browse Items</Link></li>
                <li><Link to="/report" className="hover:text-brand">Report Lost</Link></li>
                <li><Link to="/dashboard" className="hover:text-brand">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <p className="text-sm text-muted mb-2">Emergency: 1-800-TRACE</p>
              <p className="text-sm text-muted">© 2025 TraceBack Systems.</p>
            </div>
        </div>
      </footer>
    </div>
  );
};
