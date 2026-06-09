// A visually distinct inset that frames the dispatch's proof: a metric and
// the context around it, e.g. "50+ messages, first test client".
export function ProofCallout({ milestone }: { milestone: string }) {
  // Split "<metric>, <context>" / "<metric> - <context>" into two lines when we can.
  const match = milestone.match(/^(.*?)[,—–-]\s+(.*)$/);
  const metric = match ? match[1].trim() : milestone;
  const context = match ? match[2].trim() : null;

  return (
    <aside className="proof-callout" aria-label="Proof">
      <p className="proof-callout-label">Proof</p>
      <p className="proof-callout-metric">{metric}</p>
      {context ? <p className="proof-callout-context">{context}</p> : null}
    </aside>
  );
}
