/**
 * OPTION B — typed icon set.
 *
 * One component, one stroke language (24px grid, currentColor, round caps),
 * so every icon inherits text colour and scales with the type scale. Nothing
 * in the product renders an emoji as an icon any more.
 *
 *   <Icon name="alert" />
 *   <Icon name="check" size={14} className="text-safe" />
 *   <Icon name="search" title="Search" />   // labelled for screen readers
 *
 * The `name` union is the whole contract: a typo is a typecheck error, not a
 * blank box at runtime.
 */

export type IconName =
  // signals + status
  | "alert"
  | "alert-triangle"
  | "check"
  | "check-circle"
  | "close"
  | "info"
  | "shield"
  | "shield-check"
  | "eye"
  | "eye-off"
  // navigation
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "arrow-up-right"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "chevron-up"
  | "menu"
  | "external-link"
  | "refresh"
  | "search"
  | "filter"
  | "plus"
  | "send"
  // product surfaces
  | "bell"
  | "map-pin"
  | "map"
  | "flag"
  | "video"
  | "camera"
  | "user"
  | "users"
  | "settings"
  | "lock"
  | "mail"
  | "phone"
  | "globe"
  | "clock"
  | "star"
  | "volume"
  | "sparkle"
  | "chart"
  | "list"
  | "grid"
  | "download"
  | "upload"
  | "megaphone"
  // reactions (data kinds rendered as icons)
  | "thumb-up"
  | "heart"
  | "pray"
  | "wow"
  | "sad"
  // incident categories
  | "flood"
  | "storm"
  | "bolt"
  | "droplet"
  | "crime"
  | "road"
  | "marine"
  | "fire"
  | "health"
  | "trash"
  | "event"
  | "notice";

type Props = {
  name: IconName;
  /** Pixel size of the square box. Default 16 — matches inline text. */
  size?: number;
  className?: string;
  /** When given, the icon is exposed to assistive tech with this label. */
  title?: string;
  /** Stroke weight. 1.9 is the house default; 2.4 reads better at 12px and below. */
  strokeWidth?: number;
};

