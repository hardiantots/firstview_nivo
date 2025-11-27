/**
 * AI Prompt Configuration for NIVO
 * Customize AI behavior and responses here
 */

export const AI_CONFIG = {
  // Model Selection
  models: {
    // Free models (for development)
    free: {
      default: 'meta-llama/llama-3.2-3b-instruct:free',
      alternative: 'google/gemini-2.0-flash-exp:free',
    },
    // Paid models (for production)
    paid: {
      premium: 'anthropic/claude-3.5-sonnet', // Best quality
      balanced: 'openai/gpt-4o-mini', // Good balance
      fast: 'anthropic/claude-3-haiku', // Fast & affordable
    },
  },

  // Response parameters
  parameters: {
    temperature: 0.7, // Creativity level (0.0-1.0)
    maxTokens: 600, // Maximum response length
    topP: 0.9, // Nucleus sampling
  },

  // Emotion-specific coping strategies
  emotionStrategies: {
    stres: {
      name: 'Stres',
      technique: 'teknik grounding 5-4-3-2-1',
      description: 'Sebutkan 5 hal yang kamu lihat, 4 yang dengar, 3 yang sentuh, 2 yang cium, 1 yang kecap',
      duration: '3-5 menit',
    },
    cemas: {
      name: 'Cemas',
      technique: 'pernapasan kotak (box breathing)',
      description: 'Tarik napas 4 detik, tahan 4 detik, hembuskan 4 detik, tahan 4 detik',
      duration: '2-3 menit',
    },
    marah: {
      name: 'Marah',
      technique: 'aktivitas fisik intensif',
      description: 'Push-up 10x, jumping jacks 20x, atau jalan cepat keliling ruangan',
      duration: '5 menit',
    },
    sedih: {
      name: 'Sedih',
      technique: 'social connection',
      description: 'Hubungi teman/keluarga atau tulis jurnal tentang perasaan',
      duration: '10 menit',
    },
    bosan: {
      name: 'Bosan',
      technique: 'mental engagement',
      description: 'Puzzle, game mobile, baca artikel menarik, atau tonton video edukatif',
      duration: '10 menit',
    },
    senang: {
      name: 'Senang',
      technique: 'positive reinforcement',
      description: 'Rayakan dengan aktivitas sehat: olahraga ringan, musik favorit, atau catat achievement',
      duration: '5-10 menit',
    },
    netral: {
      name: 'Netral',
      technique: 'mindfulness meditation',
      description: 'Fokus pada napas, scan tubuh dari kepala ke kaki, atau mindful walking',
      duration: '5 menit',
    },
  },

  // Intensity-based response adjustments
  intensityLevels: {
    low: {
      range: [1, 2],
      tone: 'encouraging',
      focus: 'reinforcement positif dan pencegahan',
      urgency: 'low',
    },
    medium: {
      range: [3],
      tone: 'supportive',
      focus: 'strategi coping dan distraksi',
      urgency: 'medium',
    },
    high: {
      range: [4, 5],
      tone: 'urgent but calm',
      focus: 'immediate action dan crisis management',
      urgency: 'high',
    },
  },

  // Common smoking triggers and counter-strategies
  triggerResponses: {
    'setelah makan': {
      strategy: 'Gosok gigi segera, kunyah permen mint, atau minum teh herbal',
      why: 'Mengganti ritual post-meal dengan aktivitas oral yang berbeda',
    },
    'minum kopi': {
      strategy: 'Ganti kopi dengan teh hijau atau air dingin dengan lemon',
      why: 'Memutus asosiasi kopi-rokok',
    },
    'melihat orang lain merokok': {
      strategy: 'Jauhi area tersebut, hubungi support buddy, atau review progress di app',
      why: 'Mengurangi visual trigger dan social pressure',
    },
    'sendirian atau bosan': {
      strategy: 'Call teman, main game, atau lakukan hobby yang engaging',
      why: 'Mengisi kekosongan waktu dengan aktivitas alternatif',
    },
  },

  // Scientific facts for motivation
  healthFacts: [
    {
      timeframe: '20 menit',
      benefit: 'Tekanan darah dan detak jantung kembali normal',
    },
    {
      timeframe: '12 jam',
      benefit: 'Level karbon monoksida dalam darah kembali normal',
    },
    {
      timeframe: '2-12 minggu',
      benefit: 'Sirkulasi darah membaik dan fungsi paru meningkat',
    },
    {
      timeframe: '1-9 bulan',
      benefit: 'Batuk berkurang dan napas lebih lega',
    },
    {
      timeframe: '1 tahun',
      benefit: 'Risiko penyakit jantung turun 50%',
    },
  ],

  // System personality traits
  personality: {
    empathy: 'high',
    judgment: 'zero',
    tone: 'warm, professional, personal',
    approach: 'evidence-based with compassion',
    language: 'Indonesian - natural, conversational',
    pronouns: 'kamu (not Anda)',
  },

  // Response structure template
  responseStructure: {
    validation: {
      purpose: 'Acknowledge emotions without judgment',
      length: '1 paragraph, 2-3 sentences',
      example: 'Saya memahami bahwa [situasi] membuatmu merasa [emosi]. Ini adalah respons yang natural.',
    },
    analysis: {
      purpose: 'Explain why this triggers craving',
      length: '1 paragraph, 2-3 sentences',
      includeScience: true,
      keywords: ['dopamine', 'habit loop', 'neural pathway', 'trigger-response pattern'],
    },
    action: {
      purpose: 'Immediate actionable steps',
      length: '1-2 paragraphs',
      steps: 3,
      priority: ['physical change', 'coping technique', 'distraction'],
      specificity: 'very high',
    },
    motivation: {
      purpose: 'Link to user\'s personal motivations',
      length: '1 paragraph',
      include: ['user motivations', 'progress reminder', 'health fact'],
    },
    closing: {
      purpose: 'Supportive encouragement',
      length: '1-2 sentences',
      tone: 'realistic optimism',
      reminder: 'craving is temporary (5-10 minutes)',
    },
  },

  // Quality control guidelines
  qualityGuidelines: {
    avoid: [
      'Generic advice',
      'Bullet points atau numbering',
      'Kalimat robotik atau template',
      'Judgment atau blame',
      'Medical diagnosis',
      'Guarantee atau janji unrealistic',
    ],
    mustInclude: [
      'User\'s specific context (lokasi, situasi, emosi)',
      'Emotion validation',
      'Concrete actionable steps',
      'Personal motivation reference',
      'Realistic timeframe',
    ],
    style: [
      'Natural conversational flow',
      'Short paragraphs (3-4 sentences max)',
      'Active voice',
      'Present tense for immediacy',
      'Second person (kamu)',
    ],
  },
};

