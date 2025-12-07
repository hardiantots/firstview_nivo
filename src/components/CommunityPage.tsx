"use client";

import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { motion } from "framer-motion";

const MOCK_POSTS = [
  {
    id: 1,
    name: "Andi, 27 thn",
    days: 5,
    text: "Hari ke-5 tanpa rokok. Masih berat kalau lagi nongkrong, tapi bantu banget fokus ke uang yang bisa dihemat.",
  },
  {
    id: 2,
    name: "Sinta, 30 thn",
    days: 21,
    text: "Kalau craving datang, aku pakai napas 4-7-8 dan jalan kecil di kantor. Lumayan bikin kepala lebih ringan.",
  },
];

const CommunityPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="px-3 sm:px-4 py-6 space-y-6">
        <motion.h1
          className="text-xl font-bold text-green-900"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Komunitas NIVO (Preview)
        </motion.h1>

        <motion.p
          className="text-sm text-gray-700"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Di versi penuh nanti, kamu bisa membagikan progres dan saling
          menyemangati dengan pengguna lain. Untuk sekarang, berikut beberapa
          contoh cerita yang biasa muncul di komunitas berhenti merokok.
        </motion.p>

        <section className="space-y-3">
          {MOCK_POSTS.map((post) => (
            <motion.article
              key={post.id}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span className="font-semibold text-gray-800">{post.name}</span>
                <span>Streak {post.days} hari</span>
              </div>
              <p className="text-sm text-gray-800">{post.text}</p>
            </motion.article>
          ))}
        </section>

        <p className="text-[11px] text-gray-500">
          Fitur komunitas ini hanya contoh tampilan dan alur. Nantinya, konten
          akan disaring dan dimoderasi untuk menjaga keamanan dan kenyamanan
          pengguna.
        </p>
      </main>
    </div>
  );
};

export default CommunityPage;
