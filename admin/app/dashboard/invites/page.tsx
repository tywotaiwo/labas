import { Invites } from '@/components/invites';

export const dynamic = 'force-dynamic';

export default function InvitesPage() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return (
    <main>
      <h1>Invitations</h1>
      <p className="muted">A personal link is the front door. There is no public sign-up.</p>
      <div style={{ height: 18 }} />
      <Invites appUrl={appUrl} />
    </main>
  );
}
