//TODO keep in sync with tm-server-manager: https://github.com/tmservers/tm-server-manager/blob/main/tm-server-manager/src/competition/permissions.rs
// This _should_ be stable in the sense that it is append only BUT atm it is not yet because i need to rework the permission values. 
const PERMISSION = {
    NONE: 0n,
    OWNER: 1n,

    COMPETITION_CREATE: 1n << 4n,
    COMPETITION_EDIT_NAME: 1n << 5n,
    COMPETITION_DELETE: 1n << 6n,
    COMPETITION_CONNECTION_EDIT: 1n << 7n,
    COMPETITION_LAYOUT_EDIT: 1n << 18n,

    MATCH_CREATE: 1n << 10n,
    MATCH_DELETE: 1n << 11n,
    MATCH_CONFIGURE: 1n << 12n,

    RAW_SERVER_ADD: 1n << 13n,
    RAW_SERVER_REVOKE: 1n << 14n,

    MATCH_ASSIGN_SERVER: 1n << 15n,
    REGISTRATION_CREATE: 1n << 16n,
    SCHEDULE_CREATE: 1n << 17n,
    INPUT_CREATE: 1n << 21n,
    SERVER_CREATE: 1n << 19n,
    OUTPUT_CREATE: 1n << 20n,
} as const;


interface PermissionsProps {
    permissions: bigint;
}

export default function Permissions({
    permissions,
}: PermissionsProps) {
    return (
        <div>OWNER</div>
    )
}