import { Icon } from "../Icon";

export function Stars({ value, size = 14 }: { value: number | null | undefined; size?: number }) {
  if (!value) return null;
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex items-center gap-[1px] leading-none text-amber">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} className={i <= value ? "" : "opacity-25"} />
      ))}
    </span>
  );
}
