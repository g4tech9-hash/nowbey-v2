/**
 * Resolves a class's minimum height from a stylesheet, so the phone audit can see sizes that live in CSS
 * rather than in inline `min-h-[…]` utilities. Split into its own module so it can be unit-tested without a
 * running server (tests/min-heights.test.mjs).
 *
 * Phone range assumed: 320–412px. Enclosing `@media (min-width: 1024px)` and `@media (max-width: 639.98px)`
 * blocks are honoured: a desktop-only 48px rule must not excuse a 32px phone control, and a phone-only rule
 * must count.
 */
export function classMinHeights(css) {
  const map = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack = [];
  let buf = "";
  let i = 0;

  // True when every enclosing at-rule can apply at 320–412px. A desktop-only `min-width: 1024px` block must
  // not excuse a 32px phone control, and a keyframes block is not a selector at all.
  const applies = () =>
    stack.every((cond) => {
      if (/@(keyframes|font-face|page)/.test(cond)) return false;
      const max = /max-width\s*:\s*([\d.]+)px/.exec(cond);
      const min = /min-width\s*:\s*([\d.]+)px/.exec(cond);
      if (max) return Number(max[1]) >= 320;
      if (min) return Number(min[1]) <= 412;
      return true;
    });

  while (i < clean.length) {
    const ch = clean[i];
    if (ch === "{") {
      const selector = buf.trim();
      buf = "";
      if (selector.startsWith("@")) {
        stack.push(selector);
        i += 1;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      for (; j < clean.length; j += 1) {
        if (clean[j] === "{") depth += 1;
        else if (clean[j] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const body = clean.slice(i + 1, j);
      if (applies()) {
        const min = /min-height\s*:\s*([\d.]+)px/.exec(body);
        if (min) {
          for (const part of selector.split(",")) {
            const m = /^\.((?:[\w-]|\\.)+)/.exec(part.trim());
            if (!m) continue;
            const name = m[1].replace(/\\/g, "");
            map.set(name, Math.max(map.get(name) ?? 0, Number(min[1])));
          }
        }
      }
      i = j + 1;
      continue;
    }
    if (ch === "}") {
      stack.pop();
      buf = "";
      i += 1;
      continue;
    }
    if (ch === ";") {
      buf = "";
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  return map;
}

export default classMinHeights;
