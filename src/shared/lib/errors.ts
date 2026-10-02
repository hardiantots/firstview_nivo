export function errorMessage(cause: unknown, fallback = 'Permintaan belum berhasil.'): string {
  if (
    cause &&
    typeof cause === 'object' &&
    'message' in cause &&
    typeof cause.message === 'string'
  ) {
    return cause.message;
  }
  return fallback;
}
