export type PostType = 'journey' | 'build' | 'idea' | 'demo';
export type BuildingStage = 'idea' | 'mvp' | 'launched' | 'scaling';
export type ConnectStatus = 'open' | 'limited' | 'closed';
export type StudentStatus =
  | 'high_school'
  | 'undergrad'
  | 'grad'
  | 'recently_graduated'
  | 'gap_year'
  | 'dropped_out';
export type ReactionType = 'sparked' | 'validated' | 'inthis';

export type PublicProfile = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  connectStatus: ConnectStatus;
  buildingStage: BuildingStage | null;
  interests: string[];
  school: string | null;
  major: string | null;
  studentStatus: StudentStatus | null;
  currentProject: string | null;
  accelerator: string | null;
  eduEmailVerified: boolean;
  createdAt: string;
};

export type PublicPost = {
  id: string;
  slug: string;
  type: PostType;
  title: string;
  excerpt: string | null;
  body: string | null;
  coverUrl: string | null;
  milestone: string | null;
  tags: string[];
  viewCount: number;
  sparkedCount: number;
  validatedCount: number;
  inthisCount: number;
  createdAt: string;
  author: PublicProfile;
};

export type ConversationSummary = {
  id: string;
  participantIds: string[];
  contextPost: {
    id: string;
    title: string;
    slug: string;
  } | null;
  otherParticipant: PublicProfile;
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  createdAt: string;
  lastMessageAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type TopicSummary = {
  tag: string;
  count: number;
};

export type SchoolSummary = {
  school: string;
  count: number;
};
