# THEOPHYSICS Transcription Pipeline

AI-powered video transcription and analysis system built on Cloudflare's infrastructure, specifically designed for advanced research in quantum physics, consciousness studies, and interdisciplinary science.

## 🎯 Features

- **🎬 Video Upload & Processing**: Support for MP4, AVI, MOV, WebM, MKV
- **🎤 AI Transcription**: Whisper AI via Cloudflare Workers AI
- **🧠 THEOPHYSICS Analysis**: Content quality, research relevance, factual accuracy scoring
- **🔍 Smart Search**: Full-text search with category filtering
- **🔊 Text-to-Speech**: Chunked TTS conversion for audio consumption
- **📊 Analytics Dashboard**: Real-time statistics and progress tracking
- **⚡ Serverless Architecture**: Built on Cloudflare Workers, Pages, D1, and R2

## 🏗️ Architecture

```
Video Upload → R2 Storage → Whisper AI → Text Processing → D1 Database
     ↓              ↓            ↓            ↓              ↓
Frontend ← Pages ← Workers ← AI Analysis ← Search Index ← TTS Engine
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Cloudflare account with Workers/Pages enabled
- Domain configured in Cloudflare (optional but recommended)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/theophysics-transcription.git
cd theophysics-transcription
npm install
```

### 2. Configure Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 3. Set Up Database
```bash
# Create D1 database
wrangler d1 create transcription-pipeline

# Run migrations
wrangler d1 execute transcription-pipeline --file=./database/schema.sql
```

### 4. Configure Environment
Update `wrangler.toml` with your database ID and R2 bucket name.

### 5. Deploy
```bash
# Deploy Worker
wrangler deploy

# Deploy Frontend to Pages
wrangler pages deploy frontend --project-name=theophysics-transcription
```

## 📁 Project Structure

```
theophysics-transcription/
├── worker/                 # Cloudflare Worker code
│   └── index.js           # Main API endpoints
├── frontend/              # Frontend dashboard
│   └── index.html         # Complete web interface
├── database/              # Database schemas
│   └── schema.sql         # D1 SQLite schema
├── docs/                  # Documentation
│   └── README.md          # This file
├── wrangler.toml          # Cloudflare configuration
└── package.json           # Dependencies
```

## 🎯 API Endpoints

- `POST /upload` - Upload video file
- `POST /transcribe` - Start transcription process
- `POST /analyze` - Run AI analysis
- `POST /tts` - Text-to-speech conversion
- `GET /search` - Search transcripts
- `GET /status` - System status

## 🔧 Configuration

### Environment Variables
```toml
[vars]
ENVIRONMENT = "production"
API_VERSION = "1.0.0"
SERVICE_NAME = "THEOPHYSICS Transcription Pipeline"
```

### Secrets (set via wrangler)
```bash
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put AI_GATEWAY_TOKEN
```

## 🧠 THEOPHYSICS Categories

The system automatically categorizes content into research areas:
- Quantum Physics
- Consciousness Studies  
- Spirituality
- Prophecy & Prediction
- Interdisciplinary Science
- Theoretical Physics
- Biblical Science
- Sacred Geometry
- Energy Healing
- Timeline Studies

## 📊 Analysis Scoring

### Content Quality (0-10)
- Clarity and coherence
- Information density
- Overall research value

### THEOPHYSICS Relevance (0-10) 
- Quantum physics concepts
- Consciousness studies
- Spiritual/mystical content
- Prophetic elements
- Interdisciplinary connections

### Factual Accuracy (0-10)
- Scientific rigor
- Logical consistency
- Verifiable claims

## 💰 Cost Estimation

Based on Cloudflare's pricing:
- **Whisper AI**: ~$0.01 per minute of audio
- **Workers/Pages**: $5/month plan covers most usage
- **R2 Storage**: ~$0.015/GB/month
- **D1 Database**: Generous free tier

Example costs:
- 10 hours of video/month: ~$36/month
- 50 hours of video/month: ~$180/month

## 🔗 Custom Domain Setup

1. Add domain to Cloudflare
2. Update `wrangler.toml`:
```toml
[[routes]]
pattern = "transcribe.faiththruphysics.com/*"
custom_domain = true
```
3. Deploy: `wrangler deploy`

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Database Migrations
```bash
wrangler d1 execute transcription-pipeline --file=./database/schema.sql
```

### Testing
```bash
npm test
```

## 📈 Monitoring

- Real-time statistics dashboard
- Processing status tracking
- Search analytics
- Error monitoring via Cloudflare dashboard

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Cloudflare Workers AI team
- OpenAI Whisper model
- THEOPHYSICS research community

---

Built with ❤️ for advancing consciousness research and quantum understanding.