/** Every glyph is drawn on the same 24x24 grid with the same stroke settings. */
const PATHS: Record<IconName, React.ReactNode> = {
  // ---- signals + status ----
  alert: (
    <>
      <path d="M12 3.5 21.5 20H2.5L12 3.5Z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17.2h.01" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M10.3 4.2 2.9 17.6A1.9 1.9 0 0 0 4.6 20.5h14.8a1.9 1.9 0 0 0 1.7-2.9L13.7 4.2a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 16.8h.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  shield: <path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.9 7-5.1 7-9.5V6l-7-3Z" />,
  "shield-check": (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.9 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4l16 16" />
      <path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 4M6.4 8.1A17 17 0 0 0 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 3.6-.7" />
      <path d="M9.6 9.9a3 3 0 0 0 4.3 4.2" />
    </>
  ),

  // ---- navigation ----
  "arrow-left": (
    <>
      <path d="M20 12H4.5" />
      <path d="m10.5 5.5-6 6.5 6 6.5" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M4 12h15.5" />
      <path d="m13.5 5.5 6 6.5-6 6.5" />
    </>
  ),
  "arrow-up": (
    <>
      <path d="M12 20V4.5" />
      <path d="m5.5 10.5 6.5-6 6.5 6" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M8.5 6.5h9v9" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-up": <path d="m6 14.5 6-6 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "external-link": (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 10 14" />
      <path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4.5v4h4" />
      <path d="M4 12.5a8 8 0 0 0 13.7 5.2L20 15.5" />
      <path d="M20 19.5v-4h-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  filter: <path d="M4 6h16l-6.2 7.2V19l-3.6-2v-3.8L4 6Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: (
    <>
      <path d="M21 3.5 10.4 14" />
      <path d="M21 3.5 14.6 21l-4.2-7-7-4.2L21 3.5Z" />
    </>
  ),

  // ---- product surfaces ----
  bell: (
    <>
      <path d="M6.5 16.5V10a5.5 5.5 0 0 1 11 0v6.5l1.8 2.6H4.7l1.8-2.6Z" />
      <path d="M10 21.5h4" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s6.8-6.2 6.8-11A6.8 6.8 0 0 0 5.2 10c0 4.8 6.8 11 6.8 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 3.5 3.5 5.8v14.7L9 18.3l6 2.2 5.5-2.3V3.5L15 5.8 9 3.5Z" />
      <path d="M9 3.5v14.8M15 5.8v14.7" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.8h9.2l-1.1 3 1.1 3H5.5" />
      <path d="M14.7 4.8H20l-1.1 3 1.1 3h-5.3" />
    </>
  ),
  video: (
    <>
      <path d="M3.5 6.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2 16V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m16 10.5 5.5-3v9L16 13.5" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8.5h3l1.6-2.4h7.8L17.5 8.5h3A1.5 1.5 0 0 1 22 10v8a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18v-8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="12" cy="14" r="3.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.4" />
      <path d="M17.6 14.6a6.4 6.4 0 0 1 3.6 5.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.6 7.2l2 1.2M17.4 15.6l2 1.2M4.6 16.8l2-1.2M17.4 8.4l2-1.2" />
    </>
  ),
  lock: (
    <>
      <path d="M5.5 10.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-7a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  mail: (
    <>
      <path d="M3.5 6.5h17a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 16V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m3 8 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M6.2 3.5h2.6l1.6 4-2 1.4a11 11 0 0 0 6.7 6.7l1.4-2 4 1.6v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  star: <path d="m12 3.6 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 10l6-.9L12 3.6Z" />,
  volume: (
    <>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1.5 1.5 0 0 1-1.5-1.5v-2a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M15 9.2a4.4 4.4 0 0 1 0 5.6M17.8 6.8a8 8 0 0 1 0 10.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18 10.3 12.4 5 10.7 10.3 9 12 3.5Z" />
      <path d="M18.6 15.6l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M6.5 20.5v-6M11 20.5V7.5M15.5 20.5v-9M20 20.5V4.5" />
    </>
  ),
  list: <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />,
  grid: (
    <>
      <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l4.5 3.5V5.5L7 9H5.5A1.5 1.5 0 0 0 4 10.5Z" />
      <path d="M16.5 9.2a4.5 4.5 0 0 1 0 5.6M19.4 6.8a8 8 0 0 1 0 10.4" />
    </>
  ),

  // ---- reactions ----
  "thumb-up": (
    <>
      <path d="M7 20.5V10l4.2-7a1.6 1.6 0 0 1 2.6 1.8L12.6 9h5.3a2 2 0 0 1 2 2.4l-1.4 6.6a2 2 0 0 1-2 1.5H7Z" />
      <path d="M7 10.5H4.5V20.5H7" />
    </>
  ),
  heart: <path d="M12 20.2S3.8 15.4 3.8 9.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.2 2.3c0 5.8-8.2 10.6-8.2 10.6Z" />,
  pray: (
    <>
      <path d="M8 20.5v-6.2L4.6 9.4a1.8 1.8 0 0 1 2.6-2.4L12 10.6l4.8-3.6a1.8 1.8 0 0 1 2.6 2.4L16 14.3v6.2" />
      <path d="M9.4 6.4 12 3.5l2.6 2.9" />
    </>
  ),
  wow: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="10" r="1.1" />
      <circle cx="15" cy="10" r="1.1" />
      <ellipse cx="12" cy="15.4" rx="1.9" ry="2.3" />
    </>
  ),
  sad: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.6 16.2a5 5 0 0 1 6.8 0" />
      <path d="M9.2 9.6h.01M14.8 9.6h.01" />
    </>
  ),

  // ---- incident categories ----
  flood: (
    <>
      <path d="M3.5 15.5c1.8 0 1.8 1.4 3.6 1.4s1.8-1.4 3.6-1.4 1.8 1.4 3.6 1.4 1.8-1.4 3.6-1.4M3.5 19.8c1.8 0 1.8 1.4 3.6 1.4s1.8-1.4 3.6-1.4 1.8 1.4 3.6 1.4 1.8-1.4 3.6-1.4" />
      <path d="M8.5 3.5 12 8l3.5-4.5" />
    </>
  ),
  storm: (
    <>
      <path d="M6.5 14.5a4.5 4.5 0 0 1 .6-9 5.5 5.5 0 0 1 10.4 1.4 3.9 3.9 0 0 1-.5 7.6" />
      <path d="m12.5 11-2.6 4h3l-2.4 4.5" />
    </>
  ),
  bolt: <path d="M13.5 2.5 5 13.5h5l-1.5 8L18.5 10h-5l1.5-7.5Z" />,
  droplet: <path d="M12 3.2c3.4 4 6 7 6 10.2a6 6 0 0 1-12 0c0-3.2 2.6-6.2 6-10.2Z" />,
  crime: (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.9 7-5.1 7-9.5V6l-7-3Z" />
      <path d="M12 8.6v4.2M12 15.6h.01" />
    </>
  ),
  road: (
    <>
      <path d="M5.5 21 8 3M16 21l2.5-18" />
      <path d="M12 4.5v3M12 10.5v3M12 16.5v3" />
    </>
  ),
  marine: (
    <>
      <path d="M3.5 17.5c1.8 0 1.8 1.2 3.6 1.2s1.8-1.2 3.6-1.2 1.8 1.2 3.6 1.2 1.8-1.2 3.6-1.2" />
      <path d="M5.5 13 12 4l6.5 9" />
    </>
  ),
  fire: (
    <>
      <path d="M12 21c3.3 0 6-2.5 6-5.8 0-4.4-4.4-6.2-4.4-9.4C11.2 6.9 8.6 8.4 8 11c-1.2-.6-1.7-2-1.6-3.4C5.2 9 6 10.6 6 12.4 6 18 8.7 21 12 21Z" />
      <path d="M12 21c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3Z" />
    </>
  ),
  health: (
    <>
      <path d="M9.5 3.5h5v5.5H20v5h-5.5v5.5h-5V14H4v-5h5.5V3.5Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.5 7l.9 13.2h9.2L17.5 7" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
  event: (
    <>
      <path d="M4.5 6.5h15A1.5 1.5 0 0 1 21 8v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M3 11h18M8.5 3.5v4M15.5 3.5v4" />
      <path d="M8 15h3v3H8z" />
    </>
  ),
  notice: (
    <>
      <path d="M4.5 5.5h15v10h-9l-6 4v-14Z" />
      <path d="M8.5 8.5h7M8.5 12h4.5" />
    </>
  ),
};

export function Icon({ name, size = 16, className, title, strokeWidth = 1.9 }: Props) {
  const labelled = typeof title === "string" && title.length > 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(labelled ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: false })}
    >
      {labelled ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
