import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/ui/Toast';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { exportAccountData } from '../../lib/queries';

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportAccountData();
      const count = Object.keys(data).length;
      showToast({ message: `Data export prepared (${count} sections).`, type: 'success' });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Could not export data.',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        <Pressable style={styles.row} onPress={handleExport} disabled={exporting}>
          <View>
            <Text style={styles.rowTitle}>Download my data</Text>
            <Text style={styles.rowSub}>Export your profile, posts, reactions, and messages.</Text>
          </View>
          {exporting ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Feather name="download" size={18} color={colors.muted} />
          )}
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/privacy' as never)}>
          <View>
            <Text style={styles.rowTitle}>Privacy policy</Text>
            <Text style={styles.rowSub}>What Moncem collects, why, and how to delete it.</Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          style={[styles.row, styles.dangerRow]}
          onPress={() => router.push('/settings/delete-account' as never)}
        >
          <View>
            <Text style={styles.dangerTitle}>Delete account</Text>
            <Text style={styles.rowSub}>Permanently remove your profile and activity.</Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.errorRed} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.obsidian,
  },
  body: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  row: {
    minHeight: 76,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  dangerRow: {
    borderColor: colors.errorBg,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.obsidian,
  },
  dangerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.errorRed,
  },
  rowSub: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    maxWidth: 260,
  },
});
