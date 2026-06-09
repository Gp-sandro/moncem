import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ tag: string }>;
};

// Tag pages have been merged into the Read feed's tag filter (/feed?tag=...).
export const dynamic = 'force-dynamic';

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  redirect(`/feed?tag=${encodeURIComponent(decodeURIComponent(tag))}`);
}
