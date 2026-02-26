#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NBU Mental Health — Database Migration Runner
# รันครั้งเดียวตอนติดตั้งครั้งแรก หรือเมื่อมี migration ใหม่
#
# Usage:
#   chmod +x infra/migrate.sh
#   ./infra/migrate.sh
#
# ต้องมี DATABASE_URL ใน .env ก่อน
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="/var/www/app/nbu-mental-health"
SQL_DIR="$PROJECT_DIR/SQL"

# โหลด DATABASE_URL จาก .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. ตรวจสอบ .env ก่อน"
    exit 1
fi

echo "🗄️  Running migrations against: $(echo $DATABASE_URL | sed 's/:\/\/.*@/:\/\/***@/')"
echo ""

run_migration() {
    local file="$1"
    local name=$(basename "$file")
    echo -n "  ▶ $name ... "
    psql "$DATABASE_URL" -f "$file" -q 2>&1
    echo "✓"
}

# รันตามลำดับ
for sql_file in \
    "$SQL_DIR/000_init.sql" \
    "$SQL_DIR/010_schemas.sql" \
    "$SQL_DIR/020_public_users.sql" \
    "$SQL_DIR/021_public_students.sql" \
    "$SQL_DIR/022_public_line_links.sql" \
    "$SQL_DIR/023_public_audit_log.sql" \
    "$SQL_DIR/024_public_jobs.sql" \
    "$SQL_DIR/025_public_resources.sql" \
    "$SQL_DIR/030_advisory_advisors.sql" \
    "$SQL_DIR/031_advisory_slots.sql" \
    "$SQL_DIR/032_advisory_appointments.sql" \
    "$SQL_DIR/033_advisory_referrals.sql" \
    "$SQL_DIR/040_clinical_counselors.sql" \
    "$SQL_DIR/041_clinical_slots.sql" \
    "$SQL_DIR/042_clinical_appointments.sql" \
    "$SQL_DIR/043_clinical_screenings.sql" \
    "$SQL_DIR/044_clinical_cases.sql" \
    "$SQL_DIR/045_clinical_case_notes.sql" \
    "$SQL_DIR/050_analytics_daily_metrics.sql" \
    "$SQL_DIR/060_partial_unique_indexes.sql" \
    "$SQL_DIR/061_line_event_dedupe.sql" \
    "$SQL_DIR/070_updated_at_trigger.sql" \
    "$SQL_DIR/080_add_verify_columns.sql" \
    "$SQL_DIR/090_staff_line_user_id.sql" \
    "$SQL_DIR/091_add_name_faculty_to_users.sql"
do
    run_migration "$sql_file"
done

echo ""
echo "✅ All migrations complete!"
