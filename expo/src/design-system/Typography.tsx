/**
 * NowBey Typography — strict sans-serif system
 * Rebuild from web: Bricolage Grotesque (display) + Inter (UI/body) + JetBrains Mono (coords)
 * On mobile: system sans-serif with matching weights/sizes, high contrast ratios maintained
 *
 * Weights: bold headers (800), medium/semi-bold pills (700-750), regular body (400-500)
 */
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { color, type as typeScale, useTheme } from "../theme";

// Fluid scale — mirrors --pulse-text-* clamp values, flattened to max for mobile
const sizes = {
  "2xs": 10.5, // --pulse-text-2xs
  xs: 11.5, // --pulse-text-xs
  sm: 12.5, // --pulse-text-sm (pill labels)
  base: 15, // --pulse-text-base (body)
  lg: 17, // --pulse-text-lg
  xl: 20, // --pulse-text-xl
  "2xl": 24, // --pulse-text-2xl
  "3xl": 30, // --pulse-text-3xl
  display: 36, // --pulse-text-display
} as const;

type Variant = keyof typeof styles;

const styles: Record<string, TextStyle> = {
  // Display — app title “NowBey” (Bricolage, bold, tight tracking)
  display: {
    fontSize: sizes.display,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 40,
    color: color.text,
  },
  h1: {
    fontSize: sizes["2xl"],
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 28,
    color: color.text,
  },
  h2: {
    fontSize: sizes.xl,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 24,
    color: color.text,
  },
  h3: {
    fontSize: sizes.base,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
    color: color.text,
  },
  body: {
    fontSize: sizes.base,
    fontWeight: "500",
    lineHeight: 22,
    color: color.text,
  },
  muted: {
    fontSize: sizes.sm,
    fontWeight: "400",
    lineHeight: 18,
    color: color.muted,
  },
  subtle: {
    fontSize: sizes.xs,
    fontWeight: "500",
    lineHeight: 16,
    color: color.subtle,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  label: {
    fontSize: sizes.xs,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    lineHeight: 14,
    color: color.tideLight,
  } as TextStyle,
  mono: {
    fontSize: sizes.xs,
    fontWeight: "500",
    lineHeight: 16,
    color: color.subtle,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  pill: {
    fontSize: sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 14,
    color: color.muted,
  },
  pillActive: {
    fontSize: sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 14,
    color: color.text,
  },
  // Accent — use for “Bey” in NowBey wordmark
  accent: {
    color: color.tideLight,
  },
};

type TypographyProps = TextProps & {
  variant?: Variant;
  color?: string;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  children: React.ReactNode;
};

export function Text({ variant = "body", color: override, align, style, children, ...rest }: TypographyProps) {
  useTheme(); // repaint on scheme change
  const base = styles[variant] ?? styles.body;
  return (
    <RNText
      {...rest}
      style={[
        base,
        // Resolve live colors at render time (theme-aware)
        variant === "display" || variant === "h1" || variant === "h2" || variant === "h3"
          ? { color: color.text }
          : variant === "muted"
            ? { color: color.muted }
            : variant === "subtle" || variant === "mono"
              ? { color: color.subtle }
              : variant === "label"
                ? { color: color.tideLight }
                : null,
        override ? { color: override } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

// Convenience exports — atomic typography matching web hierarchy
export const Display = (p: Omit<TypographyProps, "variant">) => <Text variant="display" {...p} />;
export const H1 = (p: Omit<TypographyProps, "variant">) => <Text variant="h1" {...p} />;
export const H2 = (p: Omit<TypographyProps, "variant">) => <Text variant="h2" {...p} />;
export const H3 = (p: Omit<TypographyProps, "variant">) => <Text variant="h3" {...p} />;
export const Body = (p: Omit<TypographyProps, "variant">) => <Text variant="body" {...p} />;
export const Muted = (p: Omit<TypographyProps, "variant">) => <Text variant="muted" {...p} />;
export const Subtle = (p: Omit<TypographyProps, "variant">) => <Text variant="subtle" {...p} />;
export const Label = (p: Omit<TypographyProps, "variant">) => <Text variant="label" {...p} />;
export const Mono = (p: Omit<TypographyProps, "variant">) => <Text variant="mono" {...p} />;

// Legacy t.* compat — so existing screens keep compiling
export const tLegacy = {
  h1: styles.h1,
  h2: styles.h2,
  h3: styles.h3,
  body: styles.body,
  muted: styles.muted,
  subtle: styles.subtle,
  label: styles.label,
  error: { color: color.conch, fontSize: 12.5, lineHeight: 17 } as TextStyle,
  ok: { color: color.ok500, fontSize: 12.5, lineHeight: 17 } as TextStyle,
};

export const fontSizes = sizes;
