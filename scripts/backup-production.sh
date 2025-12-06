#!/bin/bash

# Production Backup Script for OpenRelief
# This script performs automated backups of all critical systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/openrelief/production"
LOG_FILE="/var/log/openrelief/backup_${BACKUP_DATE}.log"
RETENTION_DAYS=30
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    send_alert "Backup Failed" "$1"
    exit 1
}

# Success notification
success_notify() {
    log "${GREEN}SUCCESS: $1${NC}"
    send_alert "Backup Success" "$1"
}

# Alert function
send_alert() {
    local title="$1"
    local message="$2"
    
    # Send to Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${title}: ${message}\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Send to monitoring system
    if [ -n "$SENTRY_DSN" ]; then
        curl -X POST "https://sentry.io/api/0/projects/organization/project/envelope/" \
            -H "Content-Type: application/x-sentry-envelope" \
            -d "{\"event\":{\"message\":\"${title}: ${message}\",\"level\":\"${title%% *}\"}}"
    fi
}

# Database backup
backup_database() {
    log "${BLUE}Starting database backup...${NC}"
    
    local db_backup_file="${BACKUP_DIR}/database_${BACKUP_DATE}.sql"
    local db_backup_encrypted="${db_backup_file}.enc"
    
    # Create database backup
    if ! pg_dump "$DATABASE_URL" \
        --no-password \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="$db_backup_file" >> "$LOG_FILE" 2>&1; then
        error_exit "Database backup failed"
    fi
    
    # Encrypt backup
    if ! openssl enc -aes-256-cbc -salt -in "$db_backup_file" -out "$db_backup_encrypted" -k "$ENCRYPTION_KEY"; then
        error_exit "Database backup encryption failed"
    fi
    
    # Remove unencrypted backup
    rm "$db_backup_file"
    
    # Verify backup
    if ! openssl enc -d -aes-256-cbc -in "$db_backup_encrypted" -out /dev/null -k "$ENCRYPTION_KEY"; then
        error_exit "Database backup verification failed"
    fi
    
    success_notify "Database backup completed: $(du -h "$db_backup_encrypted" | cut -f1)"
}

# File storage backup
backup_storage() {
    log "${BLUE}Starting file storage backup...${NC}"
    
    local storage_backup_file="${BACKUP_DIR}/storage_${BACKUP_DATE}.tar.gz"
    local storage_backup_encrypted="${storage_backup_file}.enc"
    
    # Create storage backup
    if ! tar -czf "$storage_backup_file" \
        --exclude='*.tmp' \
        --exclude='*.log' \
        /var/lib/openrelief/storage >> "$LOG_FILE" 2>&1; then
        error_exit "Storage backup failed"
    fi
    
    # Encrypt backup
    if ! openssl enc -aes-256-cbc -salt -in "$storage_backup_file" -out "$storage_backup_encrypted" -k "$ENCRYPTION_KEY"; then
        error_exit "Storage backup encryption failed"
    fi
    
    # Remove unencrypted backup
    rm "$storage_backup_file"
    
    success_notify "Storage backup completed: $(du -h "$storage_backup_encrypted" | cut -f1)"
}

# Configuration backup
backup_config() {
    log "${BLUE}Starting configuration backup...${NC}"
    
    local config_backup_file="${BACKUP_DIR}/config_${BACKUP_DATE}.tar.gz"
    local config_backup_encrypted="${config_backup_file}.enc"
    
    # Create configuration backup
    if ! tar -czf "$config_backup_file" \
        /etc/openrelief \
        /opt/openrelief/config \
        .env.production \
        vercel.json \
        config/security.production.json >> "$LOG_FILE" 2>&1; then
        error_exit "Configuration backup failed"
    fi
    
    # Encrypt backup
    if ! openssl enc -aes-256-cbc -salt -in "$config_backup_file" -out "$config_backup_encrypted" -k "$ENCRYPTION_KEY"; then
        error_exit "Configuration backup encryption failed"
    fi
    
    # Remove unencrypted backup
    rm "$config_backup_file"
    
    success_notify "Configuration backup completed: $(du -h "$config_backup_encrypted" | cut -f1)"
}

