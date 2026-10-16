/* Plain constants shared by the server and the browser. No database code in here. */

/** The reactions people can leave. One per person per item, and they can change it. */
export const REACTIONS = {
  like: { emoji: "👍", icon: "thumb-up", label: "Like" },
  love: { emoji: "❤️", icon: "heart", label: "Love" },
  thanks: { emoji: "🙏", icon: "pray", label: "Thanks" },
  wow: { emoji: "😮", icon: "wow", label: "Wow" },
  sad: { emoji: "😢", icon: "sad", label: "Sad" },
} as const;

export type ReactionKind = keyof typeof REACTIONS;
export const REACTION_KEYS = Object.keys(REACTIONS) as ReactionKind[];

export function isReactionKind(v: unknown): v is ReactionKind {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(REACTIONS, v);
}

/** What can be reacted to and commented on: Island Life posts (events included), map pins and news stories. */
export const TARGET_TYPES = ["post", "incident", "news"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export function isTargetType(v: unknown): v is TargetType {
  return typeof v === "string" && (TARGET_TYPES as readonly string[]).includes(v);
}

export const COMMENT_MAX = 500;

export type ReactionCounts = Partial<Record<ReactionKind, number>>;

export type Engagement = {
  counts: ReactionCounts;
  total: number;
  /** The reaction the signed-in member left, if any. */
  mine: ReactionKind | null;
  /** Published comments, replies included. */
  comments: number;
};

export const NO_ENGAGEMENT: Engagement = { counts: {}, total: 0, mine: null, comments: 0 };

/** The most-used reactions on an item, most popular first. */
export function topReactions(counts: ReactionCounts, n = 3): ReactionKind[] {
  return REACTION_KEYS.filter((k) => (counts[k] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, n);
}

export function targetPath(type: TargetType, id: string): string {
  return type === "post" ? `/life/${id}` : type === "incident" ? `/incident/${id}` : `/wire/${id}`;
}
