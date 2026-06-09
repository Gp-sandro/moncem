import { redirect } from 'next/navigation';

// Explore has been merged into the single chronological Read feed at /feed.
export const dynamic = 'force-dynamic';

export default function ExplorePage() {
  redirect('/feed');
}
