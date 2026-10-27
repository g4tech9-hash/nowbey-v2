/**
 * ISLAND + PARISH DETECTION
 * ---------------------------------------------------------------------------
 * The wire pins a story to a place ("Pinned: Exuma" in the live UI), and the
 * feed filters by island. Headlines almost never name the island twice, so we
 * scan title, standfirst and body for the island itself and for its main town
 * or port, which is how Bahamian copy usually refers to a place.
 */

/** Canonical islands, widest first so "Grand Bahama" wins over "Bahama". */
export const ISLANDS = [
  'New Providence',
  'Grand Bahama',
  'Cat Island',
  'Crooked Island',
  'Long Island',
  'Berry Islands',
  'Ragged Island',
  'San Salvador',
  'Spanish Wells',
  'Harbour Island',
  'Mayaguana',
  'Eleuthera',
  'Andros',
  'Bimini',
  'Inagua',
  'Acklins',
  'Exuma',
  'Abaco',
  'Rum Cay',
  'Cay Sal Bank',
];

/**
 * Towns, cays and landmarks → island. Only entries that are unambiguous in
 * Bahamian news copy; anything wider (Nassau Harbour, Bay Street) sits under
 * New Providence because that is where the wire is densest.
 */
const ALIASES = {
  'New Providence': [
    'nassau',
    'cable beach',
    'paradise island' /* own district, but reported with Nassau */,
    'bay street',
    'grant\'s town',
    'shirley street',
    'carmichael',
    'kemp road',
    'fox hill',
    'bain town',
    'englerston',
    'golden gates',
    'soldier road',
    'stapleton',
    'yamacraw',
    'east street',
    'prince charles drive',
    'tonique williams',
    'john f kennedy drive',
    'jfk drive',
    'a rawson square',
    'rawson square',
    'parliament street',
    'lyford cay',
    'old fort bay',
    'seabreeze',
    'pinewood',
    'nassau village',
    'over the hill',
    'potter\'s cay',
    'potter cay',
    'fort charlotte',
    'clifton pier',
    'new providence',
    'windsor field',
    'centreville',
    'mt vernant',
    'mount vernant',
  ],
  'Grand Bahama': [
    'freeport',
    'lucaya',
    'eight mile rock',
    'west end',
    'pinder\'s point',
    'pinders point',
    'east end',
    'high rock',
    'mclean\'s town',
    'mc leans town',
    'sweeting\'s cay',
    'grand bahama',
    'hawksbill',
  ],
  Abaco: [
    'marsh harbour',
    'marsh harbor',
    'treasure cay',
    'coopers town',
    'cooper\'s town',
    'green turtle cay',
    'elbow cay',
    'hope town',
    'man o war cay',
    'man-o-war cay',
    'cherokee',
    'moores island',
    'moore\'s island',
    'abaco',
    'guana cay',
  ],
  Eleuthera: [
    'governor\'s harbour',
    'governors harbour',
    'rock sound',
    'harbour island',
    'dunmore town',
    'hatchet bay',
    'tarpum bay',
    'palmetto point',
    'gregory town',
    'james cistern',
    'glass window',
    'eleuthera',
  ],
  Exuma: [
    'george town',
    'georgetown',
    'great exuma',
    'little exuma',
    'staniel cay',
    'exuma',
    'elizabeth harbour',
    'elizabeth harbor',
  ],
  Andros: [
    'andros',
    'nicolls town',
    'fresh creek',
    'mangrove cay',
    'mastic point',
    'behring point',
    'south andros',
    'north andros',
    'central andros',
    'stafford creek',
    'red bays',
  ],
  Bimini: ['bimini', 'alice town', 'north bimini', 'south bimini', 'cat cay'],
  'Cat Island': ['cat island', 'arthur\'s town', 'arthurs town', 'orange creek', 'bain town cat'],
  Inagua: ['inagua', 'matthew town', 'great inagua', 'little inagua'],
  'Long Island': ['long island', 'clarence town', 'deadman\'s cay', 'deadmans cay', 'salt pond'],
  Acklins: ['acklins', 'spring point', 'lovely bay', 'salina point'],
  'Crooked Island': ['crooked island', 'landrail point', 'colonel hill', 'pitts town'],
  Mayaguana: ['mayaguana', 'abraham\'s bay', 'abrahams bay', 'betsy bay'],
  'San Salvador': ['san salvador', 'cockburn town', 'riding rock'],
  'Berry Islands': ['berry islands', 'bullock\'s harbour', 'bullocks harbour', 'chub cay', 'great harbour cay'],
  'Ragged Island': ['ragged island', 'duncan town'],
  'Spanish Wells': ['spanish wells'],
  'Harbour Island': ['harbour island', 'briland', 'dunmore town'],
  'Rum Cay': ['rum cay', 'port nelson'],
  'Cay Sal Bank': ['cay sal'],
};

/** Flat alias table, longest alias first, so "great inagua" beats "inagua". */
const ALIAS_INDEX = Object.entries(ALIASES)
  .flatMap(([island, words]) => words.map((w) => ({ island, alias: w })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * @param {string} haystack  title + summary + body, any case
 * @returns {{ island: string|null, matches: string[] }}
 */
export function detectIsland(haystack = '') {
  const text = ` ${String(haystack)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')} `;

  const found = [];
  const hits = [];
  for (const { island, alias } of ALIAS_INDEX) {
    const needle = ` ${alias} `;
    const at = text.indexOf(needle);
    if (at === -1) continue;
    hits.push(alias);
    found.push({ island, alias, at: at + 1, len: alias.length });
  }
  if (!found.length) return { island: null, matches: [] };

  // Copy names the place it is writing about first, so the island mentioned
  // earliest in the story wins; a longer alias only breaks a tie at the same
  // position ("Exuma" before "Long Island" in the same sentence).
  found.sort((a, b) => a.at - b.at || b.len - a.len);
  return { island: found[0].island, matches: hits };
}
