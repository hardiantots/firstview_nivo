"use client";

import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/shared/layout/Sidebar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const DISTRACTIONS = [
  {
    id: 1,
    title: "Jalan Kaki 5 Menit",
    description:
      "Bangun dari tempat duduk, berjalanlah di sekitar ruangan atau koridor selama 3-5 menit sambil memperhatikan langkah dan napas.",
  },
  {
    id: 2,
    title: "Minum Air Perlahan",
    description:
      "Ambil segelas air putih. Minum perlahan, rasakan suhu air, dan fokus pada sensasi di mulut dan tenggorokan.",
  },
  {
    id: 3,
    title: "Regangan Tubuh Sederhana",
    description:
      "Lakukan peregangan ringan untuk leher, bahu, dan punggung. Tahan setiap posisi selama 10-15 detik sambil bernapas pelan.",
  },
  {
    id: 4,
    title: "Tuliskan Pikiran",
    description:
      "Selama beberapa menit, tuliskan apa yang Anda rasakan dan apa yang memicu keinginan merokok hari ini.",
  },
  {
    id: 5,
    title: "Alihkan dengan Aktivitas Kecil",
    description:
      "Lakukan tugas singkat seperti merapikan meja, mencuci satu-dua piring, atau menyusun ulang barang kecil di sekitar Anda.",
  },
];

const DistractionsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  const selected = DISTRACTIONS.find((d) => d.id === selectedId) ?? DISTRACTIONS[0];

  return (
    <div className="nivo-standalone relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="nivo-page">
        <motion.h1
          className="text-2xl font-semibold text-primary"
          initial={{ opacity: .65, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Distraksi 5 Menit
        </motion.h1>

        <motion.section
          className="nivo-glass p-5 space-y-3"
          initial={{ opacity: .65, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-gray-700">
            Ide-ide distraksi singkat ini diadaptasi dari rekomendasi berbagai
            program berhenti merokok dan teknik manajemen stres. Tujuannya adalah
            memberi jeda beberapa menit sampai gelombang keinginan merokok mereda.
          </p>
          <p className="text-xs text-gray-500">
            Pilih salah satu aktivitas, lakukan selama kurang lebih 5 menit, dan
            fokus pada apa yang Anda kerjakan, bukan pada rokok.
          </p>
        </motion.section>

        <section className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 sm:mx-0 px-3 sm:px-0">
            {DISTRACTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected.id === item.id}
                className={`nivo-button min-h-11 flex-shrink-0 px-3 py-2 rounded-full text-xs border whitespace-nowrap ${{
                  true: "bg-primary text-white border-primary",
                  false: "bg-secondary/10 text-accent border-secondary/25 hover:bg-secondary/20",
                }[String(selected.id === item.id) as "true" | "false"]}`}
              >
                {item.title}
              </button>
            ))}
          </div>

          <motion.div
            key={selected.id}
            className="nivo-glass nivo-glass-warm p-6 text-foreground space-y-3"
            initial={{ opacity: .65, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold">{selected.title}</h2>
            <p className="text-sm text-foreground">{selected.description}</p>
            <p className="text-xs text-muted-foreground">
              Setelah selesai, perhatikan apakah intensitas keinginan merokok
              menurun. Jika masih kuat, Anda bisa mencoba latihan napas 4-7-8
              atau menghubungi tenaga profesional.
            </p>
          </motion.div>
        </section>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => router.push("/craving-support")}
        >
          Kembali ke Craving Support
        </Button>
      </main>
    </div>
  );
};

export default DistractionsPage;
