/**
 * import-students.ts
 * นำเข้าข้อมูลนักศึกษาจากไฟล์ CSV เข้า public.students
 *
 * CSV Format (UTF-8 BOM หรือ UTF-8, มีหัว header):
 *   student_code,faculty,year,dob,id_card,passport
 *
 * Columns:
 *   student_code  - รหัสนักศึกษา (บังคับ) เช่น 6501234567
 *   faculty       - คณะ (บังคับ) เช่น วิศวกรรมศาสตร์
 *   year          - ชั้นปี 1-6 (บังคับ) เช่น 2
 *   dob           - วันเกิด YYYY-MM-DD (บังคับ) เช่น 2003-05-15
 *   id_card       - เลขบัตรประชาชน 13 หลัก (ถ้าว่าง = ใช้ passport)
 *   passport      - เลขหนังสือเดินทาง (ถ้าว่าง = ใช้ id_card)
 *
 * Usage:
 *   npx tsx scripts/import-students.ts students.csv
 *   npx tsx scripts/import-students.ts students.csv --dry-run
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { parse } from 'csv-parse/sync'
import db from '../src/db.js'

const HASH_SALT = 'nbu-mh-v1'

function hashData(value: string): string {
    return crypto.createHash('sha256').update(HASH_SALT + ':' + value).digest('hex')
}

interface CsvRow {
    student_code: string
    faculty: string
    year: string
    dob: string
    id_card?: string
    passport?: string
}

async function main() {
    const args = process.argv.slice(2)
    const csvFile = args.find(a => !a.startsWith('--'))
    const isDryRun = args.includes('--dry-run')

    if (!csvFile) {
        console.error('Usage: npx tsx scripts/import-students.ts <file.csv> [--dry-run]')
        process.exit(1)
    }

    const filePath = path.resolve(csvFile)
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        process.exit(1)
    }

    // อ่าน CSV (รองรับ UTF-8 BOM จาก Excel)
    let content = fs.readFileSync(filePath, 'utf8')
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1) // strip BOM

    const rows: CsvRow[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    })

    console.log(`\nอ่านข้อมูล: ${rows.length} แถว จากไฟล์ ${path.basename(filePath)}`)
    if (isDryRun) console.log('⚠️  DRY RUN — ไม่บันทึกจริง\n')

    let inserted = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const lineNum = i + 2 // +2 because row 1 is header

        // Validate required fields
        if (!row.student_code?.trim()) {
            console.error(`  [แถว ${lineNum}] ❌ ไม่มี student_code — ข้ามแถวนี้`)
            errors++
            continue
        }
        if (!row.faculty?.trim()) {
            console.error(`  [แถว ${lineNum}] ❌ ${row.student_code}: ไม่มี faculty — ข้ามแถวนี้`)
            errors++
            continue
        }
        const yearNum = parseInt(row.year, 10)
        if (!row.year || isNaN(yearNum) || yearNum < 1 || yearNum > 10) {
            console.error(`  [แถว ${lineNum}] ❌ ${row.student_code}: year ไม่ถูกต้อง "${row.year}"`)
            errors++
            continue
        }
        if (!row.dob?.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.error(`  [แถว ${lineNum}] ❌ ${row.student_code}: dob ต้องเป็น YYYY-MM-DD ได้รับ "${row.dob}"`)
            errors++
            continue
        }
        const hasIdCard = row.id_card?.trim()
        const hasPassport = row.passport?.trim()
        if (!hasIdCard && !hasPassport) {
            console.error(`  [แถว ${lineNum}] ❌ ${row.student_code}: ต้องมี id_card หรือ passport อย่างน้อยหนึ่งอย่าง`)
            errors++
            continue
        }

        // Prepare record
        const record: Record<string, unknown> = {
            student_code: row.student_code.trim(),
            faculty: row.faculty.trim(),
            year: yearNum,
            status: 'active',
            dob_hash: hashData(row.dob.trim()),
            id_card_hash: hasIdCard ? hashData(hasIdCard.replace(/\s/g, '')) : null,
            passport_hash: hasPassport ? hashData(hasPassport.trim().toUpperCase()) : null,
            verify_doc_type: hasIdCard ? 'national_id' : 'passport',
        }

        if (isDryRun) {
            console.log(`  [แถว ${lineNum}] ✅ ${record.student_code} | ${record.faculty} ปี${record.year} | dob_hash: ${String(record.dob_hash).slice(0, 8)}...`)
            inserted++
            continue
        }

        try {
            await db('public.students')
                .insert(record)
                .onConflict('student_code')
                .merge(['faculty', 'year', 'dob_hash', 'id_card_hash', 'passport_hash', 'verify_doc_type', 'updated_at'])
            inserted++
            console.log(`  [แถว ${lineNum}] ✅ ${record.student_code} — บันทึกแล้ว`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`  [แถว ${lineNum}] ❌ ${record.student_code} — ${msg}`)
            errors++
        }
    }

    console.log(`\n─── สรุป ───────────────────────────`)
    console.log(`  บันทึกสำเร็จ : ${inserted}`)
    console.log(`  ข้าม / Error : ${errors}`)
    if (skipped) console.log(`  ข้าม (ซ้ำ)   : ${skipped}`)
    console.log(`────────────────────────────────────\n`)

    await db.destroy()
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
