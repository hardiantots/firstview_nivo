"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import headerlogo from "@/assets/logo-with-text-horizontal.png";

const tiers = [
  {
    id: "free",
    name: "Freemium",
    price: 0,
    tier: "Freemium",
    tracking: "Basic",
    reward: false,
    ai: false,
    professional: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 25000,
    tier: "Starter",
    tracking: "Full",
    reward: "Limited",
    ai: "Light Insight",
    professional: false,
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 35000,
    tier: "Advanced",
    tracking: "Advanced",
    reward: "Premium",
    ai: "AI Craving Support",
    professional: false,
  },
  {
    id: "elite",
    name: "Elite",
    price: 100000,
    tier: "Elite",
    tracking: "Advanced",
    reward: "Advanced",
    ai: "AI Craving Support",
    professional: "✓ Konsultasi",
  },
];

const PricingPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      {/* Header template dengan tombol back */}
      <div className="bg-white px-3 sm:px-4 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/home")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Image src={headerlogo} alt="NIVO Logo" height={28} width={100} className="sm:h-8 sm:w-[120px]" />
          </div>
        </div>
        <div className="text-xs sm:text-sm font-semibold text-gray-700">Paket NIVO</div>
      </div>

      <div className="px-3 sm:px-4 py-6">
        <h1 className="text-lg sm:text-xl font-bold text-green-900 mb-2 text-center">
          Pilih Paket NIVO
        </h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          Sesuaikan dengan kebutuhan dan komitmenmu untuk berhenti merokok.
        </p>

        {/* Tabel Pricing */}
        <div className="overflow-x-auto mb-6 -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
          <div className="min-w-[600px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="col-span-1 p-3 border-r border-white/20">
                <p className="text-xs font-bold text-white">Harga</p>
              </div>
              <div className="col-span-1 p-3 border-r border-white/20">
                <p className="text-xs font-bold text-white">Tier</p>
              </div>
              <div className="col-span-1 p-3 border-r border-white/20">
                <p className="text-xs font-bold text-white">Tracking & Insight</p>
              </div>
              <div className="col-span-1 p-3 border-r border-white/20">
                <p className="text-xs font-bold text-white">Reward & Progress System</p>
              </div>
              <div className="col-span-1 p-3 border-r border-white/20">
                <p className="text-xs font-bold text-white">AI</p>
              </div>
              <div className="col-span-1 p-3">
                <p className="text-xs font-bold text-white">Professional</p>
              </div>
            </div>

            {/* Rows */}
            {tiers.map((tier, idx) => (
              <div
                key={tier.id}
                className={`grid grid-cols-6 ${
                  idx % 2 === 0 ? 'bg-green-50' : 'bg-white'
                } hover:bg-green-100/50 transition-colors`}
              >
                <div className="col-span-1 p-3 border-r border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-900">
                    {tier.price === 0 ? 'Free' : `${tier.price / 1000}K`}
                  </p>
                </div>
                <div className="col-span-1 p-3 border-r border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-800">{tier.tier}</p>
                </div>
                <div className="col-span-1 p-3 border-r border-t border-gray-200">
                  <p className="text-xs text-gray-700">{tier.tracking}</p>
                </div>
                <div className="col-span-1 p-3 border-r border-t border-gray-200 flex items-center justify-center">
                  {tier.reward === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <p className="text-xs text-gray-700">{tier.reward}</p>
                  )}
                </div>
                <div className="col-span-1 p-3 border-r border-t border-gray-200 flex items-center justify-center">
                  {tier.ai === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <p className="text-xs text-gray-700">{tier.ai}</p>
                  )}
                </div>
                <div className="col-span-1 p-3 border-t border-gray-200 flex items-center justify-center">
                  {tier.professional === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <p className="text-xs text-gray-700">{tier.professional}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Friendly Cards (visible on small screens) */}
        <div className="lg:hidden space-y-4 mb-6">
          {tiers.map((tier) => (
            <div
              key={`mobile-${tier.id}`}
              className="bg-white rounded-2xl p-4 shadow-md border border-gray-200"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">{tier.name}</h2>
                <p className="text-xl font-bold text-primary">
                  {tier.price === 0 ? 'Gratis' : `Rp ${tier.price.toLocaleString("id-ID")}`}
                  {tier.price > 0 && <span className="text-xs text-gray-500 font-normal"> /bulan</span>}
                </p>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Tier:</span>
                  <span className="text-gray-900 font-semibold">{tier.tier}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Tracking:</span>
                  <span className="text-gray-900">{tier.tracking}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Reward:</span>
                  {tier.reward === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <span className="text-gray-900">{tier.reward}</span>
                  )}
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">AI:</span>
                  {tier.ai === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <span className="text-gray-900">{tier.ai}</span>
                  )}
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-600 font-medium">Professional:</span>
                  {tier.professional === false ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <span className="text-gray-900">{tier.professional}</span>
                  )}
                </div>
              </div>

              <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-white text-sm py-2 rounded-lg">
                Pilih {tier.name}
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
