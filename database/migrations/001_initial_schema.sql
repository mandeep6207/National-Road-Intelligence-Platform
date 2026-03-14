-- ============================================================
-- National Road Intelligence Platform
-- PostgreSQL Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS (optional — only if installed; comment out if error occurs)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS not available — skipping. Platform works without it.';
END $$;

-- ============================================================
-- ENUM TYPES (safe for re-runs)
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin', 'government', 'contractor', 'citizen', 'auditor'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE severity_level AS ENUM ('critical', 'high', 'moderate', 'low', 'safe'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE complaint_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE repair_status AS ENUM ('scheduled', 'in_progress', 'completed', 'failed', 'verified'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE road_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE sensor_type AS ENUM ('satellite', 'dashcam', 'cctv', 'drone', 'manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE vote_type AS ENUM ('verified', 'disputed', 'needs_attention'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE blockchain_event AS ENUM ('detection', 'complaint', 'assignment', 'repair', 'verification', 'audit'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    aadhaar_hash VARCHAR(64),  -- hashed Aadhaar for citizen verification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLE: roads
-- ============================================================
CREATE TABLE IF NOT EXISTS roads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_code VARCHAR(50) UNIQUE NOT NULL,
    road_name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50),  -- NH, SH, MDR, ODR
    state VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    start_lat DECIMAL(10, 7),
    start_lng DECIMAL(10, 7),
    end_lat DECIMAL(10, 7),
    end_lng DECIMAL(10, 7),
    length_km DECIMAL(10, 2),
    width_meters DECIMAL(6, 2),
    surface_type VARCHAR(50),  -- asphalt, concrete, gravel
    condition road_condition DEFAULT 'fair',
    health_score DECIMAL(5, 2) DEFAULT 70.0,  -- 0-100
    last_inspected TIMESTAMP WITH TIME ZONE,
    last_repaired TIMESTAMP WITH TIME ZONE,
    construction_year INTEGER,
    responsible_authority VARCHAR(255),
    budget_allocated DECIMAL(15, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roads_state ON roads(state);
CREATE INDEX idx_roads_condition ON roads(condition);

-- ============================================================
-- TABLE: potholes
-- ============================================================
CREATE TABLE IF NOT EXISTS potholes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_id UUID REFERENCES roads(id) ON DELETE SET NULL,
    detection_id VARCHAR(50) UNIQUE NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    severity severity_level NOT NULL DEFAULT 'moderate',
    confidence_score DECIMAL(5, 4),  -- AI confidence 0-1
    width_cm DECIMAL(8, 2),
    depth_cm DECIMAL(8, 2),
    area_sqcm DECIMAL(10, 2),
    sensor_source sensor_type NOT NULL DEFAULT 'dashcam',
    image_url TEXT,
    video_url TEXT,
    bounding_box JSONB,  -- {x1, y1, x2, y2}
    is_active BOOLEAN DEFAULT true,
    is_repaired BOOLEAN DEFAULT false,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    repaired_at TIMESTAMP WITH TIME ZONE,
    weather_conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_potholes_road ON potholes(road_id);
CREATE INDEX idx_potholes_severity ON potholes(severity);
CREATE INDEX idx_potholes_location ON potholes(latitude, longitude);
CREATE INDEX idx_potholes_active ON potholes(is_active);

-- ============================================================
-- TABLE: risk_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pothole_id UUID REFERENCES potholes(id) ON DELETE CASCADE,
    road_id UUID REFERENCES roads(id) ON DELETE CASCADE,
    risk_score DECIMAL(5, 2) NOT NULL,  -- 0-100
    priority_rank INTEGER,
    traffic_volume VARCHAR(20),  -- high, medium, low
    accident_history INTEGER DEFAULT 0,
    pedestrian_risk BOOLEAN DEFAULT false,
    school_nearby BOOLEAN DEFAULT false,
    hospital_nearby BOOLEAN DEFAULT false,
    factors JSONB DEFAULT '{}',
    recommended_action TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_risk_pothole ON risk_scores(pothole_id);
CREATE INDEX idx_risk_score ON risk_scores(risk_score DESC);

-- ============================================================
-- TABLE: complaints
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    pothole_id UUID REFERENCES potholes(id) ON DELETE SET NULL,
    road_id UUID REFERENCES roads(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_auto_generated BOOLEAN DEFAULT false,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    address TEXT,
    severity severity_level NOT NULL DEFAULT 'moderate',
    status complaint_status DEFAULT 'pending',
    priority_score DECIMAL(5, 2) DEFAULT 50.0,
    image_urls TEXT[],
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    citizen_votes INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    work_order_id VARCHAR(50),
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_severity ON complaints(severity);
CREATE INDEX idx_complaints_pothole ON complaints(pothole_id);
CREATE INDEX idx_complaints_number ON complaints(complaint_number);

-- ============================================================
-- TABLE: contractors
-- ============================================================
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contractor_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE,
    gstin VARCHAR(20),
    state VARCHAR(100),
    specialization TEXT[],  -- road repair, bridge, highway
    max_concurrent_jobs INTEGER DEFAULT 5,
    active_jobs INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 3.00,  -- 1-5
    total_jobs_completed INTEGER DEFAULT 0,
    total_jobs_failed INTEGER DEFAULT 0,
    on_time_delivery_pct DECIMAL(5, 2) DEFAULT 0,
    quality_score DECIMAL(5, 2) DEFAULT 50.0,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    bank_account JSONB,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contractors_rating ON contractors(rating DESC);
CREATE INDEX idx_contractors_state ON contractors(state);
CREATE INDEX idx_contractors_blacklisted ON contractors(is_blacklisted);

-- ============================================================
-- TABLE: repairs
-- ============================================================
CREATE TABLE IF NOT EXISTS repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_number VARCHAR(50) UNIQUE NOT NULL,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    pothole_id UUID REFERENCES potholes(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    status repair_status DEFAULT 'scheduled',
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    material_used VARCHAR(255),
    repair_method VARCHAR(100),  -- cold_patch, hot_mix, full_depth
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    before_images TEXT[],
    after_images TEXT[],
    before_video_url TEXT,
    after_video_url TEXT,
    ai_verification_score DECIMAL(5, 2),  -- 0-100
    ai_verified BOOLEAN DEFAULT false,
    ai_verified_at TIMESTAMP WITH TIME ZONE,
    supervisor_name VARCHAR(255),
    supervisor_notes TEXT,
    warranty_months INTEGER DEFAULT 12,
    warranty_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_repairs_contractor ON repairs(contractor_id);
CREATE INDEX idx_repairs_complaint ON repairs(complaint_id);

-- ============================================================
-- TABLE: citizen_votes
-- ============================================================
CREATE TABLE IF NOT EXISTS citizen_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    pothole_id UUID REFERENCES potholes(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    comment TEXT,
    image_url TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_verified_location BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, complaint_id)
);

CREATE INDEX idx_votes_complaint ON citizen_votes(complaint_id);
CREATE INDEX idx_votes_user ON citizen_votes(user_id);

-- ============================================================
-- TABLE: reputation_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS reputation_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    jobs_completed INTEGER DEFAULT 0,
    jobs_on_time INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5, 2) DEFAULT 0,
    citizen_satisfaction DECIMAL(5, 2) DEFAULT 0,
    cost_efficiency DECIMAL(5, 2) DEFAULT 0,
    rework_count INTEGER DEFAULT 0,
    final_score DECIMAL(5, 2) DEFAULT 0,
    grade VARCHAR(2),  -- A+, A, B, C, D, F
    rank_in_state INTEGER,
    rank_national INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contractor_id, period_month, period_year)
);