// Helper function to get intensity level
export function getIntensityLevel(intensity: number): keyof typeof AI_CONFIG.intensityLevels {
  if (intensity <= 2) return 'low';
  if (intensity === 3) return 'medium';
  return 'high';
}

// Helper function to get strategies for emotions
export function getStrategiesForEmotions(emotions: string[]): string[] {
  return emotions
    .map(emotion => AI_CONFIG.emotionStrategies[emotion.toLowerCase() as keyof typeof AI_CONFIG.emotionStrategies])
    .filter(Boolean)
    .map(strategy => `${strategy.technique} (${strategy.description})`);
}

// Helper function to select relevant health fact based on user progress
export function getRelevantHealthFact(daysSmokeFreе: number): string {
  const fact = AI_CONFIG.healthFacts.find((f, i) => {
    const nextFact = AI_CONFIG.healthFacts[i + 1];
    const currentDays = parseDays(f.timeframe);
    const nextDays = nextFact ? parseDays(nextFact.timeframe) : Infinity;
    return daysSmokeFreе >= currentDays && daysSmokeFreе < nextDays;
  }) || AI_CONFIG.healthFacts[AI_CONFIG.healthFacts.length - 1];

  return `Setelah ${fact.timeframe} bebas rokok: ${fact.benefit}`;
}

function parseDays(timeframe: string): number {
  if (timeframe.includes('menit')) return 0;
  if (timeframe.includes('jam')) return 0;
  if (timeframe.includes('minggu')) {
    const weeks = parseInt(timeframe.match(/\d+/)?.[0] || '0');
    return weeks * 7;
  }
  if (timeframe.includes('bulan')) {
    const months = parseInt(timeframe.match(/\d+/)?.[0] || '0');
    return months * 30;
  }
  if (timeframe.includes('tahun')) {
    const years = parseInt(timeframe.match(/\d+/)?.[0] || '0');
    return years * 365;
  }
  return 0;
}

export default AI_CONFIG;
