'use client'

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-with-text-horizontal.png';
import assetsfirstpage from '@/assets/assetsfirstpage.png';

const JourneyStartScreen = () => {
  const router = useRouter();

  const handleSelection = (choice: 'starting' | 'already_quit') => {
    if (choice === 'starting') {
      router.push('/time-selection');
    } else {
      router.push('/set-quit-date-past');
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="w-full max-w-md mx-auto p-6 relative min-h-screen flex flex-col">
        <div className="flex justify-center mb-8 pt-8">
          <Image src={logo} alt="NIVO Logo" height={40} width={160} />
        </div>

        <div className="animate-fade-in relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-lg font-bold text-foreground leading-tight mb-4">
              Di mana posisi Anda saat ini?
            </h1>
          </div>

          <div className="space-y-4">
            <Button
              variant="default"
              className="w-full h-auto py-4 flex flex-col items-start text-left rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => handleSelection('starting')}
            >
              <span className="font-semibold text-lg">Baru Akan Memulai</span>
              <p className="text-sm text-primary-foreground/80 mt-1 whitespace-normal">
                Saya ingin menetapkan target tanggal untuk berhenti merokok di masa depan.
              </p>
            </Button>
            <Button
              variant="default"
              className="w-full h-auto py-4 flex flex-col items-start text-left rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => handleSelection('already_quit')}
            >
              <span className="font-semibold text-lg">Sudah Berhenti</span>
              <p className="text-sm text-primary-foreground/80 mt-1 whitespace-normal">
                Saya sudah berhenti merokok dan ingin melacak progres serta mendapatkan dukungan.
              </p>
            </Button>
          </div>
        </div>
        {/* Background Image */}
        <Image
          src={assetsfirstpage}
          alt="Decorative background graphic"
          width={240}
          height={240}
          className="absolute bottom-0 right-0 max-w-xs pointer-events-none opacity-80"
        />
      </div>
    </div>
  );
};

export default JourneyStartScreen;