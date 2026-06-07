'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearAdminToken, isAuthenticated } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Dashboard',       icon: '▦', group: 'main' },
  { href: '/disputes',   label: 'Contestações',    icon: '⚖', group: 'main' },
  { href: '/users',      label: 'Usuários',         icon: '👤', group: 'data' },
  { href: '/agreements', label: 'Acordos',          icon: '📄', group: 'data' },
  { href: '/proofs',     label: 'Registros de prova', icon: '🔒', group: 'data' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  const handleLogout = () => {
    clearAdminToken();
    router.replace('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F2F2F7' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 240,
          background: '#1E1B4B',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '22px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: -0.5,
            }}
          >
            Selo
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            Painel Administrativo
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 20px',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  backgroundColor: isActive
                    ? 'rgba(91,33,182,0.45)'
                    : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive
                    ? '3px solid #A78BFA'
                    : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 16, opacity: isActive ? 1 : 0.7 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Selo Beta · Ambiente de teste
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '9px',
              background: 'rgba(239,68,68,0.12)',
              color: '#FCA5A5',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Sair do painel
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          marginLeft: 240,
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>
    </div>
  );
}
