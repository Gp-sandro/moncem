// All animation durations and spring configs live here. Never hardcode in components.
// Keep durations under 300ms unless the motion is communicating ongoing activity.

export const ANIM = {
  // Tabs
  tabSlide: 200,
  tabSpring: { damping: 20, stiffness: 300 },

  // Card entrance
  cardEnter: 300,
  cardStagger: 40,
  cardStaggerCap: 4,

  // Reaction pill (the one animation that earns its time)
  reactionSpring: { damping: 12, stiffness: 200 },

  // Toast
  toastEnter: 250,
  toastExit: 200,
  toastVisible: 3000,
  toastDebounce: 500,
  toastSpring: { damping: 18, stiffness: 220 },
  welcomeVisible: 3500,
  welcomeWindow: 5 * 60 * 1000,

  // Post detail reveal — 2 stages only
  postRevealStage1: 300,
  postRevealStage2: 200,
  postRevealDelay: 150,

  // Pull-to-refresh arc
  refreshArc: 800,
  refreshFadeIn: 150,
  refreshFadeOut: 150,

  // Notification bell shake
  bellShakeStep: 80,
  badgeFade: 200,

  // Selection (onboarding chips/cards)
  selectSpring: { damping: 14, stiffness: 200 },

  // Message bubble
  bubbleSpring: { damping: 16, stiffness: 200 },
  messageFade: 200,
  messageGroupWindow: 5 * 60 * 1000,
  sendPressIn: 80,
  sendPressOut: 100,

  // Legacy Animated skeleton pulse
  skeletonPulse: 1200,
} as const;
