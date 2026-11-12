import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home">
      <div className="wordmark">
        <strong>LABAS.</strong>
        <span>PRIVATE</span>
      </div>
      <p className="eyebrow" style={{ marginTop: 36 }}>
        BY LABAS INSTITUTE
      </p>
      <h1>A private journal for ninety quiet days.</h1>
      <p className="lede" style={{ maxWidth: 520, fontSize: 18 }}>
        Sixty seconds a day. The same six questions. A clear picture of how your wellbeing is changing, read with your
        coach — not instead of them.
      </p>
      <div className="actions">
        <Link className="primary" href="/login?create=1">
          Create an account
        </Link>
        <Link className="secondary" href="/login">
          Sign in
        </Link>
      </div>
      <p className="fine" style={{ margin: '28px 0 0', textAlign: 'left' }}>
        Not a medical service. <Link href="/privacy">Privacy</Link>
      </p>
    </main>
  );
}
