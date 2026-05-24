import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const maxCoverBytes = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
]);

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This upload request was blocked. Refresh the page and try again.', 403);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before uploading a cover.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before uploading a cover.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxCoverBytes + 500_000) {
    return jsonError('Cover image must be under 5MB.', 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError('Invalid upload request.', 400);
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return jsonError('Choose an image file to upload.', 400);
  }

  if (file.size > maxCoverBytes) {
    return jsonError('Cover image must be under 5MB.', 413);
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return jsonError('Cover image must be JPEG, PNG, WebP, or HEIC.', 400);
  }

  const path = `${user.id}/${randomUUID()}/cover.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from('covers')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Cover upload failed', error);
    return jsonError('Could not upload this cover image. Try again.', 400);
  }

  const { data } = supabase.storage.from('covers').getPublicUrl(path);

  return NextResponse.json(
    { publicUrl: data.publicUrl, path },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
