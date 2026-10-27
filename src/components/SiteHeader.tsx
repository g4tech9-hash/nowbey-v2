import Link from 'next/link';

const TABS = [
  { href: '/feed', label: 'Feed' },
  { href: '/wire', label: 'Wire' },
  { href: '/map', label: 'Map' },
  { href: '/alerts', label: 'Alerts' },
];

export function SiteHeader({ active }: { active: 'feed' | 'wire' | 'map' | 'alerts' | 'home' }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="NowBey home">
        <span className="brand-mark" aria-hidden="true">
          N
        </span>
        <span>
          <span className="brand-name">NowBey</span>
          <span className="brand-tag">Stay Safe, Bahamas</span>
        </span>
      </Link>
      <nav className="tabs" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="tab"
            data-active={active === tab.label.toLowerCase()}
          >
            {tab.label}
          </Link>
        ))}
        <Link href="/report" className="cta">
          Report a hazard
        </Link>
      </nav>
    </header>
  );
}
