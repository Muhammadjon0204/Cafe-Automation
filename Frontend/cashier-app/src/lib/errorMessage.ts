import { ApiError } from '@cafe/shared';

// Result.Failure(message) duplicates the message into Errors too, so naively
// joining message + errors doubles up the common single-error case. Only
// append entries that actually say something new.
export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const extra = error.errors.filter((e) => e && e !== error.message);
  return [error.message, ...extra].join(' ');
}
