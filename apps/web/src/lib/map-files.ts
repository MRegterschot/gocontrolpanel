// The dedicated server resolves map paths like a Windows path and swaps characters Windows
// forbids in a file name for "_", so a map saved as Go "Snow" Car can never be found by name
export function dedicatedFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, "_");
}
