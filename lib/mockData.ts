import type { Post, Profile, ReactionCounts } from './types';

const emptyReactions: ReactionCounts = {
  sparked: 0,
  validated: 0,
  inthis: 0,
};

function mockProfile(
  id: string,
  username: string,
  fullName: string,
  initials: string,
): Profile {
  return {
    id,
    username,
    fullName,
    initials,
    avatarUrl: null,
    bio: null,
    createdAt: '',
    interests: [],
    onboarded: true,
    onboardingCompleted: true,
    emailVerified: true,
    connectStatus: 'open',
    buildingStage: null,
    location: null,
  };
}

function mockPost(post: Omit<Post, 'body' | 'tags' | 'reactionCounts' | 'userReactions'>): Post {
  return {
    ...post,
    body: post.excerpt,
    tags: [],
    reactionCounts: emptyReactions,
    userReactions: [],
  };
}

export const mockPosts: Post[] = [
  mockPost({
    id: '1',
    type: 'journey',
    title: '$0 to $8k MRR cold-calling dental clinics',
    excerpt:
      'How I found 200 dental clinics, called every one of them, and landed my first paying customers without writing a single line of code.',
    coverUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80',
    milestone: '$8k MRR',
    viewCount: 4200,
    createdAt: '2h ago',
    author: mockProfile('u1', 'mia_chen', 'Mia Chen', 'MC'),
  }),
  mockPost({
    id: '2',
    type: 'build',
    title: 'AI code reviewer catching bugs humans miss',
    excerpt:
      'Built a GPT-4 powered tool that reviews PRs and finds subtle logic errors before they ship.',
    coverUrl: null,
    milestone: '200 users',
    viewCount: 1800,
    createdAt: '5h ago',
    author: mockProfile('u2', 'arjun_patel', 'Arjun Patel', 'AP'),
  }),
  mockPost({
    id: '3',
    type: 'idea',
    title: "Stripe for freelance contracts - why doesn't this exist?",
    excerpt:
      "Every freelancer I know manually drafts contracts in Google Docs. There's a massive gap in the market for a contract-to-payment pipeline.",
    coverUrl: null,
    milestone: null,
    viewCount: 3100,
    createdAt: '1d ago',
    author: mockProfile('u3', 'leo_burns', 'Leo Burns', 'LB'),
  }),
  mockPost({
    id: '4',
    type: 'demo',
    title: 'Real-time voice translation in 40ms using WebRTC',
    excerpt:
      'Browser-native translator that processes audio chunks locally - no round-trip to the server.',
    coverUrl: null,
    milestone: '40ms latency',
    viewCount: 5600,
    createdAt: '2d ago',
    author: mockProfile('u4', 'nadia_k', 'Nadia Kim', 'NK'),
  }),
  mockPost({
    id: '5',
    type: 'journey',
    title: 'From 0 to 1,000 newsletter subscribers in 30 days',
    excerpt:
      'The exact playbook: Twitter threads, referral mechanics, and one viral post that changed everything.',
    coverUrl: null,
    milestone: '1k subscribers',
    viewCount: 2800,
    createdAt: '3d ago',
    author: mockProfile('u5', 'tom_r', 'Tom Rivera', 'TR'),
  }),
  mockPost({
    id: '6',
    type: 'build',
    title: 'How I shipped a SaaS in a weekend using AI pair programming',
    excerpt:
      "Claude + Cursor + Supabase = full MVP in 48 hours. Here's the complete breakdown.",
    coverUrl: null,
    milestone: 'MVP shipped',
    viewCount: 6700,
    createdAt: '4d ago',
    author: mockProfile('u6', 'priya_s', 'Priya Singh', 'PS'),
  }),
  mockPost({
    id: '7',
    type: 'idea',
    title: 'The "boring business" playbook: $50k/mo laundromat empire',
    excerpt:
      'Two founders are building a cash-flowing laundromat chain using automation and remote management.',
    coverUrl: null,
    milestone: null,
    viewCount: 4100,
    createdAt: '5d ago',
    author: mockProfile('u7', 'marcus_w', 'Marcus Webb', 'MW'),
  }),
  mockPost({
    id: '8',
    type: 'demo',
    title: 'CSS-only 3D product viewer - no WebGL',
    excerpt:
      'Pure CSS transforms to create a rotatable 3D product display. Works on every browser, zero dependencies.',
    coverUrl: null,
    milestone: '0 dependencies',
    viewCount: 3400,
    createdAt: '1w ago',
    author: mockProfile('u8', 'sofia_m', 'Sofia Mendez', 'SM'),
  }),
];
