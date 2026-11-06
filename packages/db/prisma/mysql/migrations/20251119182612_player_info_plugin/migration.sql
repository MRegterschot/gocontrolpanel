INSERT INTO plugins (id, name, description, updatedAt)
VALUES (
  UUID(),
  'player-info',
  'A widget that shows information about the spectated player. This includes their name, personal best and optionally device and camera.',
  NOW()
);