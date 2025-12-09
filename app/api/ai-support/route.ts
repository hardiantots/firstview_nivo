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
    
    // Build context-aware prompt optimized for Gemini
    const prompt = `Kamu adalah NIVO AI Assistant yang membantu user mengatasi craving rokok.

KONTEKS USER:
- Lokasi: ${location}
- Situasi: ${situation}
- Emosi: ${emotionsText}
- Intensitas craving: ${intensity}/5
- Motivasi berhenti: ${motivations?.join(', ') || 'kesehatan'}

INSTRUKSI OUTPUT (IKUTI FORMAT INI PERSIS):

[Tulis 1-2 kalimat yang mengakui perasaan user dengan empati. Contoh: "Saya paham bahwa ${situation} bisa memicu keinginan merokok. Perasaan ${emotionsText} yang kamu alami itu wajar."]

Langkah yang bisa dilakukan sekarang:
• [Aksi fisik: Contoh - Keluar dari ruangan sekarang, jalan ke tempat lain, atau lakukan 10 push-up]
• [Teknik coping: ${relevantStrategies || 'Pernapasan 4-7-8 (tarik 4 detik, tahan 7 detik, hembuskan 8 detik)'}]
• [Strategi mental: Contoh - Hitung mundur dari 100, atau sebutkan 5 hal yang kamu lihat di sekitar]

[1 kalimat transisi. Contoh (hasilkan juga variasi kalimat lainnya): "NIVO Diffuser juga bisa membantu mengatasi craving ini dengan kandungan aktif yang terbukti efektif."]

Kandungan yang cocok untuk kondisi kamu:
• [Pilih 3 kandungan spesifik dari list ini dengan penjelasan singkat dan bersumber dari jurnal reputasi tinggi & terkenal (sertakan linknya jika perlu): Vitamin C (antioksidan untuk radikal bebas rokok), Green Tea Extract (menenangkan dan anti-stress), L-Theanine (merangsang dopamin pengganti nikotin), Blackpapermint (mengurangi kecemasan), atau Menthol (menurunkan hormon kortisol)]

Cara pakai: Hirup ${intensity <= 2 ? '2-3' : intensity === 3 ? '4-5' : '6-8'} kali, tahan 3-5 detik, hembuskan perlahan. Ulangi setiap kali craving muncul.

[1-2 kalimat yang mengaitkan dengan motivasi user (${motivations?.join(' dan ') || 'kesehatan'}). Contoh: "Ingat motivasimu untuk ${motivations?.[0] || 'kesehatan'}. Craving ini akan lewat dalam 5-10 menit - kamu bisa melewatinya!"]

ATURAN FORMATTING PENTING:
1. WAJIB gunakan bullet point (•) untuk BAGIAN 2 dan isian kandungan di BAGIAN 3
2. BAGIAN 1 dan 4 harus paragraf narasi (TIDAK pakai bullet)
3. Total output maksimal 300 kata
4. Gunakan kata "kamu", JANGAN "Anda"
5. Pisahkan setiap bagian dengan 1 line break kosong
6. JANGAN tambahkan numbering (1., 2., 3.) atau header tambahan di output
7. Langsung mulai dengan teks validasi emosi
8. Gunakan karakter bullet point (•) yang eksplisit, bukan dash (-)`;


    const aiModel = process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
    
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
