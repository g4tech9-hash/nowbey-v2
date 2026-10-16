import { Icon, type IconName } from "../Icon";
import { REACTIONS, type ReactionKind } from "@/lib/engage-kinds";

/**
 * Option B: reactions render as typed icons, not emoji. The mapping lives with the data
 * (`REACTIONS[kind].icon`), so the presentation layer only has to trust the glyph name.
 */
export function ReactionGlyph({ kind, size = 15 }: { kind: ReactionKind; size?: number }) {
  return <Icon name={REACTIONS[kind].icon as IconName} size={size} />;
}
