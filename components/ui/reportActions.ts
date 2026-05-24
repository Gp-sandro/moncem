import { Alert } from 'react-native';
import { createReport } from '../../lib/queries';
import type { ReportReason, ReportTargetType } from '../../lib/types';

interface ReportActionOptions {
  reporterId: string;
  targetType: ReportTargetType;
  postId?: string;
  profileId?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'spam', label: 'Spam or promotion' },
  { reason: 'harassment', label: 'Harassment' },
  { reason: 'misleading', label: 'Misleading or fake' },
  { reason: 'unsafe', label: 'Unsafe content' },
  { reason: 'other', label: 'Something else' },
];

async function submitReport(
  options: ReportActionOptions,
  reason: ReportReason,
): Promise<void> {
  try {
    await createReport(options.reporterId, {
      targetType: options.targetType,
      postId: options.postId,
      profileId: options.profileId,
      reason,
    });
    options.onSuccess('Report sent. Thanks for helping keep Moncem useful.');
  } catch (err) {
    options.onError(err instanceof Error ? err.message : 'Could not send report.');
  }
}

export function showReportActions(options: ReportActionOptions): void {
  if (!options.reporterId) {
    options.onError('Please sign in before reporting content.');
    return;
  }

  const label = options.targetType === 'post' ? 'post' : 'profile';
  Alert.alert(`Report ${label}`, 'Choose the closest reason.', [
    ...REPORT_REASONS.map(({ reason, label: reasonLabel }) => ({
      text: reasonLabel,
      onPress: () => { submitReport(options, reason).catch(() => {}); },
    })),
    { text: 'Cancel', style: 'cancel' },
  ]);
}
