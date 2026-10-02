import { notFound } from 'next/navigation';
import BuddyJoin from '@/features/buddy/BuddyJoin';

export const metadata = { title: 'Undangan pendamping | NIVO', referrer: 'no-referrer' as const, robots: { index: false, follow: false } };
export default async function BuddyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  return <div className="nivo-page"><BuddyJoin token={token} /></div>;
}
