// The dedicated server rejects chat messages longer than this with "Text too long"
export const CHAT_MESSAGE_MAX_LENGTH = 1000;

export function formatMessage(
  format: string,
  login: string,
  nickName: string,
  message: string,
): string {
  return format
    .replaceAll("{login}", login)
    .replaceAll("{nickName}", nickName)
    .replaceAll("{message}", message)
    .trim();
}

export function formatTemplate(
  format: string,
  variables: Record<string, string | number>,
): string {
  let message = format;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replaceAll(`{${key}}`, String(value));
  }
  return message.trim();
}

// Splits on the last space before the limit, hard-splitting words that are too long
export function splitChatMessage(
  message: string,
  maxLength = CHAT_MESSAGE_MAX_LENGTH,
): string[] {
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) return trimmed.length > 0 ? [trimmed] : [];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(" ", maxLength);
    if (splitAt <= 0) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}
