/**
 * The landing page's icon set.
 *
 * Zero dependencies: no lucide, no heroicons, no icon font. Every glyph is a hand-written
 * 24x24 stroke path kept in one typed dictionary, so a missing icon is a compile error
 * instead of a blank square at 2am.
 *
 * Rules for the shapes below:
 *   - 24x24 view box, 1.5px stroke, round caps and joins, no fills;
 *   - the stroke is `currentColor`, so an icon inherits the colour of the text it sits in;
 *   - paths are drawn on a 2px grid so the set looks like one family;
 *   - `title` makes the icon an image with an accessible name; without it the icon is
 *     decorative and is hidden from assistive technology.
 *
 * Usage:
 *   <Icon name="map-pin" className="h-5 w-5 text-brand-300" />
 *   <Icon name="bell" title="Alerts" strokeWidth={2} />
 */

/** One or more path commands. Every glyph is a list of them. */
export type IconShape = readonly string[];

/** The glyph dictionary. Adding a glyph here is all it takes to use it. */
export const ICONS = {
  /* ---- Safety map --------------------------------------------------------- */
  "map-pin": ["M12 21c4.2-4.7 6.5-8.1 6.5-10.8A6.5 6.5 0 0 0 5.5 10.2C5.5 12.9 7.8 16.3 12 21Z", "M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"],
  layers: ["M12 3 3 8l9 5 9-5-9-5Z", "M3 13l9 5 9-5", "M3 17.5 12 22l9-4.5"],
  compass: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6 15.6 8.4Z"],
  navigation: ["M4 11.5 20.5 4l-7.5 16.5-1.8-7.2L4 11.5Z"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.4 9.2h17.2", "M3.4 14.8h17.2", "M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9Z"],
  anchor: ["M5 13.2a7 7 0 0 0 14 0", "M3.2 13.2h3.6", "M17.2 13.2h3.6", "M12 6.4V21", "M12 3.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"],
  waves: ["M2.8 8.6c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6", "M2.8 15.4c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6"],

  /* ---- Hazards ------------------------------------------------------------ */
  "triangle-alert": ["M12 4 2.9 20h18.2L12 4Z", "M12 10.2v4.2", "M12 17.2v.1"],
  bolt: ["M13.2 2.5 4.8 13.4h5.6L10 21.5l8.6-11.1h-5.6l.2-7.9Z"],
  "cloud-lightning": ["M7.2 18.2a4.4 4.4 0 0 1-.4-8.8 6 6 0 0 1 11.4.4 4.2 4.2 0 0 1-1 8.4H7.2Z", "M13.4 12.2l-2.8 4.4h2.2l-1 3.2 3.6-4.6h-2.2l.2-3Z"],
  droplet: ["M12 3.4S6.2 10 6.2 14a5.8 5.8 0 0 0 11.6 0C17.8 10 12 3.4 12 3.4Z"],
  flame: ["M12 3c3 3.3 5 5.7 5 8.8a5 5 0 0 1-10 0c0-1.9 1-3.2 2-4.3.2 1.6 1 2.6 1.9 2.6 1.5 0 1.3-3.8 1.1-7.1Z"],
  car: ["M4.4 16.6h15.2", "M5.6 16.6 7 11.2l1.6-3.6a2 2 0 0 1 1.8-1.1h3.2a2 2 0 0 1 1.8 1.1L17 11.2l1.4 5.4", "M6.6 16.6v2.2h2.4v-2.2", "M15 16.6v2.2h2.4v-2.2", "M7.2 11.2h9.6"],
  heart: ["M12 20.2s-7.2-4.3-7.2-9.4A4.2 4.2 0 0 1 12 7.9a4.2 4.2 0 0 1 7.2 2.9c0 5.1-7.2 9.4-7.2 9.4Z"],
  wrench: ["M20.3 5.4a5 5 0 0 1-6.5 6.5l-8.2 8.2a2.2 2.2 0 0 1-3.1-3.1l8.2-8.2a5 5 0 0 1 6.5-6.5l-3.1 3.2 1.2 3.4 3.4 1.2 3.1-3.2Z"],
  trash: ["M4.2 6.8h15.6", "M9.4 6.8V4.4h5.2v2.4", "M6.6 6.8 7.6 20h8.8l1-13.2", "M10.2 10.4v6", "M13.8 10.4v6"],

  /* ---- Alerts ------------------------------------------------------------- */
  bell: ["M18.2 9.6a6.2 6.2 0 1 0-12.4 0c0 5.2-2.1 6.6-2.1 6.6h16.6s-2.1-1.4-2.1-6.6Z", "M10.3 19a2 2 0 0 0 3.4 0"],
  megaphone: ["M3.8 10.2v3.6a1 1 0 0 0 1 1h3.4l6.2 4V5.2l-6.2 4H4.8a1 1 0 0 0-1 1Z", "M17.8 9.4a4 4 0 0 1 0 5.2", "M6.2 14.8l1.4 5h2.6l-1-5"],
  eye: ["M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12Z", "M12 15.1a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z"],
  "check-circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.2 12.3l2.7 2.7 5-5.2"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 11.2v5", "M12 7.7v.1"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.4V12l3 1.9"],

  /* ---- Wire & community --------------------------------------------------- */
  newspaper: ["M4 5.2h13v13.3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.2Z", "M17 8.4h3v10.1a1.5 1.5 0 0 1-3 0V8.4Z", "M7 8.8h7", "M7 12.2h7", "M7 15.6h4.4"],
  radio: ["M4.6 18.6a10 10 0 0 1 0-14.2", "M7.6 15.6a6 6 0 0 1 0-8.2", "M16.4 7.4a6 6 0 0 1 0 8.2", "M19.4 4.4a10 10 0 0 1 0 14.2", "M12 13.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z"],
  users: ["M15.8 19.4v-1.6a4 4 0 0 0-4-4H5.8a4 4 0 0 0-4 4v1.6", "M8.8 9.8a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z", "M22 19.4v-1.6a4 4 0 0 0-3-3.9", "M16 2.6a4 4 0 0 1 0 7.7"],
  "message-circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.4 12h.1", "M12 12h.1", "M15.6 12h.1"],
  activity: ["M2.8 12.4h4l2.8-6.8 3.6 12.8 2.6-6h5.4"],
  list: ["M8.4 6.2h12", "M8.4 12h12", "M8.4 17.8h12", "M4 6.2h.1", "M4 12h.1", "M4 17.8h.1"],
  star: ["M12 3.6 14.5 9l5.9.9-4.3 4.1 1 5.9-5.1-2.7-5.2 2.7 1-5.9L3.5 9.9 9.4 9 12 3.6Z"],

  /* ---- Trust, privacy, money ---------------------------------------------- */
  "shield-check": ["M12 3.2 5 6v5.4c0 4.2 2.9 8.1 7 9.4 4.1-1.3 7-5.2 7-9.4V6l-7-2.8Z", "M9 12.1l2.2 2.2 4-4.4"],
  lock: ["M6.2 10.6h11.6v9.6H6.2v-9.6Z", "M8.8 10.6V7.8a3.2 3.2 0 0 1 6.4 0v2.8", "M12 14.4v2.2"],
  "credit-card": ["M3 5.6h18v12.8H3V5.6Z", "M3 10.2h18", "M6.6 14.4h3.6"],
  sparkles: ["M10.4 3 12 7.2l4.2 1.6L12 10.4 10.4 14.6 8.8 10.4 4.6 8.8 8.8 7.2 10.4 3Z", "M17.6 14.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"],

  /* ---- Interface ---------------------------------------------------------- */
  search: ["M11 18.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z", "M16.3 16.3 20.8 20.8"],
  filter: ["M3.2 5.2h17.6l-6.9 8.1v5.6l-3.8 1.9v-7.5L3.2 5.2Z"],
  check: ["M4.8 12.6 9.6 17.4 19.2 6.8"],
  x: ["M6.2 6.2 17.8 17.8", "M17.8 6.2 6.2 17.8"],
  menu: ["M4 7.2h16", "M4 12h16", "M4 16.8h16"],
  "arrow-right": ["M4 12h15.4", "M13.4 6l6 6-6 6"],
  "arrow-up-right": ["M7 17 17 7", "M8.4 7H17v8.6"],
  "chevron-down": ["M6.4 9.6 12 15.2l5.6-5.6"],
  home: ["M3.8 10.6 12 3.8l8.2 6.8V19a1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1v-8.4Z", "M9.4 20v-5.8h5.2V20"],
  smartphone: ["M7.2 2.8h9.6v18.4H7.2V2.8Z", "M10.8 18.4h2.4"],
  mail: ["M3 6.4h18v11.2H3V6.4Z", "M3.4 7 12 13l8.6-6"],
  terminal: ["M4 5h16v14H4V5Z", "M8 10.2 5.8 12 8 13.8", "M12.4 14.2h4"],
  "file-text": ["M6 3.2h7l5 5v12.6H6V3.2Z", "M13 3.4v4.8h4.8", "M9 12.6h6", "M9 16.4h4"],
  camera: ["M3.4 8.4h3.4l1.6-2.6h6.8l1.6 2.6h3.8v10.2H3.4V8.4Z", "M12 16.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"],
} as const satisfies Record<string, IconShape>;

/** Every icon name the set understands. */
export type IconName = keyof typeof ICONS;

/** The icon names as a runtime array, for docs and tests. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export type IconProps = {
  /** Which glyph to draw. */
  name: IconName;
  /** Any class list; the icon inherits `currentColor`. */
  className?: string;
  /** Stroke weight in the 24x24 view box. 1.5 is the house style. */
  strokeWidth?: number;
  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  title?: string;
};

/**
 * Draws one icon. Everything is `currentColor` and `fill="none"`, so an icon takes the
 * colour of the text around it and never needs a colour prop.
 */
export function Icon({ name, className, strokeWidth = 1.5, title }: IconProps) {
  const shapes = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {shapes.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default Icon;
