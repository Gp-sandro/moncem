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
      <section className="shell compact-page-header composer-compact-header">
        <div>
          <h1>New dispatch</h1>
          <p>One decision, one number, one ask.</p>
        </div>
      </section>
      <section className="shell">
        <PostComposer />
      </section>
    </main>
  );
}
