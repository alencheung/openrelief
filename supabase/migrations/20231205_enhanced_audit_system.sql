-- Enhanced Audit System Migration
-- This migration creates tables for comprehensive audit trails, compliance monitoring,
-- security incident tracking, and legal request management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enhanced Audit Log Table
CREATE TABLE IF NOT EXISTS enhanced_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'data_access', 'data_export', 'data_deletion', 'data_modification',
        'login_success', 'login_failure', 'logout', 'password_change',
        'privacy_settings_change', 'privacy_budget_consumed', 'consent_granted', 'consent_revoked',
        'legal_request_received', 'legal_request_processed', 'data_retention_policy_applied', 'compliance_check',
        'security_incident', 'unauthorized_access_attempt', 'suspicious_activity',
        'system_error', 'system_maintenance', 'backup_completed',
        'emergency_report_created', 'emergency_report_confirmed', 'emergency_report_disputed', 'emergency_data_shared'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Event details
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id UUID,
    
    -- Data context
    data_type TEXT,
    data_types TEXT[],
    data_subjects INTEGER DEFAULT 0,
    data_volume INTEGER DEFAULT 0,
    
    -- Privacy and compliance
    privacy_impact TEXT NOT NULL CHECK (privacy_impact IN ('low', 'medium', 'high')),
    legal_basis TEXT,
    compliance_frameworks TEXT[] DEFAULT '{}',
    retention_period INTEGER,
    
    -- Security and integrity
    previous_hash TEXT,
    current_hash TEXT NOT NULL,
    signature TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Processing information
    processed BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for enhanced_audit_log
CREATE INDEX idx_enhanced_audit_log_timestamp ON enhanced_audit_log(timestamp DESC);
CREATE INDEX idx_enhanced_audit_log_event_type ON enhanced_audit_log(event_type);
CREATE INDEX idx_enhanced_audit_log_severity ON enhanced_audit_log(severity);
CREATE INDEX idx_enhanced_audit_log_user_id ON enhanced_audit_log(user_id);
CREATE INDEX idx_enhanced_audit_log_action ON enhanced_audit_log(action);
CREATE INDEX idx_enhanced_audit_log_resource ON enhanced_audit_log(resource);
CREATE INDEX idx_enhanced_audit_log_data_type ON enhanced_audit_log(data_type);
CREATE INDEX idx_enhanced_audit_log_privacy_impact ON enhanced_audit_log(privacy_impact);
CREATE INDEX idx_enhanced_audit_log_compliance_frameworks ON enhanced_audit_log USING GIN(compliance_frameworks);
CREATE INDEX idx_enhanced_audit_log_tags ON enhanced_audit_log USING GIN(tags);
CREATE INDEX idx_enhanced_audit_log_metadata ON enhanced_audit_log USING GIN(metadata);
CREATE INDEX idx_enhanced_audit_log_archived ON enhanced_audit_log(archived);
CREATE INDEX idx_enhanced_audit_log_processed ON enhanced_audit_log(processed);

