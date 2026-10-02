INSERT INTO plugins (id, name, description, updatedAt)
VALUES (
  UUID(),
  'map-info',
  'A widget that shows information about the current map.',
  NOW()
), (
  UUID(),
  'live-ranking',
  'A widget that shows the current standings in points during a match. For rounds and cup mode.',
  NOW()
), (
  UUID(),
  'live-round',
  'A widget that shows live timings of players during a round.',
  NOW()
), (
  UUID(),
  'records-info',
  'A widget that shows the records for the current map. This includes the world record and the local server record.',
  NOW()
), (
  UUID(),
  'ta-active-runs',
  'A widget that shows the active time attack runs on the server.',
  NOW()
), (
  UUID(),
  'ta-leaderboard',
  'A widget that shows the time attack leaderboard for the current map.',
  NOW()
);