# Upload to cloud storage
upload_to_cloud() {
    log "${BLUE}Uploading backups to cloud storage...${NC}"
    
    local s3_bucket="openrelief-backups"
    
    # Upload all encrypted backups
    for backup_file in "${BACKUP_DIR}"/*_${BACKUP_DATE}.sql.enc "${BACKUP_DIR}"/*_${BACKUP_DATE}.tar.gz.enc; do
        if [ -f "$backup_file" ]; then
            local filename=$(basename "$backup_file")
            
            if ! aws s3 cp "$backup_file" "s3://${s3_bucket}/production/${filename}" \
                --storage-class GLACIER_IR \
                --server-side-encryption AES256 >> "$LOG_FILE" 2>&1; then
                error_exit "Failed to upload $filename to S3"
            fi
            
            log "Uploaded $filename to S3"
        fi
    done
    
    success_notify "All backups uploaded to cloud storage"
}

# Cleanup old backups
cleanup_old_backups() {
    log "${BLUE}Cleaning up old backups...${NC}"
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.enc" -mtime +7 -delete >> "$LOG_FILE" 2>&1
    
    # Cloud cleanup
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://openrelief-backups/production/" | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}' | tr -d '-')
            if [ "$file_date" -lt "$cutoff_date" ]; then
                local filename=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://openrelief-backups/production/$filename" >> "$LOG_FILE" 2>&1
                log "Deleted old backup: $filename"
            fi
        done
    
    success_notify "Old backups cleanup completed"
}

# Verify backup integrity
verify_backups() {
    log "${BLUE}Verifying backup integrity...${NC}"
    
    local verification_failed=false
    
    for backup_file in "${BACKUP_DIR}"/*_${BACKUP_DATE}.enc; do
        if [ -f "$backup_file" ]; then
            if ! openssl enc -d -aes-256-cbc -in "$backup_file" -out /dev/null -k "$ENCRYPTION_KEY"; then
                log "${RED}Backup verification failed for: $backup_file${NC}"
                verification_failed=true
            fi
        fi
    done
    
    if [ "$verification_failed" = true ]; then
        error_exit "Backup integrity verification failed"
    fi
    
    success_notify "All backup integrity checks passed"
}

# Create backup manifest
create_manifest() {
    log "${BLUE}Creating backup manifest...${NC}"
    
    local manifest_file="${BACKUP_DIR}/manifest_${BACKUP_DATE}.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_id": "${BACKUP_DATE}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "backups": [
    {
      "type": "database",
      "file": "database_${BACKUP_DATE}.sql.enc",
      "size": "$(du -b "${BACKUP_DIR}/database_${BACKUP_DATE}.sql.enc" | cut -f1)",
      "checksum": "$(sha256sum "${BACKUP_DIR}/database_${BACKUP_DATE}.sql.enc" | cut -d' ' -f1)"
    },
    {
      "type": "storage",
      "file": "storage_${BACKUP_DATE}.tar.gz.enc",
      "size": "$(du -b "${BACKUP_DIR}/storage_${BACKUP_DATE}.tar.gz.enc" | cut -f1)",
      "checksum": "$(sha256sum "${BACKUP_DIR}/storage_${BACKUP_DATE}.tar.gz.enc" | cut -d' ' -f1)"
    },
    {
      "type": "configuration",
      "file": "config_${BACKUP_DATE}.tar.gz.enc",
      "size": "$(du -b "${BACKUP_DIR}/config_${BACKUP_DATE}.tar.gz.enc" | cut -f1)",
      "checksum": "$(sha256sum "${BACKUP_DIR}/config_${BACKUP_DATE}.tar.gz.enc" | cut -d' ' -f1)"
    }
  ],
  "retention_days": ${RETENTION_DAYS},
  "encryption": "AES-256-CBC",
  "backup_script_version": "1.0.0"
}
EOF
    
    # Encrypt manifest
    openssl enc -aes-256-cbc -salt -in "$manifest_file" -out "${manifest_file}.enc" -k "$ENCRYPTION_KEY"
    rm "$manifest_file"
    
    # Upload manifest
    aws s3 cp "${manifest_file}.enc" "s3://openrelief-backups/production/manifest_${BACKUP_DATE}.json.enc" \
        --storage-class GLACIER_IR \
        --server-side-encryption AES256 >> "$LOG_FILE" 2>&1
    
    success_notify "Backup manifest created and uploaded"
}

# Test restore capability
test_restore() {
    log "${BLUE}Testing restore capability...${NC}"
    
    local test_dir="/tmp/openrelief_restore_test_${BACKUP_DATE}"
    mkdir -p "$test_dir"
    
    # Test database restore
    local db_backup="${BACKUP_DIR}/database_${BACKUP_DATE}.sql.enc"
    if [ -f "$db_backup" ]; then
        if ! openssl enc -d -aes-256-cbc -in "$db_backup" -out "${test_dir}/test_restore.sql" -k "$ENCRYPTION_KEY"; then
            error_exit "Database restore test failed"
        fi
        
        # Verify SQL file is valid
        if ! pg_restore --list "${test_dir}/test_restore.sql" > /dev/null 2>&1; then
            error_exit "Database restore verification failed"
        fi
    fi
    
    # Cleanup test directory
    rm -rf "$test_dir"
    
    success_notify "Restore capability test passed"
}

# Main backup function
main() {
    log "${BLUE}Starting production backup process...${NC}"
    log "Backup ID: $BACKUP_DATE"
    
    # Check prerequisites
    if [ -z "$ENCRYPTION_KEY" ]; then
        error_exit "Encryption key not set"
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        error_exit "Database URL not set"
    fi
    
    # Check disk space (require at least 10GB free)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then
        error_exit "Insufficient disk space for backup"
    fi
    
    # Execute backup steps
    backup_database
    backup_storage
    backup_config
    verify_backups
    upload_to_cloud
    create_manifest
    test_restore
    cleanup_old_backups
    
    log "${GREEN}Production backup completed successfully!${NC}"
    log "Backup ID: $BACKUP_DATE"
    log "Total backup size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
    log "Log file: $LOG_FILE"
}

# Trap for cleanup
trap 'error_exit "Backup interrupted"' INT TERM

# Run main function
main "$@"