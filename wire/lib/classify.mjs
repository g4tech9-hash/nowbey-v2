/**
 * CATEGORY + CIVIC CLASSIFIER
 * ---------------------------------------------------------------------------
 * The live wire currently labels almost everything "Notice" unless it happens
 * to contain an obvious word. That is why a sailing regatta result and a
 * Bollywood brunch sat under Notice while a road-closure story was the only
 * "Road" item on the whole wire.
 *
 * This is a weighted phrase matcher with two independent outputs:
 *
 *   category  — which of the twelve app categories the story belongs to
 *   civic     — 0..1, how much the story is service information a neighbour
 *               can act on (road closed, water off, BPL out, ferry cancelled)
 *
 * `civic` is the part that matters for the feed: it lets the app promote
 * "road closure / water interruption / official notice" items into the main
 * feed without hard-coding a category allowlist that goes stale.
 */

/** Weights are tuned so a specific civic phrase beats a generic news word. */
const RULES = [
  // ---- road ---------------------------------------------------------------
  {
    category: 'road',
    weight: 10,
    terms: [
      'road closure',
      'road closures',
      'road closed',
      'closed to traffic',
      'street closure',
      'lane closure',
      'lane closures',
      'traffic diversion',
      'traffic diversions',
      'traffic will be diverted',
      'diverted',
      'diversion',
      'road works',
      'roadwork',
      'roadworks',
      'resurfacing',
      'pothole',
      'potholes',
      'one lane',
      'single lane',
      'cessation of traffic',
      'new providence road',
    ],
  },
  {
    category: 'road',
    weight: 4,
    terms: ['traffic', 'highway', 'junction', 'roundabout', 'bypass', 'motorist', 'motorists', 'drive'],
  },

  // ---- water --------------------------------------------------------------
  {
    category: 'water',
    weight: 10,
    terms: [
      'water interruption',
      'water interruptions',
      'water supply',
      'no water',
      'boil water',
      'water pressure',
      'water rationing',
      'water trucking',
      'wsc',
      'water and sewerage',
      'sewerage',
      'leak repair',
      'water main',
      'non potable',
    ],
  },
  { category: 'water', weight: 4, terms: ['water'] },

  // ---- power --------------------------------------------------------------
  {
    category: 'power',
    weight: 10,
    terms: [
      'power outage',
      'power outages',
      'load shedding',
      'loadshedding',
      'blackout',
      'no power',
      'electricity supply',
      'transmission and distribution',
      'feeder',
      'bpl',
      'bahamas power and light',
      'power restoration',
      'restore power',
    ],
  },
  { category: 'power', weight: 5, terms: ['electricity', 'utility bill', 'fuel surcharge'] },

  // ---- flooding -----------------------------------------------------------
  {
    category: 'flooding',
    weight: 10,
    terms: [
      'flooding',
      'flooded',
      'flood',
      'flood water',
      'flash flood',
      'low lying',
      'drainage',
      'storm surge',
      'waterlogged',
      'impassable',
    ],
  },

  // ---- storm --------------------------------------------------------------
  {
    category: 'storm',
    weight: 10,
    terms: [
      'small craft warning',
      'small craft advisory',
      'weather warning',
      'flood warning',
      'hurricane warning',
      'tropical storm warning',
      'storm warning',
      'severe weather',
      'met office',
      'meteorological',
      'depression',
      'tropical storm',
      'hurricane',
      'tropical wave',
      'nema',
      'evacuation order',
      'all clear',
      'storm watch',
    ],
  },

  // ---- marine -------------------------------------------------------------
  {
    category: 'marine',
    weight: 9,
    terms: [
      'ferry',
      'mailboat',
      'mail boat',
      'sea conditions',
      'swell',
      'marine warning',
      'boating',
      'harbour master',
      'port authority',
      'cruise call',
      'cargo ship',
      'sailing',
      'regatta',
      'sunfish',
      'yachting',
      'vessel',
    ],
  },

  // ---- sanitation ---------------------------------------------------------
  {
    category: 'sanitation',
    weight: 9,
    terms: [
      'garbage collection',
      'garbage',
      'trash',
      'sanitation',
      'waste collection',
      'refuse',
      'dump site',
      'landfill',
      'recycling',
      'public dump',
      'debris removal',
    ],
  },

  // ---- health -------------------------------------------------------------
  {
    category: 'health',
    weight: 8,
    terms: [
      'dengue',
      'health alert',
      'outbreak',
      'clinic',
      'hospital',
      'vaccine',
      'vaccination',
      'ministry of health',
      'public health',
      'quarantine',
      'disease',
      'vector control',
      'food recall',
      'covid',
    ],
  },

  // ---- fire ---------------------------------------------------------------
  {
    category: 'fire',
    weight: 9,
    terms: ['house fire', 'bush fire', 'brush fire', 'fire service', 'blaze', 'arson', 'burning', 'firefighters'],
  },

  // ---- safety -------------------------------------------------------------
  {
    category: 'safety',
    weight: 7,
    terms: [
      'police',
      'rbpf',
      'royal bahamas police force',
      'advisory',
      'shooting',
      'stabbed',
      'murder',
      'homicide',
      'robbery',
      'armed',
      'arrested',
      'charged',
      'court',
      'retrial',
      'appeal',
      'conviction',
      'missing',
      'wanted',
      'curfew',
      'fraud',
      'reckless driving',
      'road fatality',
      'killed',
    ],
  },
  {
    category: 'safety',
    weight: 9,
    terms: ['caution', 'avoid the area', 'roadblock', 'road block', 'checkpoint', 'warning issued'],
  },

  // ---- accident -----------------------------------------------------------
  {
    category: 'accident',
    weight: 9,
    terms: ['car accident', 'vehicle collision', 'collision', 'crash', 'multi vehicle', 'hit and run', 'injured in'],
  },

  // ---- community ----------------------------------------------------------
  {
    category: 'community',
    weight: 6,
    terms: [
      'festival',
      'carnival',
      'juneteenth',
      'regatta results',
      'championship',
      'junior national',
      'trophy',
      'concert',
      'expo',
      'fair',
      'fundraiser',
      'church',
      'school',
      'graduation',
      'award',
      'brunch',
      'culinary',
      'art fair',
      'parade',
      'clean up',
      'cleanup',
      'volunteers',
      'neighbours',
      'neighborhood',
      'sports',
      'coach',
      'athlete',
      'team',
      'junior',
    ],
  },

  // ---- notice -------------------------------------------------------------
  {
    category: 'notice',
    weight: 5,
    terms: [
      'notice',
      'public notice',
      'notice to the public',
      'announcement',
      'announced',
      'ministry of works',
      'ministry',
      'government',
      'cabinet',
      'parliament',
      'senate',
      'member of parliament',
      'mp',
      'fnm',
      'plp',
      'politician',
      'politic',
      'election',
      'municipal',
      'council',
      'department of',
      'authority',
      'commission',
      'schedule',
      'scheduled',
      'resume',
      'resumes',
      'postponed',
      'cancelled',
      'canceled',
      'suspended',
      'reopened',
      'reopens',
      'office closed',
      'closed',
      'registration',
      'deadline',
      'fee',
      'tariff',
      'budget',
    ],
  },
];

