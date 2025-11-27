"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import headerlogo from "@/assets/logo-with-text-horizontal.png";

const tiers = [
  {
    id: "basic",
    name: "Basic",
    price: 25000,
    description: "Untuk mulai memantau konsumsi dan penghematan.",
    features: [
      "Tracker konsumsi & penghematan dasar",
      "Craving support dasar",
      "Akses pencapaian dan XP",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 35000,
    description: "Untuk dukungan AI dan insight yang lebih personal.",
    features: [
      "Semua fitur Basic",
      "AI craving support penuh",
      "Insight finansial & kesehatan mingguan",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 100000,
    description: "Untuk dukungan maksimal dan akses profesional.",
    features: [
      "Semua fitur Standard",
      "Prioritas konsultasi profesional",
      "Fitur sosial & komunitas lengkap",
    ],
  },
];

const PricingPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      {/* Header template dengan tombol back */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/home")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Image src={headerlogo} alt="NIVO Logo" height={32} width={120} />
          </div>
        </div>
        <div className="text-sm font-semibold text-gray-700">Paket NIVO</div>
      </div>

      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-green-900 mb-2 text-center">
          Pilih Paket NIVO
        </h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          Sesuaikan dengan kebutuhan dan komitmenmu untuk berhenti merokok.
        </p>

        <div className="space-y-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-white rounded-2xl p-4 shadow-md border border-gray-100"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">{tier.name}</h2>
              <p className="text-2xl font-bold text-primary">
                Rp {tier.price.toLocaleString("id-ID")}
                <span className="text-xs text-gray-500 font-normal"> / bulan</span>
              </p>
            </div>
            <p className="text-xs text-gray-600 mb-3">{tier.description}</p>
            <ul className="text-xs text-gray-700 space-y-1 mb-3">
              {tier.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white text-sm py-2 rounded-lg">
              Pilih Paket {tier.name}
            </Button>
          </div>
        ))}
        </div>

        <p className="mt-4 text-[11px] text-gray-500 text-center">
          Pembayaran belum terhubung. Setelah memilih paket, kamu akan diarahkan ke
          langkah pembayaran di versi berikutnya.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
