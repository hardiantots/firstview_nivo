'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedRequest } from '@/shared/journey/client';
import { Room, RoomAction } from './domain';
export function useAudio(roomId: string, room: Room | null, actor: string, send: (action: RoomAction) => Promise<void>) {
  const [status, setStatus] = useState('Belum ada panggilan'), [muted, setMuted] = useState(false), [active, setActive] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null), media = useRef<MediaStream | null>(null), audio = useRef<HTMLAudioElement | null>(null), call = useRef(''), handled = useRef(new Set<string>()), generation = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null), processing = useRef(false), committed = useRef(false), observedOffer = useRef(false);
  const stop = useCallback(() => {
    generation.current++; if (timer.current) clearTimeout(timer.current); pc.current?.close(); pc.current = null;
    media.current?.getTracks().forEach(t => t.stop()); media.current = null;
    if (audio.current) audio.current.srcObject = null; call.current = ''; handled.current.clear(); committed.current = false; observedOffer.current = false; setActive(false); setMuted(false);
  }, []);
  useEffect(() => () => { stop(); }, [roomId, stop]);
  const metric = (event: 'connected' | 'disconnected' | 'failed' | 'no_answer' | 'mic_denied') => send({ type: 'metric', event }).catch(() => {});
  const end = async () => { const callId = call.current; stop(); setStatus('Panggilan berakhir. Chat tetap tersedia.'); if (callId) await send({ type: 'signal', kind: 'hangup', callId, data: '' }).catch(() => {}); };
  const offer = room?.signals.find(s => s.kind === 'offer' && s.sender !== actor && Date.now() - Date.parse(s.at) < 60000);
  const start = async (incoming = false) => {
    if (pc.current || active) return;
    const current = ++generation.current; setActive(true); setStatus('Meminta izin mikrofon…');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Audio memerlukan HTTPS dan dukungan mikrofon browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (generation.current !== current) { stream.getTracks().forEach(t => t.stop()); return; }
      media.current = stream;
      const ice = await authenticatedRequest(`/api/consultation/${roomId}?ice=1`);
      if (generation.current !== current) { stream.getTracks().forEach(t => t.stop()); return; }
      const peer = new RTCPeerConnection({ iceServers: ice.iceServers, iceTransportPolicy: 'relay' }); pc.current = peer;
      call.current = incoming && offer ? offer.callId : crypto.randomUUID(); const callId = call.current;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      let ready = false; const candidates: string[] = [];
      peer.onicecandidate = e => { if (e.candidate) { const data = JSON.stringify(e.candidate.toJSON()); if (ready) send({ type: 'signal', kind: 'ice', callId, data }).catch(() => setStatus('Sinyal gagal. Akhiri lalu coba lagi atau gunakan chat.')); else candidates.push(data); } };
      peer.ontrack = e => { if (audio.current) { audio.current.srcObject = e.streams[0]; audio.current.play().catch(() => setStatus('Tekan Putar audio untuk mendengar lawan bicara.')); } };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') { if (timer.current) clearTimeout(timer.current); setStatus('Audio terhubung'); metric('connected'); }
        if (peer.connectionState === 'disconnected') { metric('disconnected'); setStatus('Jaringan terputus; mencoba tersambung kembali…'); timer.current = setTimeout(() => { end(); setStatus('Sambungan terputus. Gunakan chat atau panggil ulang.'); }, 15000); }
        if (peer.connectionState === 'failed') { metric('failed'); end(); setStatus('Sambungan gagal. Chat tetap tersedia.'); }
      };
      if (incoming && offer) {
        await peer.setRemoteDescription(JSON.parse(offer.data)); handled.current.add(offer.id);
        await peer.setLocalDescription(await peer.createAnswer());
        await send({ type: 'signal', kind: 'answer', callId, data: JSON.stringify(peer.localDescription) });
      } else {
        await peer.setLocalDescription(await peer.createOffer());
        await send({ type: 'signal', kind: 'offer', callId, data: JSON.stringify(peer.localDescription) });
      }
      committed.current = true; ready = true;
      for (const data of candidates) await send({ type: 'signal', kind: 'ice', callId, data });
      if (peer.connectionState === 'connected') { setStatus('Audio terhubung'); return; }
      setStatus(incoming ? 'Menyambungkan audio…' : 'Memanggil, menunggu jawaban…');
      timer.current = setTimeout(() => { metric('no_answer'); end(); setStatus('Panggilan tidak tersambung dalam 60 detik. Gunakan chat atau coba lagi.'); }, 60000);
    } catch (e) { if (e.name === 'NotAllowedError') metric('mic_denied'); else metric('failed'); stop(); setStatus(e.name === 'NotAllowedError' ? 'Izin mikrofon ditolak. Kamu tetap bisa menggunakan chat.' : e.message || 'Audio belum tersambung. Gunakan chat.'); }
  };
  useEffect(() => {
    const peer = pc.current; if (!peer || !room || processing.current || !committed.current) return;
    // Signaling expires after two minutes. A connected peer continues carrying media independently.
    const present = room.signals.some(s => s.kind === 'offer' && s.callId === call.current);
    if (present) observedOffer.current = true;
    if (room.state === 'ended' || (observedOffer.current && peer.connectionState !== 'connected' && !present)) { stop(); setStatus('Panggilan berakhir atau sinyal kedaluwarsa.'); return; }
    processing.current = true;
    (async () => {
      for (const signal of room.signals.filter(s => s.sender !== actor && s.callId === call.current && !handled.current.has(s.id))) {
        if (signal.kind === 'answer' && !peer.remoteDescription) await peer.setRemoteDescription(JSON.parse(signal.data));
        if (signal.kind === 'ice') { if (!peer.remoteDescription) continue; await peer.addIceCandidate(JSON.parse(signal.data)); }
        handled.current.add(signal.id);
      }
    })().catch(() => setStatus('Sinyal audio gagal. Akhiri lalu panggil ulang atau gunakan chat.')).finally(() => { processing.current = false; });
  }, [room, actor, stop]);
  const toggleMute = () => { media.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(!muted); };
  return { audio, status, muted, active, incoming: !!offer, start, end, toggleMute };
}
