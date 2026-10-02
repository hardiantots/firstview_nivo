import { supabase } from './supabase';

const key = 'nivo.recovery';
function remember(userId: string) {
  sessionStorage.setItem(key, JSON.stringify({ userId, until: Date.now() + 15 * 60 * 1000 }));
}
export async function verifyRecoveryOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error || !data.user || !data.session) throw new Error('Kode pemulihan tidak valid atau sudah kedaluwarsa.');
  remember(data.user.id);
}
export async function prepareRecovery(url: string) {
  const parsed = new URL(url);
  if (parsed.searchParams.has('error')) throw new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa.');
  const code = parsed.searchParams.get('code');
  const hash = new URLSearchParams(parsed.hash.slice(1));
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user || !data.session) throw new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa.');
    remember(data.user.id);
  } else if (hash.get('type') === 'recovery') {
    const access_token = hash.get('access_token'), refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) throw new Error('Tautan pemulihan tidak lengkap.');
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error || !data.user || !data.session) throw new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa.');
    remember(data.user.id);
  }
  let marker;
  try { marker = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { /* Invalid local marker. */ }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || marker?.userId !== session.user.id || marker.until < Date.now()) {
    throw new Error('Mulai pemulihan password dari email atau kode yang baru.');
  }
}
export async function updateRecoveryPassword(password: string) {
  if (password.length < 8 || password.length > 128) throw new Error('Password harus 8–128 karakter.');
  await prepareRecovery(window.location.origin + '/reset-password');
  const { data, error: verificationError } = await supabase.auth.getUser();
  const marker = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (verificationError || !data.user || data.user.id !== marker?.userId) throw new Error('Sesi pemulihan tidak valid.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error('Password belum berhasil diubah. Silakan coba lagi.');
  sessionStorage.removeItem(key);
  localStorage.removeItem('resetEmail');
  localStorage.removeItem('otpToken');
}
