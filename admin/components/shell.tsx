'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/dashboard', label: 'Clients' },
  { href: '/dashboard/invites', label: 'Invitations' },
  { href: '/dashboard/deletions', label: 'Deletion' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <header className="top no-print">
        <Link href="/dashboard" className="brand">LABAS.</Link>
        <nav className="nav">
          {links.map((link) => {
            const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? 'active' : undefined}>
                {link.label}
              </Link>
            );
          })}
          <button
            className="ghost"
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace('/login');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </nav>
      </header>
      <div className="desk">{children}</div>
    </>
  );
}
