// THEOPHYSICS Transcription Pipeline - Cloudflare Worker
// Handles: Upload → R2 Storage → Whisper AI → Text Processing → D1 Database → TTS

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/upload' && request.method === 'POST') {
        return await handleVideoUpload(request, env, corsHeaders);
      }
      
      if (path === '/transcribe' && request.method === 'POST') {
        return await handleTranscription(request, env, corsHeaders);
      }
      
      if (path === '/analyze' && request.method === 'POST') {
        return await handleAIAnalysis(request, env, corsHeaders);
      }
      
      if (path === '/tts' && request.method === 'POST') {
        return await handleTextToSpeech(request, env, corsHeaders);
      }
      
      if (path === '/search' && request.method === 'GET') {
        return await handleSearch(request, env, corsHeaders);
      }
      
      if (path === '/status') {
        return await handleStatus(request, env, corsHeaders);
      }

      // Default API info
      return Response.json({
        service: 'THEOPHYSICS Video Transcription Pipeline',
        version: '1.0.0',
        endpoints: [
          'POST /upload - Upload video file',
          'POST /transcribe - Process transcription',
          'POST /analyze - AI content analysis',
          'POST /tts - Text-to-speech conversion',
          'GET /search - Search transcripts',
          'GET /status - Service status'
        ],
        description: 'AI-powered video transcription and analysis for THEOPHYSICS research'
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({
        error: error.message,
        stack: error.stack
      }, { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }
};

// Handle video file upload to R2
async function handleVideoUpload(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get('video');
  const title = formData.get('title') || 'Untitled Video';
  const sourceType = formData.get('source_type') || 'upload';

  if (!file) {
    return Response.json({ error: 'No video file provided' }, { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'mp4';
  const filename = `${timestamp}-${sanitizeFilename(title)}.${extension}`;

  try {
    // Upload to R2
    await env.TRANSCRIPTION_VIDEOS.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadTime: new Date().toISOString(),
        title: title,
        sourceType: sourceType
      }
    });

    // Store in D1 database
    const result = await env.TRANSCRIPTION_DB.prepare(`
      INSERT INTO videos (title, file_path, source_type, transcription_status)
      VALUES (?, ?, ?, 'pending')
    `).bind(title, filename, sourceType).run();

    return Response.json({
      success: true,
      videoId: result.meta.last_row_id,
      filename: filename,
      message: 'Video uploaded successfully - ready for transcription'
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      error: 'Upload failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Handle transcription with Whisper AI
async function handleTranscription(request, env, corsHeaders) {
  const { videoId } = await request.json();

  if (!videoId) {
    return Response.json({ error: 'Video ID required' }, { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  try {
    // Get video info from database
    const video = await env.TRANSCRIPTION_DB.prepare(`
      SELECT * FROM videos WHERE id = ?
    `).bind(videoId).first();

    if (!video) {
      return Response.json({ error: 'Video not found' }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update status to processing
    await env.TRANSCRIPTION_DB.prepare(`
      UPDATE videos SET transcription_status = 'processing' WHERE id = ?
    `).bind(videoId).run();

    // Get video file from R2
    const videoFile = await env.TRANSCRIPTION_VIDEOS.get(video.file_path);
    if (!videoFile) {
      throw new Error('Video file not found in storage');
    }

    const startTime = Date.now();

    // Call Whisper AI via Workers AI
    const audioBuffer = await videoFile.arrayBuffer();
    
    const whisperResponse = await env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(audioBuffer)]
    });

    const processingTime = Date.now() - startTime;

    // Store transcript in database
    const transcriptResult = await env.TRANSCRIPTION_DB.prepare(`
      INSERT INTO transcripts (video_id, transcript_text, confidence_score, word_count, processing_time_ms)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      videoId, 
      whisperResponse.text,
      whisperResponse.confidence || 0.95,
      whisperResponse.text.split(' ').length,
      processingTime
    ).run();

    // Update video status
    await env.TRANSCRIPTION_DB.prepare(`
      UPDATE videos SET transcription_status = 'completed' WHERE id = ?
    `).bind(videoId).run();

    return Response.json({
      success: true,
      transcriptId: transcriptResult.meta.last_row_id,
      transcript: whisperResponse.text,
      processingTimeMs: processingTime,
      wordCount: whisperResponse.text.split(' ').length,
      message: 'Transcription completed successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    // Update status to failed
    await env.TRANSCRIPTION_DB.prepare(`
      UPDATE videos SET transcription_status = 'failed' WHERE id = ?
    `).bind(videoId).run();

    return Response.json({
      error: 'Transcription failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Handle AI analysis and rating for THEOPHYSICS research
async function handleAIAnalysis(request, env, corsHeaders) {
  const { videoId, analysisTypes = ['quality', 'relevance', 'factual'] } = await request.json();

  try {
    // Get transcript
    const transcript = await env.TRANSCRIPTION_DB.prepare(`
      SELECT t.*, v.title FROM transcripts t 
      JOIN videos v ON t.video_id = v.id 
      WHERE v.id = ?
    `).bind(videoId).first();

    if (!transcript) {
      return Response.json({ error: 'Transcript not found' }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    const analysisResults = {};

    // Content Quality Analysis
    if (analysisTypes.includes('quality')) {
      const qualityPrompt = `Analyze the following transcript for content quality. Rate from 0-10 based on clarity, coherence, information density, and overall value for scientific research. Return JSON with score and reasoning.

Title: ${transcript.title}
Transcript: ${transcript.transcript_text}

Return format: {"score": 8.5, "reasoning": "Clear explanations, good structure...", "factors": {"clarity": 9, "coherence": 8, "density": 8}}`;

      const qualityResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: qualityPrompt }]
      });

      analysisResults.quality = parseAIResponse(qualityResponse.response);
    }

    // THEOPHYSICS Research Relevance Analysis
    if (analysisTypes.includes('relevance')) {
      const relevancePrompt = `Analyze this transcript for relevance to THEOPHYSICS research: quantum physics, consciousness studies, spirituality, advanced theoretical physics, prophecy, and interdisciplinary science. Rate 0-10.

Title: ${transcript.title}
Transcript: ${transcript.transcript_text}

Return format: {"score": 7.2, "topics": ["quantum consciousness", "measurement problem"], "theophysics_factors": {"quantum_physics": 8, "consciousness": 9, "spirituality": 6, "prophecy": 4}}`;

      const relevanceResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: relevancePrompt }]
      });

      analysisResults.relevance = parseAIResponse(relevanceResponse.response);
    }

    // Factual Accuracy Analysis
    if (analysisTypes.includes('factual')) {
      const factualPrompt = `Analyze this transcript for factual accuracy and scientific rigor. Rate 0-10 based on verifiable claims, logical consistency, and scientific validity.

Title: ${transcript.title}
Transcript: ${transcript.transcript_text}

Return format: {"score": 6.8, "claims_analysis": ["accurate physics concepts", "unverified spiritual claims"], "accuracy_factors": {"scientific_rigor": 7, "logical_consistency": 8, "verifiability": 5}}`;

      const factualResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: factualPrompt }]
      });

      analysisResults.factual = parseAIResponse(factualResponse.response);
    }

    // Store analysis results
    for (const [type, result] of Object.entries(analysisResults)) {
      await env.TRANSCRIPTION_DB.prepare(`
        INSERT INTO ai_analysis (video_id, analysis_type, analysis_result, confidence_score, processing_model)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        videoId, 
        type, 
        JSON.stringify(result),
        result.confidence || 0.8,
        'llama-3.1-8b-instruct'
      ).run();
    }

    // Update video with average scores
    const avgScore = Object.values(analysisResults).reduce((sum, r) => sum + (r.score || 0), 0) / Object.keys(analysisResults).length;
    
    await env.TRANSCRIPTION_DB.prepare(`
      UPDATE videos SET 
        ai_rating_score = ?,
        content_quality_score = ?,
        research_relevance_score = ?,
        factual_accuracy_score = ?
      WHERE id = ?
    `).bind(
      avgScore,
      analysisResults.quality?.score || null,
      analysisResults.relevance?.score || null,
      analysisResults.factual?.score || null,
      videoId
    ).run();

    return Response.json({
      success: true,
      videoId: videoId,
      analysis: analysisResults,
      averageScore: avgScore,
      message: 'THEOPHYSICS analysis completed successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      error: 'Analysis failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Handle Text-to-Speech conversion with chunking
async function handleTextToSpeech(request, env, corsHeaders) {
  const { videoId, voice = 'alloy', chunkSize = 1500 } = await request.json();

  try {
    // Get transcript
    const transcript = await env.TRANSCRIPTION_DB.prepare(`
      SELECT t.*, v.title FROM transcripts t 
      JOIN videos v ON t.video_id = v.id 
      WHERE v.id = ?
    `).bind(videoId).first();

    if (!transcript) {
      return Response.json({ error: 'Transcript not found' }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Split transcript into chunks
    const text = transcript.transcript_text;
    const chunks = chunkText(text, chunkSize);
    
    const audioChunks = [];
    
    // Process each chunk (could be done in parallel for speed)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Call ElevenLabs via AI Gateway (you'll need to set this up)
      // For now, we'll use a placeholder - you'll need ElevenLabs API
      const ttsResponse = await callTextToSpeech(chunk, voice, env);
      
      // Store audio chunk in R2
      const chunkFilename = `tts/${transcript.video_id}-chunk-${i}.mp3`;
      await env.TRANSCRIPTION_VIDEOS.put(chunkFilename, ttsResponse.audioBuffer);
      
      audioChunks.push({
        chunkIndex: i,
        filename: chunkFilename,
        text: chunk.substring(0, 100) + '...'
      });
    }

    return Response.json({
      success: true,
      videoId: videoId,
      totalChunks: chunks.length,
      audioChunks: audioChunks,
      message: 'Text-to-speech conversion completed'
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      error: 'TTS conversion failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Handle search across transcripts
async function handleSearch(request, env, corsHeaders) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const minRating = parseFloat(url.searchParams.get('min_rating')) || 0;
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const category = url.searchParams.get('category'); // theophysics, consciousness, quantum, etc.

  try {
    let sql = `
      SELECT v.*, t.transcript_text, t.word_count, t.language_detected
      FROM videos v
      JOIN transcripts t ON v.id = t.video_id
      WHERE v.transcription_status = 'completed'
        AND v.ai_rating_score >= ?
    `;
    let params = [minRating];

    if (query) {
      sql += ` AND (v.title LIKE ? OR t.transcript_text LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }

    // Add THEOPHYSICS category filtering
    if (category) {
      sql += ` AND v.tags LIKE ?`;
      params.push(`%${category}%`);
    }

    sql += ` ORDER BY v.ai_rating_score DESC LIMIT ?`;
    params.push(limit);

    const results = await env.TRANSCRIPTION_DB.prepare(sql).bind(...params).all();

    return Response.json({
      success: true,
      results: results.results.map(row => ({
        ...row,
        transcript_preview: row.transcript_text.substring(0, 300) + '...'
      })),
      total: results.results.length,
      query: query,
      minRating: minRating,
      category: category
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      error: 'Search failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Get service status and statistics
async function handleStatus(request, env, corsHeaders) {
  try {
    const stats = await env.TRANSCRIPTION_DB.prepare(`
      SELECT 
        COUNT(*) as total_videos,
        SUM(CASE WHEN transcription_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN transcription_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN transcription_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN transcription_status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(ai_rating_score) as avg_rating,
        SUM(CASE WHEN research_relevance_score >= 7 THEN 1 ELSE 0 END) as high_relevance_count
      FROM videos
    `).first();

    return Response.json({
      success: true,
      status: 'operational',
      service: 'THEOPHYSICS Transcription Pipeline',
      statistics: stats,
      database: 'transcription-pipeline',
      storage: 'transcription-videos',
      features: [
        'Video Upload & Transcription',
        'AI Content Analysis',
        'THEOPHYSICS Research Relevance Scoring',
        'Text-to-Speech Conversion',
        'Searchable Transcript Database'
      ]
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      error: 'Status check failed: ' + error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// Utility functions
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
}

function parseAIResponse(response) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: extract score from text
    const scoreMatch = response.match(/score[:\s]*(\d+\.?\d*)/i);
    return {
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 5.0,
      reasoning: response,
      confidence: 0.6
    };
  } catch (error) {
    return {
      score: 5.0,
      reasoning: response,
      confidence: 0.3,
      parse_error: error.message
    };
  }
}

function chunkText(text, maxChunkSize) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Placeholder for TTS integration - you'll implement ElevenLabs integration
async function callTextToSpeech(text, voice, env) {
  // TODO: Implement ElevenLabs API call via AI Gateway
  // For now, return dummy response
  return {
    audioBuffer: new ArrayBuffer(1024), // Placeholder
    duration: text.length * 0.1 // Estimate
  };
}
