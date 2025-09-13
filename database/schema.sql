-- THEOPHYSICS Transcription Pipeline Database Schema
-- D1 SQLite Database for Cloudflare Workers

-- Videos table - stores uploaded video metadata
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE, -- for YouTube/external links
    source_type TEXT DEFAULT 'upload', -- 'upload', 'youtube', 'tiktok', 'research'
    file_path TEXT, -- R2 storage path
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    transcription_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    ai_rating_score REAL, -- 0.0 to 10.0 overall score
    content_quality_score REAL, -- clarity, coherence, information density
    research_relevance_score REAL, -- THEOPHYSICS research relevance
    factual_accuracy_score REAL, -- scientific accuracy and rigor
    tags TEXT, -- JSON array of tags/categories
    metadata TEXT, -- JSON metadata (resolution, codec, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transcripts table - stores the transcribed text
CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL,
    language_detected TEXT DEFAULT 'en',
    confidence_score REAL DEFAULT 0.95,
    timestamp_data TEXT, -- JSON with timestamped segments
    word_count INTEGER,
    processing_time_ms INTEGER,
    whisper_model TEXT DEFAULT '@cf/openai/whisper',
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- AI Analysis table - stores detailed AI analysis results
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'quality', 'relevance', 'factual', 'topic_extraction', 'sentiment'
    analysis_result TEXT NOT NULL, -- JSON result with scores and details
    confidence_score REAL DEFAULT 0.8,
    processing_model TEXT, -- which AI model was used
    processing_time_ms INTEGER,
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Text-to-Speech table - tracks TTS conversions
CREATE TABLE IF NOT EXISTS tts_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    transcript_id INTEGER REFERENCES transcripts(id) ON DELETE CASCADE,
    voice_model TEXT DEFAULT 'alloy',
    chunk_count INTEGER,
    total_duration_seconds REAL,
    audio_files TEXT, -- JSON array of R2 paths to audio chunks
    conversion_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_time_ms INTEGER,
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id),
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
);

-- Research categories table - for THEOPHYSICS classification
CREATE TABLE IF NOT EXISTS research_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id INTEGER REFERENCES research_categories(id),
    color_code TEXT, -- for UI display
    relevance_keywords TEXT, -- JSON array of keywords for auto-classification
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Video categories junction table - many-to-many relationship
CREATE TABLE IF NOT EXISTS video_categories (
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES research_categories(id) ON DELETE CASCADE,
    relevance_score REAL DEFAULT 1.0, -- how relevant this video is to this category
    auto_assigned BOOLEAN DEFAULT FALSE, -- whether this was assigned by AI
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (video_id, category_id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    FOREIGN KEY (category_id) REFERENCES research_categories(id)
);

-- Search queries table - for analytics and improving search
CREATE TABLE IF NOT EXISTS search_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT NOT NULL,
    results_count INTEGER,
    min_rating_filter REAL,
    category_filter TEXT,
    user_ip TEXT, -- hashed for privacy
    response_time_ms INTEGER,
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(transcription_status);
CREATE INDEX IF NOT EXISTS idx_videos_rating ON videos(ai_rating_score DESC);
CREATE INDEX IF NOT EXISTS idx_videos_upload_date ON videos(upload_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_videos_source_type ON videos(source_type);

CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_language ON transcripts(language_detected);
CREATE INDEX IF NOT EXISTS idx_transcripts_word_count ON transcripts(word_count);

CREATE INDEX IF NOT EXISTS idx_analysis_video_id ON ai_analysis(video_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON ai_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_timestamp ON ai_analysis(created_timestamp DESC);

-- Full-text search on transcripts (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
    transcript_text, 
    title, 
    content='transcripts', 
    content_rowid='id'
);

-- Insert default THEOPHYSICS research categories
INSERT OR IGNORE INTO research_categories (name, description, relevance_keywords) VALUES
('Quantum Physics', 'Quantum mechanics, measurement problem, entanglement', '["quantum", "entanglement", "superposition", "measurement", "wave function", "decoherence"]'),
('Consciousness Studies', 'Studies of consciousness, awareness, and subjective experience', '["consciousness", "awareness", "subjective", "experience", "qualia", "mind"]'),
('Spirituality', 'Spiritual concepts, religious experiences, mysticism', '["spiritual", "mystical", "religious", "transcendent", "divine", "sacred"]'),
('Prophecy & Prediction', 'Prophetic literature, predictions, future events', '["prophecy", "prediction", "future", "vision", "revelation", "forecast"]'),
('Interdisciplinary Science', 'Cross-disciplinary research, novel scientific approaches', '["interdisciplinary", "cross-disciplinary", "novel", "innovative", "paradigm"]'),
('Theoretical Physics', 'Advanced theoretical concepts, mathematical physics', '["theoretical", "mathematical", "relativity", "field theory", "cosmology"]'),
('Information Theory', 'Information, computation, digital physics concepts', '["information", "computation", "digital", "bit", "algorithm", "complexity"]'),
('Philosophy of Science', 'Philosophy of science, epistemology, methodology', '["philosophy", "epistemology", "methodology", "paradigm", "scientific method", "knowledge"]'),
('Quantum Consciousness', 'Intersection of quantum physics and consciousness', '["quantum consciousness", "orchestrated", "penrose", "hameroff", "microtubules", "quantum mind"]'),
('Sacred Geometry', 'Mathematical patterns in nature and spirituality', '["sacred geometry", "fibonacci", "golden ratio", "mandala", "fractal", "pattern"]'),
('Energy Healing', 'Biofield, energy medicine, healing modalities', '["energy healing", "biofield", "chakras", "meridians", "reiki", "acupuncture"]'),
('Timeline Studies', 'Temporal mechanics, time travel, causality', '["time", "temporal", "causality", "timeline", "chronology", "future"]'),
('Biblical Science', 'Scientific analysis of biblical texts and concepts', '["biblical", "scripture", "genesis", "creation", "divine", "theological"]');

-- Views for common queries
CREATE VIEW IF NOT EXISTS high_quality_videos AS
SELECT 
    v.*,
    t.transcript_text,
    t.word_count,
    GROUP_CONCAT(rc.name, ', ') as categories
FROM videos v
JOIN transcripts t ON v.id = t.video_id
LEFT JOIN video_categories vc ON v.id = vc.video_id
LEFT JOIN research_categories rc ON vc.category_id = rc.id
WHERE v.ai_rating_score >= 7.0
GROUP BY v.id
ORDER BY v.ai_rating_score DESC;

CREATE VIEW IF NOT EXISTS theophysics_relevance_view AS
SELECT 
    v.*,
    t.transcript_text,
    a.analysis_result as relevance_analysis
FROM videos v
JOIN transcripts t ON v.id = t.video_id
JOIN ai_analysis a ON v.id = a.video_id
WHERE a.analysis_type = 'relevance'
    AND v.research_relevance_score >= 6.0
ORDER BY v.research_relevance_score DESC;
