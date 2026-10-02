import slugid from "slugid";

// Logins are url-safe base64 of the Ubisoft account id; fake players have no account
export function loginToAccountId(login: string): string | null {
  if (login.includes("fakeplayer")) return null;
  try {
    return slugid.decode(login);
  } catch {
    return null;
  }
}