-- Audit Metadata Table
CREATE TABLE IF NOT EXISTS audit_metadata (
    key TEXT PRIMARY KEY,
    previous_hash TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance Rules Table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'data_retention', 'privacy_budget', 'access_control', 'consent_management',
        'data_minimization', 'encryption_requirement', 'audit_logging', 'legal_request_timeline'
    )),
    framework TEXT NOT NULL CHECK (framework IN ('gdpr', 'ccpa', 'hipaa', 'sox')),
    enabled BOOLEAN DEFAULT TRUE,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    check_interval INTEGER NOT NULL, -- minutes
    parameters JSONB DEFAULT '{}',
    violation_threshold INTEGER DEFAULT 1,
    grace_period INTEGER DEFAULT 0, -- minutes
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance Violations Table
CREATE TABLE IF NOT EXISTS compliance_violations (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES compliance_rules(id),
    rule_name TEXT NOT NULL,
    framework TEXT NOT NULL CHECK (framework IN ('gdpr', 'ccpa', 'hipaa', 'sox')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    affected_users TEXT[],
    affected_resources TEXT[],
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')) DEFAULT 'active',
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for compliance_violations
CREATE INDEX idx_compliance_violations_rule_id ON compliance_violations(rule_id);
CREATE INDEX idx_compliance_violations_framework ON compliance_violations(framework);
CREATE INDEX idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX idx_compliance_violations_detected_at ON compliance_violations(detected_at DESC);

-- Compliance Status Table
CREATE TABLE IF NOT EXISTS compliance_status (
    id TEXT PRIMARY KEY DEFAULT 'current',
    overall TEXT NOT NULL CHECK (overall IN ('compliant', 'warning', 'non_compliant')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    frameworks JSONB NOT NULL,
    active_violations INTEGER DEFAULT 0,
    critical_violations INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Incidents Table
CREATE TABLE IF NOT EXISTS security_incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'unauthorized_access', 'data_breach', 'malicious_activity', 'system_compromise',
        'denial_of_service', 'privacy_violation', 'insider_threat', 'phishing_attempt',
        'suspicious_login', 'anomalous_behavior'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('detected', 'investigating', 'contained', 'resolved', 'false_positive')) DEFAULT 'detected',
    impact TEXT NOT NULL CHECK (impact IN ('none', 'minimal', 'moderate', 'significant', 'severe')) DEFAULT 'minimal',
    
    -- Basic information
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by TEXT,
    
    -- Technical details
    source_ip_address INET,
    target_system TEXT,
    affected_users TEXT[],
    affected_data TEXT[],
    attack_vector TEXT,
    indicators TEXT[],
    
    -- Investigation details
    assigned_to TEXT,
    investigated_by TEXT,
    investigation_notes JSONB DEFAULT '[]',
    
    -- Resolution details
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution TEXT,
    lessons_learned TEXT,
    
    -- Impact assessment
    data_breach BOOLEAN DEFAULT FALSE,
    records_affected INTEGER DEFAULT 0,
    financial_impact DECIMAL(12,2) DEFAULT 0,
    reputational_impact TEXT CHECK (reputational_impact IN ('none', 'low', 'medium', 'high')) DEFAULT 'none',
    
    -- Notifications
    notifications_sent BOOLEAN DEFAULT FALSE,
    stakeholders_notified TEXT[] DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    related_incidents TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for security_incidents
CREATE INDEX idx_security_incidents_type ON security_incidents(type);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at DESC);
CREATE INDEX idx_security_incidents_assigned_to ON security_incidents(assigned_to);
CREATE INDEX idx_security_incidents_data_breach ON security_incidents(data_breach);

-- Security Evidence Table
CREATE TABLE IF NOT EXISTS security_evidence (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES security_incidents(id),
    type TEXT NOT NULL CHECK (type IN ('log', 'screenshot', 'network_capture', 'file', 'memory_dump', 'system_state')),
    description TEXT NOT NULL,
    file_path TEXT,
    url TEXT,
    hash TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collected_by TEXT NOT NULL,
    preserved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for security_evidence
CREATE INDEX idx_security_evidence_incident_id ON security_evidence(incident_id);
CREATE INDEX idx_security_evidence_type ON security_evidence(type);
CREATE INDEX idx_security_evidence_timestamp ON security_evidence(timestamp DESC);

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS security_alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'unauthorized_access', 'data_breach', 'malicious_activity', 'system_compromise',
        'denial_of_service', 'privacy_violation', 'insider_threat', 'phishing_attempt',
        'suspicious_login', 'anomalous_behavior'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    false_positive BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for security_alerts
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);

-- Threat Intelligence Table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id TEXT PRIMARY KEY,
    indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'hash', 'url', 'email')),
    indicator TEXT NOT NULL,
    threat_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    source TEXT NOT NULL,
    description TEXT,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for threat_intelligence
CREATE INDEX idx_threat_intelligence_indicator ON threat_intelligence(indicator);
CREATE INDEX idx_threat_intelligence_indicator_type ON threat_intelligence(indicator_type);
CREATE INDEX idx_threat_intelligence_severity ON threat_intelligence(severity);
CREATE INDEX idx_threat_intelligence_active ON threat_intelligence(active);
CREATE INDEX idx_threat_intelligence_last_seen ON threat_intelligence(last_seen DESC);

