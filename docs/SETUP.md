# THEOPHYSICS Transcription Pipeline - Setup Guide

## 🚀 Quick Deployment Instructions

### Step 1: Initialize Project
```bash
cd D:\theophysics-transcription
npm install -g wrangler
wrangler login
```

### Step 2: Deploy Database
Your D1 database is already created! Just run:
```bash
wrangler d1 execute transcription-pipeline --file=./database/schema.sql
```

### Step 3: Deploy Worker
```bash
wrangler deploy
```

### Step 4: Deploy Frontend to Pages
```bash
wrangler pages deploy frontend --project-name=theophysics-transcription
```

### Step 5: Configure Custom Domain (Optional)
1. Ensure `faiththruphysics.com` is in your Cloudflare account
2. The `wrangler.toml` is already configured for `transcribe.faiththruphysics.com`
3. Deploy with custom domain support

## 🔧 Environment Setup

### Required Secrets
```bash
# For text-to-speech (when you add ElevenLabs)
wrangler secret put ELEVENLABS_API_KEY

# For enhanced AI routing (optional)
wrangler secret put AI_GATEWAY_TOKEN
```

## 📊 Database Schema
Your database includes:
- Videos table (metadata, ratings, status)
- Transcripts table (full text, timestamps)  
- AI Analysis table (quality scores, relevance)
- TTS Conversions table (audio files)
- Research Categories (THEOPHYSICS classification)

## 🎯 Testing the System

1. **Upload Test**: Try uploading a small video file
2. **Transcription**: Check if Whisper AI processes correctly
3. **Analysis**: Verify THEOPHYSICS relevance scoring
4. **Search**: Test full-text search functionality

## 🔗 URLs After Deployment

- **Worker API**: `https://theophysics-transcription.your-subdomain.workers.dev`
- **Frontend**: `https://theophysics-transcription.pages.dev`
- **Custom Domain**: `https://transcribe.faiththruphysics.com` (when configured)

## 💡 Features Ready to Use

✅ Video upload with drag & drop  
✅ AI transcription via Whisper  
✅ THEOPHYSICS relevance analysis  
✅ Content quality scoring  
✅ Factual accuracy assessment  
✅ Full-text search with filters  
✅ Real-time progress tracking  
✅ Responsive dashboard design  
🔄 Text-to-speech (ready for ElevenLabs integration)  

## 🎨 Frontend Features

- Beautiful gradient design
- Drag & drop upload
- Real-time progress bars
- Search with category filters
- Mobile responsive
- THEOPHYSICS branding
- Animated notifications
- Statistical dashboard

## 🔮 Next Steps

1. **Test the system** with sample videos
2. **Configure custom domain** if desired
3. **Add ElevenLabs TTS** integration
4. **Build MCP server** for Claude integration
5. **Create GitHub repository** for version control

## 🧠 THEOPHYSICS Integration

The system is specifically designed for your research with:
- Quantum physics keyword detection
- Consciousness studies classification
- Prophetic content analysis
- Interdisciplinary science scoring
- Biblical/spiritual content recognition

Perfect for building your searchable video research library! 🎯
