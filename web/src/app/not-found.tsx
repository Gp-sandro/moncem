import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">404</p>
        <h1>Nothing shipped here yet.</h1>
        <p className="section-copy" style={{ marginTop: 18 }}>
          This page does not exist, or the student founder story is not public.
        </p>
        <Link href="/explore" className="button venture" style={{ marginTop: 24 }}>
          Explore stories
        </Link>
      </section>
    </main>
  );
}