-- Legal Requests Table
CREATE TABLE IF NOT EXISTS legal_requests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'data_access', 'data_deletion', 'data_correction', 'data_portability',
        'objection_to_processing', 'restrict_processing', 'law_enforcement_request',
        'court_order', 'subpoena', 'national_security_request'
    )),
    status TEXT NOT NULL CHECK (status IN (
        'received', 'validated', 'processing', 'additional_info_required', 'pending_review',
        'approved', 'rejected', 'partially_fulfilled', 'fulfilled', 'appealed', 'expired'
    )) DEFAULT 'received',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    
    -- Request details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requestor JSONB NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'user_direct', 'law_enforcement', 'court_system', 'regulatory_agency',
        'government_agency', 'third_party'
    )),
    reference_number TEXT,
    jurisdiction TEXT,
    legal_basis TEXT,
    
    -- Data scope
    data_types TEXT[] NOT NULL,
    data_subjects TEXT[] NOT NULL,
    date_range JSONB,
    specific_records TEXT[],
    
    -- Processing details
    assigned_to TEXT,
    reviewed_by TEXT,
    approved_by TEXT,
    processing_steps JSONB DEFAULT '[]',
    
    -- Timeline
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_deadline TIMESTAMPTZ NOT NULL,
    
    -- User notifications
    user_notified BOOLEAN DEFAULT FALSE,
    user_notification_attempts INTEGER DEFAULT 0,
    last_user_notification_at TIMESTAMPTZ,
    
    -- Compliance details
    compliance_checks JSONB DEFAULT '[]',
    redactions_applied JSONB DEFAULT '[]',
    data_shared BOOLEAN DEFAULT FALSE,
    share_method TEXT,
    share_recipient TEXT,
    
    -- Appeal information
    appeal_deadline TIMESTAMPTZ,
    appeal_info JSONB,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    related_requests TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for legal_requests
CREATE INDEX idx_legal_requests_type ON legal_requests(type);
CREATE INDEX idx_legal_requests_status ON legal_requests(status);
CREATE INDEX idx_legal_requests_priority ON legal_requests(priority);
CREATE INDEX idx_legal_requests_received_at ON legal_requests(received_at DESC);
CREATE INDEX idx_legal_requests_response_deadline ON legal_requests(response_deadline);
CREATE INDEX idx_legal_requests_data_subjects ON legal_requests USING GIN(data_subjects);
CREATE INDEX idx_legal_requests_metadata ON legal_requests USING GIN(metadata);

-- Audit Report Configurations Table
CREATE TABLE IF NOT EXISTS audit_report_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    query JSONB NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    template TEXT,
    schedule TEXT,
    recipients TEXT[] NOT NULL,
    include_charts BOOLEAN DEFAULT TRUE,
    include_trends BOOLEAN DEFAULT TRUE,
    include_summary BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Reports Table
CREATE TABLE IF NOT EXISTS audit_reports (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL REFERENCES audit_report_configs(id),
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    summary JSONB NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    download_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit_reports
CREATE INDEX idx_audit_reports_config_id ON audit_reports(config_id);
CREATE INDEX idx_audit_reports_generated_at ON audit_reports(generated_at DESC);
CREATE INDEX idx_audit_reports_expires_at ON audit_reports(expires_at);

-- Privacy Budget Table
CREATE TABLE IF NOT EXISTS privacy_budget (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    total_budget DECIMAL(5,3) NOT NULL DEFAULT 1.0,
    used_budget DECIMAL(5,3) NOT NULL DEFAULT 0.0,
    remaining_budget DECIMAL(5,3) GENERATED ALWAYS AS (total_budget - used_budget) STORED,
    reset_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    daily_usage JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for privacy_budget
CREATE INDEX idx_privacy_budget_reset_date ON privacy_budget(reset_date);
CREATE INDEX idx_privacy_budget_used_budget ON privacy_budget(used_budget);

-- User Consents Table
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    consent_type TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn', 'expired')) DEFAULT 'active',
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_consents
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_status ON user_consents(status);
CREATE INDEX idx_user_consents_expires_at ON user_consents(expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on sensitive tables
ALTER TABLE enhanced_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhanced_audit_log
CREATE POLICY "Users can view their own audit logs" ON enhanced_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can view all audit logs" ON enhanced_audit_log
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    );

-- RLS Policies for security_incidents
CREATE POLICY "Security team can view security incidents" ON security_incidents
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('security_team', 'service_role')
    );

-- RLS Policies for legal_requests
CREATE POLICY "Users can view their own legal requests" ON legal_requests
    FOR SELECT USING (
        auth.uid() = ANY(SELECT jsonb_array_elements_text(data_subjects))
    );

CREATE POLICY "Legal team can view all legal requests" ON legal_requests
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('legal_team', 'service_role')
    );

