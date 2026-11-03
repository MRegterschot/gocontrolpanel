// Mirrors CompetitionPermissionsV1 in tm-server-manager/src/competition/permissions.rs, keep both in sync.
export const OWNER = 1n;

const bit = (n: number) => 1n << BigInt(n);
const group = (name: string, permissions: [string, number][]) => ({
  name,
  permissions: permissions.map(([label, n]) => ({ label, bit: bit(n) })),
});

export const PERMISSION_GROUPS = [
  group("Competition", [["Create stages", 4], ["Edit name", 5], ["Delete", 6]]),
  group("Connection", [["Connect", 7], ["Configure", 8], ["Mark configured", 9], ["Delete", 10]]),
  group("Node", [["Move", 11], ["Delete", 12], ["Rename", 13]]),
  group("Members", [["Add", 14], ["Edit permissions", 15], ["Remove", 16]]),
  group("Roles", [["Create", 17], ["Edit permissions", 18], ["Assign", 19], ["Unassign", 20], ["Remove", 21]]),
  group("Servers", [["Lend", 22], ["Remove", 23], ["Create server nodes", 43], ["Shared configs", 45]]),
  group("Leaderboard", [["Create", 24], ["Delete", 25], ["Configure", 26], ["Mark configured", 27]]),
  group("Registration", [["Create", 28], ["Configure", 29], ["Mark configured", 30], ["Open", 31], ["Close", 32]]),
  group("Match", [["Create", 33], ["Delete", 34], ["Configure", 35], ["Mark configured", 36], ["Start", 37], ["Send chat", 38], ["Assign server", 39], ["Spectate in game", 44]]),
  group("Other nodes", [["Create schedules", 40], ["Create inputs", 41], ["Create outputs", 42]]),
];

export const PERMISSION = {
  MEMBER_ADD: bit(14),
  MEMBER_EDIT: bit(15),
  MEMBER_REMOVE: bit(16),
  ROLE_CREATE: bit(17),
  ROLE_EDIT: bit(18),
  ROLE_ASSIGN: bit(19),
  ROLE_UNASSIGN: bit(20),
  ROLE_REMOVE: bit(21),
  MATCH_SEND_CHAT: bit(38),
};

// Owners implicitly have every permission, like on the server.
export const hasPermission = (mine: bigint, permission: bigint) => (mine & OWNER) !== 0n || (mine & permission) === permission;

export function describePermissions(mask: bigint) {
  if (mask & OWNER) return "Owner";
  const count = PERMISSION_GROUPS.flatMap((g) => g.permissions).filter((p) => mask & p.bit).length;
  return count === 0 ? "No permissions" : `${count} permission${count === 1 ? "" : "s"}`;
}
