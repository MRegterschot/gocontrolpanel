INSERT INTO plugins (id, name, description, updatedAt)
VALUES (
  UUID(),
  'match',
  'A plugin to manage a match on the server, including starting and stopping the match, a pick and ban system, and player and team management.',
  NOW()
);