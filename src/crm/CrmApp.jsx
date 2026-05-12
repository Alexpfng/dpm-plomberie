import './crm.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Shared';
import { useAuth } from './hooks/useAuth';
import { Toaster } from './components/ui/toaster';
import { ProfileProvider } from './context/ProfileContext';

const queryClient = new QueryClient();

const PAGE_META = {
  '/crm':            { title: 'Dashboard',       emoji: '📊' },
  '/crm/call-queue': { title: "File d'appels",   emoji: '📞' },
  '/crm/campaigns':  { title: 'Campagnes',        emoji: '🚀' },
  '/crm/prospects':  { title: 'Prospects',        emoji: '👥' },
  '/crm/scripts':    { title: 'Scripts',          emoji: '📝' },
  '/crm/emails':     { title: 'Emails',           emoji: '✉️'  },
  '/crm/analytics':  { title: 'Analytics',        emoji: '📈' },
  '/crm/settings':   { title: 'Paramètres',       emoji: '⚙️'  },
  '/crm/import':     { title: 'Import CSV',       emoji: '📥' },
};

function CrmTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Pages sans topbar global (elles ont le leur)
  if (path.includes('/prospects/') || path.includes('/companies/') || path.includes('/campaigns/')) return null;
  if (path === '/crm/login' || path === '/crm/signup') return null;

  const meta = PAGE_META[path] || { title: 'Prospection', emoji: '🎯' };
  const isQueue = path === '/crm/call-queue';

  return (
    <div className="crm-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{meta.emoji}</span>
        <h1>{meta.title}</h1>
      </div>
      <div className="crm-topbar-actions">
        {!isQueue && (
          <button
            onClick={() => navigate('/crm/call-queue')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: '1rem',
              background: 'hsl(var(--crm-primary))', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px -4px hsl(var(--crm-primary) / 0.5)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.8 19.8 0 0 1-3.07-8.63A2 2 0 0 1 3.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Appeler
          </button>
        )}
      </div>
    </div>
  );
}

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    </div>
  );

  // DPM stays a single app: if there is no Supabase session, we keep the
  // user inside the embedded prospecting module and fall back to local mode.
  if (!user) return children;

  return children;
}

function CrmLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main crm-root" style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <CrmTopbar />
        {children}
        <Toaster />
      </div>
    </div>
  );
}

export default function CrmApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <CrmLayout>
          <AuthGuard>
            <Outlet />
          </AuthGuard>
        </CrmLayout>
      </ProfileProvider>
    </QueryClientProvider>
  );
}
