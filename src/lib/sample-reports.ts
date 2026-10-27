/**
 * SAMPLE NEIGHBOUR REPORTS
 * ---------------------------------------------------------------------------
 * The real feed items come from the reports table. These stand in for it so the
 * feed can be rendered, ranked and tested without a database: the shape is the
 * one the feed already uses (category, island, createdAt), plus `sample: true`
 * so the UI never presents them as real neighbour reports.
 */

export interface FeedReport {
  kind: 'report';
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  island: string;
  location: string;
  createdAt: string;
  ageLabel: string;
  author: string;
  confirmations: number;
  status: 'open' | 'confirmed' | 'cleared';
  sample: true;
}

const LABELS: Record<string, string> = {
  flooding: 'Flooding',
  water: 'Water',
  power: 'Power',
  road: 'Road',
  safety: 'Safety',
  marine: 'Marine',
  sanitation: 'Sanitation',
  storm: 'Storm',
  community: 'Community',
  notice: 'Notice',
};

const MINUTES = 60_000;

function ago(now: Date, minutes: number) {
  return new Date(now.getTime() - minutes * MINUTES).toISOString();
}

function ageLabel(now: Date, iso: string) {
  const mins = Math.round((now.getTime() - Date.parse(iso)) / MINUTES);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

const SEEDS: Array<Omit<FeedReport, 'kind' | 'sample' | 'createdAt' | 'ageLabel' | 'categoryLabel'> & { minutes: number }> = [
  {
    id: 'sample-1',
    title: 'Water across the lane on Bay Street',
    summary: 'Standing water past the kerb outside the shops. Passable on foot, not in a low car.',
    category: 'flooding',
    island: 'New Providence',
    location: 'Bay Street · Nassau',
    author: 'Neighbour',
    confirmations: 4,
    status: 'confirmed',
    minutes: 14,
  },
  {
    id: 'sample-2',
    title: 'Traffic lights out at Shirley and Carmichael',
    summary: 'Both signals dark since about half past eight. Police not on scene yet.',
    category: 'road',
    island: 'New Providence',
    location: 'Shirley Street · Nassau',
    author: 'Anonymous',
    confirmations: 2,
    status: 'open',
    minutes: 38,
  },
  {
    id: 'sample-3',
    title: 'BPL crew working on the pole on Kemp Road',
    summary: 'Truck and crew on site, lane partly blocked. Power flickering on the street.',
    category: 'power',
    island: 'New Providence',
    location: 'Kemp Road · Nassau',
    author: 'Neighbour',
    confirmations: 3,
    status: 'open',
    minutes: 96,
  },
  {
    id: 'sample-4',
    title: 'Trench open on Ross Corner, no barrier',
    summary: 'Roughly knee deep and unmarked after the crews left yesterday. Reported to Works.',
    category: 'road',
    island: 'New Providence',
    location: 'Ross Corner · Nassau',
    author: 'Neighbour',
    confirmations: 6,
    status: 'confirmed',
    minutes: 190,
  },
  {
    id: 'sample-5',
    title: 'Garbage not collected on three streets in Freeport',
    summary: 'Bins out since Monday on Coral Road and two side streets. Others seeing the same?',
    category: 'sanitation',
    island: 'Grand Bahama',
    location: 'Coral Road · Freeport',
    author: 'Anonymous',
    confirmations: 1,
    status: 'open',
    minutes: 280,
  },
  {
    id: 'sample-6',
    title: 'Swell breaking over the dock at George Town',
    summary: 'Boats moved off the dock this morning. Careful on the ramp at high water.',
    category: 'marine',
    island: 'Exuma',
    location: 'George Town · Exuma',
    author: 'Neighbour',
    confirmations: 5,
    status: 'confirmed',
    minutes: 430,
  },
  {
    id: 'sample-7',
    title: 'Bush fire smoke across the Eastern Road',
    summary: 'Heavy smoke drifting over the road, visibility poor for about a mile.',
    category: 'safety',
    island: 'New Providence',
    location: 'Eastern Road · Nassau',
    author: 'Neighbour',
    confirmations: 2,
    status: 'open',
    minutes: 620,
  },
  {
    id: 'sample-8',
    title: 'Street light fixed on Soldier Road',
    summary: 'The dark stretch near the junction is lit again. Marking this cleared.',
    category: 'power',
    island: 'New Providence',
    location: 'Soldier Road · Nassau',
    author: 'Neighbour',
    confirmations: 3,
    status: 'cleared',
    minutes: 900,
  },
];

export function sampleReports(now: Date = new Date()): FeedReport[] {
  return SEEDS.map(({ minutes, ...seed }) => {
    const createdAt = ago(now, minutes);
    return {
      ...seed,
      kind: 'report' as const,
      categoryLabel: LABELS[seed.category] || 'Notice',
      createdAt,
      ageLabel: ageLabel(now, createdAt),
      sample: true as const,
    };
  });
}
