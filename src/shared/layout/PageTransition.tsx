'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!surface.current?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = surface.current.animate([{ opacity: .72 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    return () => animation.cancel();
  }, [pathname]);
  return <div ref={surface} className="nivo-route-surface">{children}</div>;
}