-- ============================================================
-- TABLE: budget_records
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_type VARCHAR(50) NOT NULL,  -- allocation, expenditure, tender, payment
    road_id UUID REFERENCES roads(id) ON DELETE SET NULL,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    repair_id UUID REFERENCES repairs(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    fiscal_year VARCHAR(10),
    quarter INTEGER,
    department VARCHAR(255),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_reason TEXT,
    anomaly_score DECIMAL(5, 2),
    transaction_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_road ON budget_records(road_id);
CREATE INDEX idx_budget_anomaly ON budget_records(is_anomaly);
CREATE INDEX idx_budget_year ON budget_records(fiscal_year);

-- ============================================================
-- TABLE: blockchain_records
-- ============================================================
CREATE TABLE IF NOT EXISTS blockchain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT,
    event_type blockchain_event NOT NULL,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    data_hash VARCHAR(64) NOT NULL,  -- SHA256 of payload
    payload JSONB NOT NULL,
    network VARCHAR(50) DEFAULT 'simulation',
    gas_used BIGINT,
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blockchain_hash ON blockchain_records(transaction_hash);
CREATE INDEX idx_blockchain_event ON blockchain_records(event_type);
CREATE INDEX idx_blockchain_entity ON blockchain_records(entity_id);

-- ============================================================
-- TABLE: detection_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS detection_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL,
    source_type sensor_type NOT NULL,
    source_url TEXT,
    source_metadata JSONB,
    status VARCHAR(50) DEFAULT 'queued',  -- queued, processing, completed, failed
    total_frames INTEGER,
    processed_frames INTEGER DEFAULT 0,
    potholes_detected INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    error_message TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: predictive_maintenance
-- ============================================================
CREATE TABLE IF NOT EXISTS predictive_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_id UUID REFERENCES roads(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    failure_probability DECIMAL(5, 4),  -- 0-1
    predicted_severity severity_level,
    confidence DECIMAL(5, 4),
    input_features JSONB,
    model_version VARCHAR(50),
    recommended_action TEXT,
    maintenance_window_start DATE,
    maintenance_window_end DATE,
    estimated_maintenance_cost DECIMAL(12, 2),
    is_acted_upon BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prediction_road ON predictive_maintenance(road_id);
CREATE INDEX idx_prediction_date ON predictive_maintenance(prediction_date);
CREATE INDEX idx_prediction_probability ON predictive_maintenance(failure_probability DESC);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    sent_email BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================================
-- VIEWS
-- ============================================================

-- Active potholes with risk summary
CREATE OR REPLACE VIEW v_active_potholes AS
SELECT 
    p.*,
    r.road_name,
    r.road_type,
    r.state,
    r.district,
    rs.risk_score,
    rs.priority_rank,
    c.complaint_number,
    c.status as complaint_status
FROM potholes p
LEFT JOIN roads r ON p.road_id = r.id
LEFT JOIN risk_scores rs ON rs.pothole_id = p.id
LEFT JOIN complaints c ON c.pothole_id = p.id
WHERE p.is_active = true;

-- Contractor performance summary
CREATE OR REPLACE VIEW v_contractor_performance AS
SELECT 
    c.id,
    c.company_name,
    c.contractor_code,
    c.state,
    c.rating,
    c.total_jobs_completed,
    c.on_time_delivery_pct,
    c.quality_score,
    c.is_blacklisted,
    COUNT(rep.id) as repairs_in_progress,
    AVG(rs.final_score) as avg_reputation_score
FROM contractors c
LEFT JOIN repairs rep ON rep.contractor_id = c.id AND rep.status = 'in_progress'
LEFT JOIN reputation_scores rs ON rs.contractor_id = c.id
GROUP BY c.id;

-- Dashboard statistics
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM potholes WHERE is_active = true) as active_potholes,
    (SELECT COUNT(*) FROM potholes WHERE severity = 'critical' AND is_active = true) as critical_potholes,
    (SELECT COUNT(*) FROM complaints WHERE status = 'pending') as pending_complaints,
    (SELECT COUNT(*) FROM repairs WHERE status = 'in_progress') as active_repairs,
    (SELECT COUNT(*) FROM repairs WHERE status = 'verified') as verified_repairs,
    (SELECT COUNT(*) FROM blockchain_records) as blockchain_entries,
    (SELECT COALESCE(SUM(actual_cost), 0) FROM repairs WHERE status = 'verified') as total_spent,
    (SELECT COUNT(*) FROM contractors WHERE is_blacklisted = false) as active_contractors;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Demo Users — bcrypt hashes below are for password: "secret"
-- To use password "Admin@1234", run: python database/seed_demo.py
-- The seed_demo.py script generates proper hashes for Admin@1234

INSERT INTO users (email, full_name, hashed_password, role, phone, is_active, is_verified)
VALUES 
('admin@nrip.gov.in', 'System Administrator', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'super_admin', '9000000001', true, true),
('authority@nh.gov.in', 'National Highway Authority', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'government', '9000000002', true, true),
('contractor@roads.com', 'RoadBuild Contractors Pvt Ltd', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'contractor', '9000000003', true, true),
('citizen@example.com', 'Rahul Kumar', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'citizen', '9000000004', true, true),
('auditor@nrip.gov.in', 'Infrastructure Auditor', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'auditor', '9000000005', true, true)
ON CONFLICT (email) DO NOTHING;

-- IMPORTANT: After inserting, run seed_demo.py to update to Admin@1234 passwords:
-- cd "project root" && python database/seed_demo.py

-- Sample Roads
INSERT INTO roads (road_code, road_name, road_type, state, district, city, start_lat, start_lng, end_lat, end_lng, length_km, condition, health_score, responsible_authority)
VALUES 
('NH48-DL-001', 'NH-48 Delhi Sector', 'NH', 'Delhi', 'South Delhi', 'New Delhi', 28.5355, 77.3910, 28.4595, 77.0266, 45.2, 'poor', 32.5, 'NHAI'),
('NH44-MH-001', 'NH-44 Mumbai Stretch', 'NH', 'Maharashtra', 'Mumbai', 'Mumbai', 19.0760, 72.8777, 18.9667, 72.8333, 23.8, 'fair', 58.0, 'MoRTH'),
('SH12-KA-001', 'SH-12 Bengaluru Ring', 'SH', 'Karnataka', 'Bengaluru Urban', 'Bengaluru', 12.9716, 77.5946, 12.9352, 77.6244, 18.5, 'good', 72.0, 'PWD Karnataka');
