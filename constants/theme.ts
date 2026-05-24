export const colors = {
  obsidian: '#111618',
  gold: '#188c61',
  goldLight: '#dff4eb',
  parchment: '#f6f8f5',
  white: '#ffffff',
  border: '#d8dfd8',
  muted: '#87918b',
  mutedDark: '#53606a',
  cardDark: '#263037',
  textBody: '#53606a',
  avatarBg: '#dff4eb',
  metaText: '#87918b',
  badgeText: '#bfeede',
  bookmarkIdle: '#b8c3bb',
  tabInactive: '#87918b',
  skeletonPulse: '#e8eee8',
  skeletonBlock: '#d8dfd8',
  activeSubtleText: '#bfeede',
  inputErrorPlaceholder: '#ef9986',
  shadow: '#000000',
  errorRed: '#ef6547',
  errorBg: '#ffe7df',
  venture: '#188c61',
  ventureSoft: '#dff4eb',
  cobalt: '#2557d6',
  cobaltSoft: '#e4ebff',
  coral: '#ef6547',
  coralSoft: '#ffe7df',
  graphite: '#263037',
  cloud: '#f6f8f5',
  accent: {
    journey: '#188c61',
    build: '#2557d6',
    idea: '#ef6547',
    demo: '#7b5bd6',
  },
  reaction: {
    sparked: '#188c61',
    validated: '#2557d6',
    inthis: '#2d3a4a',
  },
  topic: [
    { bg: '#176849', accent: '#dff4eb', glow: 'rgba(255,255,255,0.14)' },
    { bg: '#1f47ad', accent: '#e4ebff', glow: 'rgba(255,255,255,0.14)' },
    { bg: '#c94b35', accent: '#ffe7df', glow: 'rgba(255,255,255,0.14)' },
    { bg: '#263037', accent: '#f6f8f5', glow: 'rgba(255,255,255,0.12)' },
  ],
} as const;

export const fonts = {
  display: 'DMSerifDisplay_400Regular',
  displayItalic: 'DMSerifDisplay_400Regular_Italic',
  serifBody: 'Lora_400Regular',
  serifBodyItalic: 'Lora_400Regular_Italic',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansBold: 'PlusJakartaSans_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const radius = {
  tag: 6,
  chip: 14,
  card: 18,
  hero: 24,
  avatar: 999,
  accentBar: 2,
} as const;

export const sizes = {
  heroHeight: 258,
  navHeight: 56,
  tapTarget: 44,
  avatarSm: 22,
  avatarMd: 26,
  fab: 40,
  accentBar: 4,
  screenPadding: 18,
} as const;

export const fontSize = {
  label: 9,
  meta: 10,
  body: 12,
  bodyLarge: 13,
  cardTitle: 14,
  sectionTitle: 16,
  heroTitle: 19,
  pageTitle: 22,
  hero: 28,
} as const;