-- RLS Policies for privacy_budget
CREATE POLICY "Users can view their own privacy budget" ON privacy_budget
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy budget" ON privacy_budget
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_consents
CREATE POLICY "Users can view their own consents" ON user_consents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own consents" ON user_consents
    FOR UPDATE USING (auth.uid() = user_id);

-- Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enhanced_audit_log_updated_at BEFORE UPDATE ON enhanced_audit_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_violations_updated_at BEFORE UPDATE ON compliance_violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_requests_updated_at BEFORE UPDATE ON legal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_budget_updated_at BEFORE UPDATE ON privacy_budget
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for legal_requests
CREATE OR REPLACE FUNCTION legal_request_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO enhanced_audit_log (
            event_type, severity, user_id, action, resource, 
            privacy_impact, metadata
        ) VALUES (
            'legal_request_received', 'high', 
            (NEW.data_subjects->>0)::text, 
            'legal_request_created', 'legal_tracker',
            'high', jsonb_build_object(
                'requestId', NEW.id,
                'type', NEW.type,
                'priority', NEW.priority
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO enhanced_audit_log (
                event_type, severity, action, resource,
                privacy_impact, metadata
            ) VALUES (
                'legal_request_processed', 'medium',
                'legal_request_status_updated', 'legal_tracker',
                'medium', jsonb_build_object(
                    'requestId', NEW.id,
                    'oldStatus', OLD.status,
                    'newStatus', NEW.status
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_request_audit_trigger
    AFTER INSERT OR UPDATE ON legal_requests
    FOR EACH ROW EXECUTE FUNCTION legal_request_audit_trigger();

-- Privacy budget reset function
CREATE OR REPLACE FUNCTION reset_privacy_budget()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reset_date <= NOW() THEN
        NEW.used_budget = 0.0;
        NEW.reset_date = NOW() + INTERVAL '30 days';
        NEW.daily_usage = '{}';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_budget_reset_trigger
    BEFORE UPDATE ON privacy_budget
    FOR EACH ROW EXECUTE FUNCTION reset_privacy_budget();

-- Consent expiry function
CREATE OR REPLACE FUNCTION check_consent_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at AND NEW.expires_at <= NOW() THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_expiry_trigger
    BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION check_consent_expiry();

-- Initial data insertion

-- Insert default audit metadata
INSERT INTO audit_metadata (key, previous_hash, updated_at)
VALUES ('last_hash', NULL, NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert default compliance rules
INSERT INTO compliance_rules (id, name, description, type, framework, enabled, severity, check_interval, parameters)
VALUES 
    ('gdpr_data_retention', 'GDPR Data Retention Policy', 'Ensure personal data is not retained longer than necessary', 'data_retention', 'gdpr', TRUE, 'high', 60, '{"maxRetentionDays": 365, "dataTypes": ["user_profile", "location_data", "emergency_reports"]}'),
    ('privacy_budget_monitor', 'Privacy Budget Monitoring', 'Monitor user privacy budget consumption', 'privacy_budget', 'gdpr', TRUE, 'medium', 30, '{"warningThreshold": 0.8, "criticalThreshold": 0.95, "resetPeriod": 30}'),
    ('access_control_verification', 'Access Control Verification', 'Verify proper access controls are in place', 'access_control', 'gdpr', TRUE, 'critical', 120, '{"requireAuthentication": true, "auditAccess": true, "checkUnauthorizedAttempts": true, "maxFailedAttempts": 5}')
ON CONFLICT (id) DO NOTHING;

-- Insert initial compliance status
INSERT INTO compliance_status (id, overall, score, frameworks, active_violations, critical_violations, last_updated)
VALUES (
    'current', 
    'compliant', 
    100, 
    '{"gdpr": {"status": "compliant", "score": 100, "violations": 0}, "ccpa": {"status": "compliant", "score": 100, "violations": 0}, "hipaa": {"status": "compliant", "score": 100, "violations": 0}, "sox": {"status": "compliant", "score": 100, "violations": 0}}',
    0, 
    0, 
    NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;