/** Phrases that make an item actionable service information. */
const ACTIONABLE = [
  'load shedding',
  'shedding',
  'boil water notice',
  'boil water',
  'notice',
  'issued',
  'in effect',
  'advised',
  'closure',
  'closures',
  'closed',
  'close to traffic',
  'diverted',
  'diversion',
  'interruption',
  'interruptions',
  'outage',
  'outages',
  'no water',
  'no power',
  'disrupted',
  'disruption',
  'suspended',
  'cancelled',
  'canceled',
  'postponed',
  'resumes',
  'resumed',
  'reopened',
  'reopens',
  'warning',
  'advisory',
  'alert',
  'avoid',
  'safety',
  'scheduled',
  'schedule',
  'collection',
  'road works',
  'repairs',
  'maintenance',
  'restoration',
  'restore',
  'rationing',
  'take effect',
  'in effect',
  'until further notice',
  'members of the public',
  'residents are advised',
  'will be closed',
  'will have no',
  'temporarily',
  'reduced to a single lane',
];

/** Named agencies: a story quoting one of these is closer to official. */
const OFFICIAL = [
  'police',
  'royal bahamas police force',
  'rbpf',
  'bahamas power and light',
  'bpl',
  'water and sewerage corporation',
  'wsc',
  'ministry of works',
  'ministry of public works',
  'ministry of transport',
  'ministry of health',
  'ministry of education',
  'nema',
  'national emergency management agency',
  'met office',
  'department of meteorology',
  'bahamas information services',
  'bis',
  'government of the bahamas',
  'office of the prime minister',
  'port department',
  'bahamas maritime authority',
  'royal bahamas defence force',
  'department of environmental health',
  'urban renewal',
  'road traffic department',
  'civil aviation',
];

/** Words that mean "this is general news, not service information". */
const NOISE = [
  'horoscope',
  'lottery',
  'win big',
  'betting',
  'crossword',
  'obituary',
  'celebrity gossip',
  'box office',
  'movie review',
  'tv schedule',
  'recipe',
];

