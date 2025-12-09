import { NextRequest, NextResponse } from 'next/server';
import AI_CONFIG, { getIntensityLevel, getStrategiesForEmotions } from '@/config/ai-prompt-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location, situation, emotions, intensity, motivations } = body;

    // Validasi input
    if (!location || !situation || !emotions || !intensity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build emotion-specific context using AI_CONFIG
    const emotionsArray = Array.isArray(emotions) ? emotions : [emotions];
    const emotionsText = emotionsArray.join(', ');
    
    // Get intensity level and configuration
    const intensityLevel = getIntensityLevel(intensity);
    const intensityConfig = AI_CONFIG.intensityLevels[intensityLevel];
    
    // Build motivation context
    const motivationContext = motivations && motivations.length > 0 
      ? `User memiliki motivasi kuat untuk berhenti: ${motivations.join(' dan ')}. Gunakan ini sebagai pengingat yang powerful.` 
      : 'Ingatkan user tentang manfaat kesehatan jangka pendek dan panjang dari berhenti merokok.';
    
    // Get emotion-specific strategies from config
    const relevantStrategies = getStrategiesForEmotions(emotionsArray).join('; atau ');
    
    // Build context-aware prompt - concise version with bullet points
    const prompt = `KONTEKS: User di ${location}, situasi: ${situation}. Emosi: ${emotionsText}. Intensitas: ${intensity}/5. Motivasi: ${motivations?.join(', ') || 'kesehatan'}.

TUGAS: Buat respons singkat dan to the point dalam bahasa Indonesia:

1. VALIDASI (1-2 kalimat paragraf): Akui emosi user dengan empati. Jangan bertele-tele.

2. AKSI CEPAT (format bullet points):
Langkah yang bisa dilakukan sekarang:
• [Aksi fisik immediate - ganti lingkungan/aktivitas]
• [Teknik coping - ${relevantStrategies || 'teknik distraksi'}]
• [Strategi mental - grounding/mindfulness singkat]

3. NIVO DIFFUSER (1 kalimat intro + bullet points + saran hisapan):
[Kalimat transisi singkat tentang NIVO Diffuser sebagai bantuan]

Kandungan yang bekerja untuk kondisi kamu:
• [Pilih 2-3 kandungan paling relevan (cantumkan sumber jurnal terpercaya dan reputasi tinggi): Vitamin C (antioksidan & melawan radikal bebas asap rokok), Green Tea Extract (menenangkan & anti-stress), L-Theanine Extract (produksi dopamin pengganti nikotin), Blackpapermint Extract (kurangi kecemasan & tingkatkan relaksasi), Menthol Extract (turunkan hormon stres kortisol & perlambat metabolisme nikotin)]

Cara pakai: Hirup [X] kali (sesuaikan: 2-3 kali untuk intensitas rendah, 4-5 kali untuk sedang, 6-8 kali untuk tinggi), tahan 3-5 detik, hembuskan perlahan. Ulangi saat craving muncul.

4. MOTIVASI PENUTUP (1-2 kalimat paragraf): Kaitkan dengan motivasi user. Ingatkan craving lewat 5-10 menit.

ATURAN:
- Paragraf 1 & 4: narasi biasa
- Paragraf 2 & 3: WAJIB pakai bullet points (•)
- Maksimal 250 kata total
- Gunakan "kamu", langsung to the point
- Tiap bagian pisah dengan 1 line break`;


    const aiModel = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
    
    // System message for consistent behavior
    const systemMessage = `Kamu adalah NIVO AI, asisten kesehatan digital spesialis smoking cessation dengan keahlian dalam:
- Cognitive Behavioral Therapy (CBT) untuk addiction
- Motivational Interviewing techniques
- Mindfulness-based stress reduction
- Evidence-based smoking cessation strategies

Prinsip komunikasi:
1. Empati tinggi tanpa judgment
2. Saran berbasis bukti ilmiah
3. Actionable dan specific
4. Personal dan contextual
5. Supportive tapi realistic

Bahasa: Indonesia yang natural, hangat, professional. Gunakan "kamu" bukan "Anda".`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'NIVO App - Smoking Cessation Support',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500, // Further reduced for concise, to-the-point responses
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', response.status, errorData);
      
      let errorMessage = 'Failed to get AI response';
      if (response.status === 429) {
        errorMessage = 'AI sedang sibuk, silakan coba lagi dalam beberapa saat';
      } else if (response.status === 401) {
        errorMessage = 'API key tidak valid';
      } else if (response.status === 402) {
        errorMessage = 'Kredit API habis';
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memberikan saran saat ini.';

    return NextResponse.json({
      success: true,
      suggestion: aiMessage,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in AI support API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
