'use client'

import Link from "next/link";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="nivo-glass nivo-glass-warm nivo-error-card">
        <h1 className="mb-4 text-4xl font-bold text-primary">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Halaman ini belum ditemukan.</p>
        <Link href="/" className="nivo-action nivo-action-secondary">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
