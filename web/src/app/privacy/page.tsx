export const metadata = {
  title: 'Privacy',
  description: 'How Moncem handles student founder data.',
};

export default function PrivacyPage() {
  return (
    <main className="reader">
      <section className="panel" style={{ padding: 'clamp(24px, 5vw, 48px)' }}>
        <p className="eyebrow">Privacy</p>
        <h1 className="page-title">Trust is part of the product.</h1>
        <p className="section-copy" style={{ marginTop: 20 }}>
          Moncem collects the minimum information needed to run a student founder
          community: profile details, posts, reactions, messages, and notifications.
          Public web pages only show fields meant to be public.
        </p>
        <div className="post-meta" style={{ marginTop: 28 }}>
          <span className="pill strong">No selling data</span>
          <span className="pill">Private messages stay private</span>
          <span className="pill">Account deletion required</span>
        </div>
      </section>
    </main>
  );
}