export const CATEGORY_LABELS = {
  flooding: 'Flooding',
  power: 'Power',
  road: 'Road',
  water: 'Water',
  safety: 'Safety',
  marine: 'Marine',
  health: 'Health',
  sanitation: 'Sanitation',
  storm: 'Storm',
  fire: 'Fire',
  community: 'Community',
  notice: 'Notice',
  accident: 'Car Accident',
};

/** The categories that carry actionable service information. */
export const CIVIC_CATEGORIES = ['road', 'water', 'power', 'sanitation', 'storm', 'marine', 'flooding'];

function normaliseForMatch(input) {
  return ` ${String(input)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/** Match a term and its regular plural, so "diversion" catches "diversions". */
function variants(term) {
  const out = [term];
  if (!term.endsWith('s')) out.push(`${term}s`);
  return out;
}

function phraseHits(haystack, terms) {
  const hits = [];
  for (const raw of terms) {
    const term = raw;
    const matched = variants(term).find((v) => haystack.includes(` ${v} `));
    if (!matched) continue;
    // Guard against sub-word matches when the phrase is a bare acronym.
    if (term.length <= 4 && /^[a-z]+$/.test(term)) {
      if (!new RegExp(`(^|\\s)${term}(\\s|$)`).test(haystack)) continue;
    }
    hits.push(term);
  }
  return hits;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * @param {{title?: string, summary?: string, publisher?: string}} item
 * @returns {{
 *   category: string, categoryLabel: string, confidence: number,
 *   civic: boolean, civicScore: number, official: number, noise: boolean,
 *   signals: string[], scores: Record<string, number>
 * }}
 */
export function classify(item = {}) {
  const title = item.title || '';
  const summary = item.summary || '';
  // Title carries the signal; the standfirst confirms it. Body text would
  // over-trigger (a court story that mentions "police" in paragraph nine).
  const titleText = normaliseForMatch(title);
  const summaryText = normaliseForMatch(summary);

  const scores = {};
  const signals = [];

  for (const rule of RULES) {
    const inTitle = phraseHits(titleText, rule.terms);
    const inSummary = phraseHits(summaryText, rule.terms);
    if (!inTitle.length && !inSummary.length) continue;
    const gain = inTitle.length * rule.weight + inSummary.length * rule.weight * 0.4;
    scores[rule.category] = (scores[rule.category] || 0) + gain;
    for (const hit of [...inTitle, ...inSummary].slice(0, 4)) {
      const label = `${rule.category}:${hit}`;
      if (!signals.includes(label)) signals.push(label);
    }
  }

  // Category with the highest score; ties break toward the civic categories so
  // "road closure announced by police" reads as a road closure, not a crime.
  let category = 'notice';
  let best = 0;
  for (const [cat, score] of Object.entries(scores)) {
    const adjusted = CIVIC_CATEGORIES.includes(cat) ? score + 0.5 : score;
    if (adjusted > best) {
      best = adjusted;
      category = cat;
    }
  }

  const actionableHits = phraseHits(titleText, ACTIONABLE);
  const actionableInSummary = phraseHits(summaryText, ACTIONABLE).slice(0, 2);
  const officialHits = phraseHits(`${titleText} ${summaryText}`, OFFICIAL);
  const noiseHits = phraseHits(`${titleText} ${summaryText}`, NOISE);

  // civicScore: 0.45 max from actionable language, 0.35 from an agency being
  // named, 0.20 from being in a civic category to begin with.
  let civicScore = 0;
  civicScore += Math.min(0.45, actionableHits.length * 0.2 + actionableInSummary.length * 0.08);
  // Naming one agency is the strongest single signal there is; extra agencies
  // only add a little, so a court story quoting "police" cannot reach the bar.
  if (officialHits.length) civicScore += Math.min(0.35, 0.3 + (officialHits.length - 1) * 0.05);
  if (CIVIC_CATEGORIES.includes(category) || category === 'notice') civicScore += 0.2;
  if (noiseHits.length) civicScore *= 0.25;
  civicScore = clamp01(Number(civicScore.toFixed(3)));

  const confidence = clamp01(Number((best === 0 ? 0.15 : Math.min(0.95, 0.45 + best * 0.03)).toFixed(3)));

  return {
    category,
    categoryLabel: CATEGORY_LABELS[category] || 'Notice',
    confidence,
    // A story is civic if it is actionable, or an official body announced it in
    // a service-adjacent category. Court/politics items stay out.
    civic:
      civicScore >= 0.5 &&
      (actionableHits.length > 0 || officialHits.length > 0) &&
      !['community', 'safety', 'accident', 'health', 'fire'].includes(category),
    civicScore,
    official: clamp01(Number(Math.min(1, officialHits.length * 0.3).toFixed(3))),
    noise: noiseHits.length > 0,
    signals: signals.slice(0, 8),
    scores,
  };
}
