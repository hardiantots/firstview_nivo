import webpush from 'npm:web-push@3.6.7';

Deno.test('Deno generates an encrypted Web Push request with VAPID authentication without sending it', async () => {
  const vapid = webpush.generateVAPIDKeys();
  const receiver = webpush.generateVAPIDKeys();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const auth = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = JSON.stringify({ tag: 'fixture-neutral' });
  const details = webpush.generateRequestDetails({ endpoint: 'https://fcm.googleapis.com/fcm/send/fixture-not-sent', keys: { p256dh: receiver.publicKey, auth } }, payload, {
    vapidDetails: { subject: 'mailto:fixture@example.invalid', publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 300, contentEncoding: 'aes128gcm',
  });
  const request = new Request(details.endpoint, { method: 'POST', headers: details.headers, body: details.body, redirect: 'error' });
  if (request.headers.get('content-encoding') !== 'aes128gcm' || !request.headers.get('authorization')?.startsWith('vapid ') || request.headers.get('ttl') !== '300') throw new Error('Encrypted VAPID request was not generated');
  const encrypted = new Uint8Array(await request.arrayBuffer());
  if (encrypted.length <= payload.length || new TextDecoder().decode(encrypted).includes('fixture-neutral')) throw new Error('Payload was not encrypted');
});
