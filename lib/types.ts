export type PostType = 'journey' | 'build' | 'idea' | 'demo';

export type NotificationType =
  | 'post_sparked'
  | 'post_validated'
  | 'post_inthis'
  | 'new_message'
  | 'new_conversation'
  | 'new_ask'
  | 'milestone_reached'
  | 'weekly_digest';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  postId: string | null;
  conversationId: string | null;
  read: boolean;
  createdAt: string;
  actor?: Pick<Profile, 'id' | 'fullName' | 'username' | 'initials' | 'avatarUrl'>;
  post?: Pick<Post, 'id' | 'title'> & { sparkedCount?: number };
}
export type ReactionType = 'sparked' | 'validated' | 'inthis';
export type ConnectStatus = 'open' | 'limited' | 'closed';
export type BuildingStage = 'idea' | 'mvp' | 'launched' | 'scaling';
export type ReportTargetType = 'post' | 'profile';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'misleading'
  | 'unsafe'
  | 'other';

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  initials: string;
  createdAt: string;
  interests: string[];
  onboarded: boolean;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  connectStatus: ConnectStatus;
  buildingStage: BuildingStage | null;
  location: string | null;
}

export interface ReactionCounts {
  sparked: number;
  validated: number;
  inthis: number;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  excerpt: string | null;
  body: string | null;
  coverUrl: string | null;
  milestone: string | null;
  tags: string[];
  viewCount: number;
  createdAt: string;
  author: Profile;
  reactionCounts: ReactionCounts;
  userReactions: ReactionType[];
}

export interface CreatePostPayload {
  title: string;
  type: PostType;
  excerpt: string | null;
  body: string | null;
  milestone: string | null;
  tags: string[];
  coverUrl: string | null;
}

export interface UpdateProfilePayload {
  fullName: string;
  bio: string | null;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  contextPostId: string | null;
  createdAt: string;
  lastMessageAt: string;
  otherParticipant: Pick<Profile, 'id' | 'fullName' | 'username' | 'initials' | 'avatarUrl'>;
  lastMessage: string | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface CreateReportPayload {
  targetType: ReportTargetType;
  postId?: string | null;
  profileId?: string | null;
  reason: ReportReason;
}
