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
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState(MOCK_POSTS);

  const handlePost = () => {
    if (postText.trim()) {
      const newPost = {
        id: Date.now(),
        name: "Kamu",
        days: 0,
        text: postText,
      };
      setPosts([newPost, ...posts]);
      setPostText("");
    }
  };

  return (
    <div className="relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="px-3 sm:px-4 py-6 pt-20 space-y-6">
        <motion.h1
          className="text-xl font-bold text-green-900"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Komunitas NIVO
        </motion.h1>

        <motion.p
          className="text-sm text-gray-700"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Bagikan progresmu dan saling menyemangati dengan pengguna lain!
        </motion.p>

        {/* Post Input Form */}
        <motion.div
          className="bg-white rounded-2xl shadow-md border border-gray-100 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Bagikan pengalaman atau tipsmu berhenti merokok..."
            className="w-full h-24 sm:h-20 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {postText.length}/500 karakter
            </span>
            <button
              onClick={handlePost}
              disabled={!postText.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Posting
            </button>
          </div>
        </motion.div>

        <section className="space-y-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <motion.article
                key={post.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="font-semibold text-gray-800">{post.name}</span>
                  {post.days > 0 && <span>Streak {post.days} hari</span>}
                </div>
                <p className="text-sm text-gray-800">{post.text}</p>
              </motion.article>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Belum ada postingan. Jadilah yang pertama berbagi!
            </p>
          )}
        </section>

        <p className="text-[11px] text-gray-500">
          💡 Fitur ini masih dalam pengembangan. Konten akan disaring dan dimoderasi
          untuk menjaga keamanan dan kenyamanan pengguna.
        </p>
      </main>
    </div>
  );
};

export default CommunityPage;
