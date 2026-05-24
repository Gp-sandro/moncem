import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, radius, spacing } from '../../constants/theme';
import type { BuildingStage } from '../../lib/types';

interface Props {
  stage: BuildingStage | null;
}

const STAGES: { value: BuildingStage; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'Building' },
  { value: 'launched', label: 'Launched' },
  { value: 'scaling', label: 'Scaling' },
];

export default function JourneyStage({ stage }: Props) {
  if (!stage) return null;

  const currentIndex = STAGES.findIndex((item) => item.value === stage);
  if (currentIndex === -1) return null;

  return (
    <View style={styles.card}>
      <View style={styles.rail}>
        {STAGES.map((item, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <View key={item.value} style={styles.step}>
              <View style={styles.dotLine}>
                <View
                  style={[
                    styles.dot,
                    isPast && styles.dotPast,
                    isCurrent && styles.dotCurrent,
                    !isPast && !isCurrent && styles.dotFuture,
                  ]}
                />
                {index < STAGES.length - 1 ? (
                  <View style={[styles.line, index < currentIndex ? styles.linePast : styles.lineFuture]} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  isPast && styles.labelPast,
                  isCurrent && styles.labelCurrent,
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  rail: {
    flexDirection: 'row',
    minHeight: spacing.xxxl,
  },
  step: {
    flex: 1,
  },
  dotLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: spacing.md,
  },
  dot: {
    flexShrink: 0,
  },
  dotPast: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.obsidian,
  },
  dotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.venture,
    borderWidth: 3,
    borderColor: colors.ventureSoft,
  },
  dotFuture: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: 'transparent',
  },
  line: {
    flex: 1,
    height: 1.5,
    marginHorizontal: spacing.xs,
  },
  linePast: { backgroundColor: colors.obsidian },
  lineFuture: { backgroundColor: colors.border },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  labelPast: {
    color: colors.obsidian,
  },
  labelCurrent: {
    color: colors.venture,
    fontFamily: fonts.sansBold,
  },
});
