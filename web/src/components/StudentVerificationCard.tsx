'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackClientEvent } from '@/lib/analytics-client';

type VerificationResult = {
  ok?: boolean;
  verified?: boolean;
  reason?: string;
  error?: string;
};

export function StudentVerificationCard({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(verified);

  async function verifyStudentEmail() {
    setChecking(true);
    setMessage(null);

    try {
      const response = await fetch('/api/student-verification/check', {
        method: 'POST',
      });
      const result = (await response.json().catch(() => null)) as VerificationResult | null;

      if (!response.ok || !result?.ok) {
        setMessage(result?.error ?? 'Could not verify your student email yet.');
        trackClientEvent('student_verification_failed');
        setChecking(false);
        return;
      }

      if (result.verified) {
        setIsVerified(true);
        setMessage('Student badge unlocked.');
        trackClientEvent('student_verification_success');
        router.refresh();
      } else {
        setMessage(result.reason ?? 'This email does not look like a school email yet.');
        trackClientEvent('student_verification_failed', { reason: 'not_academic_domain' });
      }
    } catch {
      setMessage('Could not reach the verification server.');
      trackClientEvent('student_verification_failed', { reason: 'network' });
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className={`verification-card ${isVerified ? 'verified' : ''}`}>
      <div>
        <p className="eyebrow">Student verification</p>
        <h2>{isVerified ? 'Verified student badge is active.' : 'Verify your school signal.'}</h2>
        <p>
          {isVerified
            ? 'Your public profile can show the verified student badge.'
            : `We will check ${email}. School domains like .edu, .edu.*, and .ac.* unlock the badge automatically.`}
        </p>
        {message ? <p className="verification-message">{message}</p> : null}
      </div>
      {!isVerified ? (
        <button className="button venture" type="button" onClick={verifyStudentEmail} disabled={checking}>
          {checking ? 'Checking...' : 'Verify student email'}
        </button>
      ) : null}
    </section>
  );
}
