'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteClient({ clientId, name }: { clientId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function remove() {
    const confirmed = window.confirm(`Delete ${name} and every check-in? This cannot be undone.`);
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/clients/${clientId}/delete`, { method: 'POST' });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(body.error || 'Could not delete this client.');
      return;
    }
    router.replace('/dashboard/deletions');
    router.refresh();
  }

  return (
    <div className="no-print">
      <button className="danger" type="button" onClick={remove} disabled={loading}>
        {loading ? 'Deleting…' : 'Delete account and check-ins'}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
