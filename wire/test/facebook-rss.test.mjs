/**
 * Facebook page → RSS 2.0 converter (wire/lib/facebook.mjs) — hermetic, no network.
 *
 * Restored from PRs #37 & #38 and extended with end-to-end verification that
 * Royal Bahamas Police Force Marco's Alert posts normalize through the converter,
 * pass qa/rss-qa/validate.mjs, and flow straight into wire/lib/alerts.mjs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateXmlString } from '../../qa/rss-qa/validate.mjs';
import { ingest as ingestAlerts } from '../lib/alerts.mjs';
import { classify } from '../lib/classify.mjs';
import {
  DEFAULT_FB_PAGE,
  fbBridgesFromValue,
  fbBridgesToValue,
  fbBridgeUrl,
  fbPageName,
  fbPagesFromValue,
  fbUsernameFromUrl,
  fetchFacebookRssXml,
  isPrivateHostname,
  parseBridgeFeed,
  parseFacebookHtml,
  postsToRssXml,
  titleForPost,
} from '../lib/facebook.mjs';

const HOUR = 3600_000;
const hoursAgoSec = (h) => Math.floor((Date.now() - h * HOUR) / 1000);
const hoursAgoIso = (h) => new Date(Date.now() - h * HOUR).toISOString();

test('facebook-rss: page links in every reasonable shape resolve to the username', () => {
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/mybpl242/'), 'mybpl242');
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/rbpfpublicaffairs/'), 'rbpfpublicaffairs');
  assert.equal(fbUsernameFromUrl('https://m.facebook.com/mybpl242/posts/1205834411022?refid=17'), 'mybpl242');
  assert.equal(fbUsernameFromUrl('https://mbasic.facebook.com/mybpl242?_rdr'), 'mybpl242');
  assert.equal(fbUsernameFromUrl('https://fb.com/mybpl242'), 'mybpl242');
  assert.equal(fbUsernameFromUrl('mybpl242'), 'mybpl242');
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/profile.php?id=100064712345678'), 'profile-100064712345678');
});

test('facebook-rss: non-page links and share permalinks are rejected (SSRF / nonsense guard)', () => {
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/login.php'), null);
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/watch/live'), null);
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/share/p/1Fnp3UugWB/'), null);
  assert.equal(fbUsernameFromUrl('https://evil.example.com/mybpl242'), null);
  assert.equal(fbUsernameFromUrl('javascript:alert(1)'), null);
  assert.equal(fbUsernameFromUrl(''), null);
  assert.equal(fbUsernameFromUrl('https://www.facebook.com/'), null);
});

test('facebook-rss: page names resolve for BPL, RBPF, FB_PAGES env, and unknown handles', () => {
  assert.equal(fbPageName('mybpl242', {}), 'Bahamas Power and Light');
  assert.equal(fbPageName('rbpfpublicaffairs', {}), 'Royal Bahamas Police Force');
  assert.equal(fbPageName('242intheknow', { FB_PAGES: '242intheknow|242 In The Know' }), '242 In The Know');
  assert.equal(fbPageName('unknownpage', {}), 'unknownpage (Facebook)');
  assert.equal(DEFAULT_FB_PAGE, 'mybpl242');
});

test('facebook-rss: bridge precedence — admin site_settings wins over FB_RSS_BRIDGES and RBPF_FB_RSS_URL', () => {
  const env = {
    FB_RSS_BRIDGES: 'mybpl242|https://env.example/feed.xml',
    RBPF_FB_RSS_URL: 'https://rss.app/feeds/rbpf.xml',
  };
  const admin = fbBridgesFromValue('mybpl242|https://rss.app/feeds/abc.xml');
  assert.equal(fbBridgeUrl('mybpl242', env, admin), 'https://rss.app/feeds/abc.xml');
  assert.equal(fbBridgeUrl('mybpl242', env, {}), 'https://env.example/feed.xml');
  assert.equal(fbBridgeUrl('rbpfpublicaffairs', env, {}), 'https://rss.app/feeds/rbpf.xml');
  assert.equal(fbBridgeUrl('otherpage', env, admin), null);
});

test('facebook-rss: bridge addresses pointing inside private networks are refused (no SSRF)', () => {
  for (const host of [
    'localhost', 'fb.localhost', 'rss.internal', '127.0.0.1', '10.1.2.3',
    '192.168.0.10', '172.16.5.4', '172.31.255.1', '169.254.1.1', '::1', '[::1]', 'fd00::1', 'fe80::1',
  ]) {
    assert.equal(isPrivateHostname(host), true, `${host} must be private`);
  }
  for (const host of ['rss.app', 'fetchrss.com', '8.8.8.8', '172.32.0.1']) {
    assert.equal(isPrivateHostname(host), false, `${host} must be allowed`);
  }
  assert.equal(fbBridgeUrl('mybpl242', { FB_RSS_BRIDGES: 'mybpl242|http://127.0.0.1:8080/feed.xml' }, {}), null);
});

test('facebook-rss: mbasic HTML yields posts with canonical permalinks, text, images and times', () => {
  const e1 = hoursAgoSec(2);
  const e2 = hoursAgoSec(26);
  const html = `<html><head><title>Bahamas Power and Light</title></head><body>
<div>
  <div><a href="/mybpl242?fref=nf">Bahamas Power and Light</a> <abbr data-utime="${e1}">2 hrs</abbr></div>
  <div class="_5pbx userContent" data-ft='{"tn":"K"}'>BPL advises customers in Fox Hill &amp; Sans Souci: planned outage Tuesday 9am-11am.<br/>Report outages 24/7 to 225-5275.</div>
  <div><a href="/photo.php?fbid=987654&amp;set=a.1&amp;type=3"><img src="https://scontent.xx.fbcdn.net/v/t39/outage-map.jpg?efg=1&amp;_nc_ht=scontent" /></a></div>
  <div><a href="/story.php?story_fbid=1205834411022&amp;id=100064712345678&amp;refid=17">Full Story</a></div>
</div>
<div>
  <div><a href="/mybpl242?fref=nf">Bahamas Power and Light</a> <abbr>${e2}</abbr></div>
  <div class="_5pbx userContent">Crews restored supply to Tarpum Bay &amp; Greencastle this morning.</div>
  <div><a href="/mybpl242/posts/1204678301001?refid=17">Full Story</a></div>
</div>
</body></html>`;

  const posts = parseFacebookHtml(html, 'mybpl242');
  assert.equal(posts.length, 2);
  assert.equal(posts[0].url, 'https://www.facebook.com/permalink.php?story_fbid=1205834411022&id=100064712345678');
  assert.ok(posts[0].text.includes('Fox Hill & Sans Souci'));
  assert.equal(posts[0].imageUrl, 'https://scontent.xx.fbcdn.net/v/t39/outage-map.jpg?efg=1&_nc_ht=scontent');
  assert.equal(posts[1].url, 'https://www.facebook.com/mybpl242/posts/1204678301001');
});

test('facebook-rss: broken upstream bridge XML normalizes to strict RSS 2.0 that PASSES qa/rss-qa/validate.mjs', () => {
  const sloppyBridgeXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>mybpl242 FB bridge</title>
<link>https://www.facebook.com/mybpl242/</link>
<description>Upstream feed with &nbsp; and &rsquo; entities and a raw & </description>
<item>
<title>Outage update &amp; Fox Hill alert</title>
<link>https://www.facebook.com/mybpl242/posts/1112233445</link>
<pubDate>${new Date(hoursAgoIso(2)).toUTCString()}</pubDate>
<description>Restored supply to &lt;b&gt;Tarpum Bay&lt;/b&gt; &amp; surrounding areas.</description>
<enclosure type="image/jpeg" url="https://scontent.xx.fbcdn.net/img.jpg?x=1&amp;y=2"/>
</item>
</channel>
</rss>`;

  const rawCheck = validateXmlString(sloppyBridgeXml, {
    expectTitle: 'Bahamas Power',
    expectLink: 'facebook.com/mybpl242',
    nowbey: true,
  });
  assert.notEqual(rawCheck.status, 'PASS');

  const posts = parseBridgeFeed(sloppyBridgeXml, 'mybpl242');
  const xml = postsToRssXml({
    username: 'mybpl242',
    pageName: 'Bahamas Power and Light',
    posts,
    selfUrl: 'https://nowbey-v2.vercel.app/api/rss/facebook?page=mybpl242',
  });
  const normalizedCheck = validateXmlString(xml, {
    expectTitle: 'Bahamas Power',
    expectLink: 'facebook.com/mybpl242',
    nowbey: true,
  });
  assert.equal(normalizedCheck.status, 'PASS', JSON.stringify(normalizedCheck.findings));
});

test('facebook-rss: RBPF Marco\'s Alert post via FB→RSS generator flows end-to-end into alerts engine', async () => {
  const rbpfBridgeXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Royal Bahamas Police Force</title>
<link>https://www.facebook.com/rbpfpublicaffairs/</link>
<description>RBPF Public Affairs</description>
<item>
<title>MARCO&apos;S ALERT - MISSING PERSON</title>
<link>https://www.facebook.com/rbpfpublicaffairs/posts/9988776655</link>
<pubDate>Thu, 29 Oct 2026 16:18:00 +0000</pubDate>
<description>Nikita Smith (Female) 17yrs of Pride Estate, New Providence. Last seen Wednesday, 28th October, 2026: @ her residence. Complexion: Light Brown, Medium Build: If seen contact police @ 919 or CID 502-9991 502-9992.</description>
<enclosure type="image/jpeg" url="https://scontent.xx.fbcdn.net/v/t39/nikita-smith-flyer.jpg"/>
</item>
</channel>
</rss>`;

  const { xml } = await fetchFacebookRssXml({
    username: 'rbpfpublicaffairs',
    env: { RBPF_FB_RSS_URL: 'https://rss.app/feeds/rbpf.xml' },
    fetchImpl: async () => ({ ok: true, text: async () => rbpfBridgeXml }),
  });

  const qa = validateXmlString(xml, {
    expectTitle: 'Royal Bahamas Police Force',
    expectLink: 'facebook.com/rbpfpublicaffairs',
    nowbey: true,
  });
  assert.equal(qa.status, 'PASS', JSON.stringify(qa.findings));

  const { items } = await ingestAlerts({
    config: {
      sources: [
        {
          id: 'fb-rbpfpublicaffairs',
          name: 'Royal Bahamas Police Force',
          initials: 'RB',
          weight: 1,
          bahamian: true,
          url: 'https://facebook-rss.nowbey.internal/rbpfpublicaffairs',
        },
      ],
    },
    bulletins: [],
    now: new Date('2026-10-29T17:00:00Z'),
    fetchImpl: async () => ({ ok: true, text: async () => xml }),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].alertType, 'marco');
  assert.equal(items[0].urgency, 'high');
  assert.equal(items[0].person.name, 'Nikita Smith');
  assert.equal(items[0].person.residence, 'Pride Estate, New Providence');
  assert.equal(items[0].island, 'New Providence');
  assert.equal(items[0].photo, 'https://scontent.xx.fbcdn.net/v/t39/nikita-smith-flyer.jpg');
  assert.equal(items[0].photoKind, 'image', 'enclosure flyer URL extracted by FB→RSS converter renders inline');
});

test('facebook-rss: BPL subsea cable & power supply releases classify as power', () => {
  assert.equal(
    classify({
      title: 'BPL Provides Update on Great Guana Cay Power Supply and Subsea Cable Replacement',
      summary: 'Crews restored power supply after a transformer and feeder fault.',
    }).category,
    'power',
  );
  assert.equal(fbPagesFromValue('mybpl242, rbpfpublicaffairs|Royal Bahamas Police Force', {}).length, 2);
  assert.equal(fbBridgesToValue(fbBridgesFromValue('mybpl242|https://rss.app/feeds/bpl.xml')), 'mybpl242|https://rss.app/feeds/bpl.xml');
});
