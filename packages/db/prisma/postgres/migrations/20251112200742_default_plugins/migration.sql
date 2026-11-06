-- Enable the extension (only once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO plugins (id, name, description, "updatedAt")
VALUES (
  gen_random_uuid(),
  'map-info',
  'A widget that shows information about the current map.',
  NOW()
), (
  gen_random_uuid(),
  'live-ranking',
  'A widget that shows the current standings in points during a match. For rounds and cup mode.',
  NOW()
), (
  gen_random_uuid(),
  'live-round',
  'A widget that shows live timings of players during a round.',
  NOW()
), (
  gen_random_uuid(),
  'records-info',
  'A widget that shows the records for the current map. This includes the world record and the local server record.',
  NOW()
), (
  gen_random_uuid(),
  'ta-active-runs',
  'A widget that shows the active time attack runs on the server.',
  NOW()
), (
  gen_random_uuid(),
  'ta-leaderboard',
  'A widget that shows the time attack leaderboard for the current map.',
  NOW()
);
