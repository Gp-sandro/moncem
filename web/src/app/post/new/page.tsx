import { redirect } from 'next/navigation';
import { PostComposer } from '@/components/PostComposer';
import { isUserEmailVerified } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'New dispatch',
};

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/join?next=/post/new');
  }
  if (!isUserEmailVerified(user)) {
    redirect('/verify-email?next=/post/new');
  }

  return (
    <main className="composer-page">
      <section className="shell composer-hero">
        <div>
          <p className="eyebrow">New dispatch</p>
          <h1>Write the thing another student founder needs to see.</h1>
        </div>
        <p>
          Keep it concrete: what you built, what moved, what failed, and what number
          proves the lesson is real.
        </p>
      </section>
      <section className="shell">
        <PostComposer />
      </section>
    </main>
  );
}
