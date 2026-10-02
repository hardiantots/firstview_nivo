// Accepts no identity, request, free text, or error object.
export function recordOperation(operation: 'profile.motivations', status: number, durationMs: number) {
  if (process.env.NIVO_OPERATIONAL_METRICS !== 'true') return;
  const outcome = status >= 500 ? 'unavailable' : status >= 400 ? 'rejected' : 'ok';
  const latency = durationMs < 250 ? 'lt250ms' : durationMs < 1000 ? 'lt1s' : durationMs < 5000 ? 'lt5s' : 'gte5s';
  console.info(JSON.stringify({ event: 'nivo.operation.v1', operation, outcome, latency }));
}
