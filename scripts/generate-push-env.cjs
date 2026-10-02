const { createECDH, randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const subject = process.argv[2];
if (!subject || !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)) {
  process.stderr.write('Gunakan: node scripts/generate-push-env.cjs mailto:admin@domain-anda.com\n');
  process.exit(1);
}
const key = createECDH('prime256v1'); key.generateKeys();
const text = ['NIVO_PUSH_READY=false', 'NIVO_VAPID_PUBLIC_KEY=' + key.getPublicKey().toString('base64url'), 'NIVO_VAPID_PRIVATE_KEY=' + key.getPrivateKey().toString('base64url'), 'NIVO_VAPID_SUBJECT=' + subject, 'NIVO_PUSH_CRON_SECRET=' + randomBytes(32).toString('hex'), ''].join('\n');
try {
  writeFileSync('.env.push.local', text, { flag: 'wx', mode: 0o600 });
  process.stdout.write('Kunci tersimpan di .env.push.local. Pengiriman masih nonaktif. Jangan commit atau bagikan file ini.\n');
} catch (error) {
  if (error.code === 'EEXIST') process.stderr.write('.env.push.local sudah ada; kunci lama tidak ditimpa.\n');
  else process.stderr.write('File kunci belum dapat disimpan. Periksa izin folder.\n');
  process.exitCode = 1;
}
