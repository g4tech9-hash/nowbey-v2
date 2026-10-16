export function Stars({ value, size = 14 }: { value: number | null | undefined; size?: number }) {
  if (!value) return null;
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex gap-[1px] leading-none text-sun-600" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={i <= value ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}
