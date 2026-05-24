import Link from 'next/link';

const fieldAccent = ['field-venture', 'field-cobalt', 'field-graphite', 'field-coral'];

export function FieldCard({
  href,
  label,
  metric,
  index = 0,
}: {
  href: string;
  label: string;
  metric: string;
  index?: number;
}) {
  return (
    <Link href={href} className={`field-card ${fieldAccent[index % fieldAccent.length]}`}>
      <span>{label}</span>
      <strong>{metric}</strong>
    </Link>
  );
}
