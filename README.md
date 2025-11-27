# 🚭 NIVO App - Smoking Cessation Support Application

NIVO is a comprehensive digital health application designed to help users quit smoking through AI-powered support, progress tracking, and behavioral insights.

## ✨ Features

- 🤖 **AI-Powered Craving Support** - Real-time personalized advice using GPT-4o-mini
- 📊 **Progress Tracking** - Visual dashboards for consumption, savings, and health milestones
- 🎯 **Goal Setting** - Pre-quit preparation and post-quit maintenance tracking
- 📈 **Analytics** - Daily consumption logs, financial savings calculator, streak tracking
- 🏆 **Achievements** - Unlock badges and rewards for milestones
- 🧠 **Craving History** - Log and review past cravings with AI suggestions
- 💊 **NIVO Diffuser Integration** - Recommendations for nicotine-free alternatives

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** OpenRouter (GPT-4o-mini)
- **Deployment:** Vercel
- **Charts:** Recharts
- **Animations:** Framer Motion

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenRouter API key

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/hardiantots/firstview_nivo.git
cd firstview_nivo/client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual values
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AI_MODEL=openai/gpt-4o-mini
```

### 4. Set Up Supabase Database

Run the SQL scripts in `database/` folder in your Supabase SQL Editor:

```sql
-- 1. Create tables
-- 2. Set up Row Level Security (RLS)
-- 3. Create necessary indexes
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📦 Project Structure

```
client/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   └── ai-support/      # AI suggestion endpoint
│   ├── (main)/              # Main app pages (with layout)
│   │   ├── home/
│   │   ├── tracker/
│   │   ├── craving-support/
│   │   ├── pencapaian/
│   │   └── contact-professional/
│   ├── signin/              # Authentication pages
│   └── layout.tsx           # Root layout
├── src/
│   ├── components/          # React components
│   │   ├── HomePage/
│   │   ├── TrackerPage/
│   │   ├── CravingSupportPage/
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Utilities
│   │   ├── db/              # Database queries
│   │   ├── supabase.ts      # Supabase client
│   │   └── utils.ts         # Helper functions
│   └── config/              # Configuration files
├── public/                  # Static assets
├── database/                # SQL schemas and migrations
└── scripts/                 # Deployment and utility scripts
```

## 🚀 Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deployment

See detailed guides:

- 📖 **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - Quick deployment checklist
- 📖 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- 🔒 **[SECURITY.md](SECURITY.md)** - Security best practices

### Steps Summary:

1. **Connect GitHub to Vercel**
2. **Set Environment Variables in Vercel**
3. **Update Supabase Redirect URLs**
4. **Deploy**

```bash
# Or use Vercel CLI
vercel --prod
```

## 🔐 Security

- ✅ Environment variables are NOT committed (see `.gitignore`)
- ✅ Supabase Row Level Security (RLS) enabled
- ✅ API keys are server-side only
- ✅ HTTPS enforced in production
- ✅ Security headers configured

**Never commit `.env.local` or any file containing secrets!**

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

## 📊 Database Schema

Main tables:

- `user_profile` - User information
- `smoke_free_journey` - User journey status (PRE_QUIT/POST_QUIT)
- `daily_consumption_logs` - Daily cigarette consumption
- `craving_logs` - Craving events with context
- `ai_suggestions` - AI-generated advice history
- `user_journey_stats` - Aggregated statistics

## 🤖 AI Integration

NIVO uses OpenRouter to access multiple AI models:

- **Default:** GPT-4o-mini (~$0.0001/request)
- **Alternative:** Claude 3.5 Sonnet, Gemini Flash 1.5

AI provides:

- Personalized craving support
- Context-aware coping strategies
- NIVO Diffuser usage recommendations
- Motivational messaging

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Check environment variables
node scripts/check-env.js

# Test build
npm run build
npm start
```

## 📝 Development Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
node scripts/check-env.js # Verify environment variables
```

## 🌟 Key Features Explained

### AI-Powered Craving Support

- Real-time response generation
- Emotion and situation analysis
- Personalized coping strategies
- NIVO Diffuser recommendations with dosage

### Progress Tracking

- **PRE-QUIT:** Countdown to quit date, daily consumption reduction
- **POST-QUIT:** Streak counter, cigarettes avoided, money saved

### Health Milestones

- 20 minutes: Heart rate normalizes
- 12 hours: Carbon monoxide levels drop
- 2 weeks: Circulation improves
- 1 month: Lung function increases
- And more...

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues or questions:

- Create an issue on GitHub
- Contact: [your-email@example.com]

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Hosting and deployment
- **OpenRouter** - AI model access
- **shadcn/ui** - UI component library

---

**Built with ❤️ for a smoke-free future**
