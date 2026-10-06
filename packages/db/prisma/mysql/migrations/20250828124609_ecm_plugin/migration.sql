INSERT INTO plugins (id, name, description, updatedAt)
VALUES (
  UUID(),
  'ecm',
  'A plugin to integrate with the eCircuitMania API. This plugin will automatically send match data to eCircuitMania.',
  NOW()
);
