-- NowBey seed data for local development.
-- Run with:  psql "$DATABASE_URL" -f src/db/seed.sql
BEGIN;

INSERT INTO users (handle, display_name, email, parish, role, password_hash, ad_free_tier)
VALUES
  ('sandy_roads', 'Sandy Symonville', 'sandy@nowbey.app', 'New Providence', 'resident',
   'd222b8b0f3d2232f549618b0:9f379636076ae5974af4bd39affc3325f1ae3253c04424ae019030c9c754238c1f2bc95aac757666', NULL),
  ('nowbey_desk', 'NowBey Desk', 'desk@nowbey.app', 'New Providence', 'editor', NULL, 'admiral'),
  ('freeport_ferry', 'Marcio Del Valle', NULL, 'Grand Bahama', 'resident', NULL, NULL)
ON CONFLICT (handle) DO NOTHING;

WITH rows AS (
  INSERT INTO incidents
    (title, details, category, severity, lat, lng, accuracy_meters, address, street, parish, status,
     confirmations, sightings, source_kind, author_handle, anonymous, created_at, updated_at)
  VALUES
    ('Knee-deep water across Bay Street at the bus stand',
     'From the traffic light to the pharmacy. Small cars are turning back onto Hill Street; the JUA bus is using the contraflow lane.',
     'flood', 3, 25.06480, -77.34320, 1.8, 'Bay Street & Hill Street, Nassau', 'Bay Street', 'New Providence', 'active',
     14, 4, 'resident', 'sandy_roads', false, now() - interval '18 minutes', now() - interval '6 minutes'),

    ('Whole block dark behind Strachan''s since the transformer blew',
     'Sparky electric truck on site. They say it is a fuse on the pole, not the substation. Fridge food is the worry for the elderly flats.',
     'power', 2, 25.06990, -77.35030, 2.6, 'Spring Garden Road, Nassau', 'Spring Garden Road', 'New Providence', 'active',
     6, 1, 'resident', 'sandy_roads', false, now() - interval '52 minutes', now() - interval '40 minutes'),

    ('Pothole the size of a dustbin where Village Road meets Jones Road',
     'Two scooters have already gone down in it. It holds water so you cannot see the depth until you are in it.',
     'road', 2, 25.06690, -77.33830, 1.2, 'Village Road, East Village, Nassau', 'Village Road', 'New Providence', 'active',
     9, 2, 'resident', 'kempsey_b', false, now() - interval '2 hours', now() - interval '1 hour'),

    ('No water on West Hill since five this morning',
     'Cisterns are running low on the upper street. The Water & Sewerage truck is expected around noon.',
     'water', 3, 25.05850, -77.34640, 3.4, 'West Hill Street, Nassau', 'West Hill Street', 'New Providence', 'active',
     11, 0, 'resident', 'overthe_hill_owen', false, now() - interval '3 hours', now() - interval '2 hours'),

    ('Silver Aveo with no plates circling the Grants Town car park',
     'Third time this week, same car, two men checking door handles around nine. Not saying anything happened, just saying.',
     'crime', 3, 25.06360, -77.33680, 2.1, 'Grant''s Town Road, Nassau', 'Grant''s Town Road', 'New Providence', 'active',
     7, 3, 'resident', 'someone', true, now() - interval '4 hours', now() - interval '3 hours'),

    ('Large branch down across the footpath at Montagu Beach',
     'Blocking the walkway on the seaward side, people are stepping into the road. Someone from the parks crew has been told.',
     'road', 1, 25.07560, -77.35810, 1.5, 'West Bay Street near Montagu Beach, Nassau', 'West Bay Street', 'New Providence', 'resolved',
     4, 1, 'resident', 'sandy_roads', false, now() - interval '30 hours', now() - interval '20 hours'),

    ('Sand washover on the Northern Shore Road after the squall',
     'Aeolian sand across both lanes for about forty metres, east of Cabbage Beach. Not deep but loose, take it slow on a bike.',
     'flood', 2, 25.08650, -77.41990, 4.0, 'Northern Shore Road, Nassau', 'Northern Shore Road', 'New Providence', 'active',
     5, 0, 'resident', 'cablebeach_j', false, now() - interval '7 hours', now() - interval '5 hours'),

    ('Boil the water for the Eastern Road blocks',
     'Notice printed at the shop: pressure loss this morning means possible contamination until the flushing finishes tonight.',
     'water', 3, 25.07870, -77.35010, 2.9, 'Eastern Road, Centreville, Nassau', 'Eastern Road', 'New Providence', 'active',
     8, 1, 'news', 'nowbey_desk', false, now() - interval '9 hours', now() - interval '8 hours'),

    ('Junkanoo rehearsal: Bay Street closing between Hill and Rawson tonight',
     'Doors at seven, road shut from about eight till eleven. Park on Rawson and walk, the little route will not get through.',
     'event', 1, 25.06520, -77.34240, 2.2, 'Bay Street, Nassau', 'Bay Street', 'New Providence', 'resolved',
     3, 0, 'resident', 'nowbey_desk', false, now() - interval '2 days', now() - interval '26 hours'),

    ('Leaning light pole over the carriageway on East Street',
     'Bent at the base from the squall and it tilts when a truck goes past. Barricade tape is there but nothing else.',
     'health', 3, 25.05510, -77.34420, 1.9, 'East Street, Over-the-Hill, Nassau', 'East Street', 'New Providence', 'active',
     6, 2, 'resident', 'overthe_hill_owen', false, now() - interval '12 hours', now() - interval '11 hours'),

    ('Broken fender at the Lucaya Marina fuel dock',
     'The south fender is gone, so the boats are grinding the concrete. Needs it before the weekend runs.',
     'marine', 2, 26.57090, -78.69050, 2.4, 'Lucaya Road, Freeport', 'Lucaya Road', 'Grand Bahama', 'active',
     4, 1, 'resident', 'freeport_ferry', false, now() - interval '5 hours', now() - interval '4 hours'),

    ('Water over the highway at the Low Bridge near Sabin',
     'Rising fast with the tide, about ten centimetres on the westbound lane. A sedan would not risk it in a box truck lane.',
     'flood', 3, 26.54500, -78.70500, 3.1, 'Grand Bahama Highway near Sabin', 'Grand Bahama Highway', 'Grand Bahama', 'active',
     10, 2, 'resident', 'freeport_ferry', false, now() - interval '96 minutes', now() - interval '30 minutes'),

    ('Debris reported in the Marsh Harbour channel',
     'Pieces of a dock and what looks like a boat trailer. Coast Guard notified; small craft should wait for the mark.',
     'marine', 3, 26.54140, -77.06420, 5.5, 'Mercedes Street, Marsh Harbour', 'Mercedes Street', 'Abaco', 'active',
     5, 0, 'news', 'nowbey_desk', false, now() - interval '15 hours', now() - interval '14 hours'),

    ('Water truck now stopping at the school yard, not the ball field',
     'Schedule moved for the roadworks on the Queens Highway, so bring the drums down to the school gate by five.',
     'water', 2, 24.95060, -76.21440, 6.0, 'Queens Highway, Gregory Town', 'Queens Highway', 'Eleuthera', 'active',
     3, 0, 'resident', 'gregory_town_k', false, now() - interval '26 hours', now() - interval '25 hours'),

    ('George Town out of power; hospital generator running',
     'Out since nine. The supermarket is running its own genset so cold food is fine. They say about three hours.',
     'power', 3, 24.12220, -76.42730, 4.2, 'Reid Street, George Town', 'Reid Street', 'Exuma', 'active',
     12, 1, 'resident', 'exuma_blue', false, now() - interval '3 hours 20 minutes', now() - interval '2 hours'),

    ('Main break at the Bimini Bay turn, water across the road',
     'High pressure, it is washing gravel out under the asphalt. Drivers are cutting through the resort side.',
     'water', 2, 25.73670, -79.28810, 3.8, 'Harbour Road, Alice Town', 'Harbour Road', 'Bimini', 'active',
     6, 1, 'resident', 'alice_town_ray', false, now() - interval '20 hours', now() - interval '19 hours')
  RETURNING id, title, author_handle
)
INSERT INTO incident_updates (incident_id, kind, note, author_handle)
SELECT id, 'confirm', 'Still there when I walked past ten minutes ago.', 'freeport_ferry' FROM rows
UNION ALL
SELECT id, 'photo', 'Photo note: water up to the first step of the shelter, facing east.', 'kempsey_b' FROM rows
UNION ALL
SELECT id, 'note', 'Truck from the department is coming after the tide drops.', 'nowbey_desk' FROM rows;

-- News stories come from the live ingest (POST /api/news), so none are seeded here.

COMMIT;
