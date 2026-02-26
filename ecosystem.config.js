/**
 * PM2 Ecosystem Config — NBU Mental Health Platform
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # start ทั้งหมด
 *   pm2 restart ecosystem.config.js        # restart ทั้งหมด
 *   pm2 stop ecosystem.config.js           # stop ทั้งหมด
 *   pm2 delete ecosystem.config.js         # ลบออกจาก pm2
 *   pm2 save                               # บันทึก process list (auto-start on reboot)
 *   pm2 startup                            # ตั้ง systemd hook (ทำครั้งแรกครั้งเดียว)
 *   pm2 logs nbu-api                       # ดู log ของ API
 */

module.exports = {
    apps: [
        // ─── Node.js API ────────────────────────────────────────────────────
        {
            name: 'nbu-api',
            script: 'apps/api/dist/index.js',
            cwd: '/opt/nbu-mental-health',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3201,
            },
            error_file: '/var/log/nbu/api-error.log',
            out_file: '/var/log/nbu/api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            restart_delay: 3000,
            max_restarts: 10,
            watch: false,
        },

        // ─── Job Worker ──────────────────────────────────────────────────────
        {
            name: 'nbu-worker',
            script: 'apps/api/dist/worker.js',
            cwd: '/opt/nbu-mental-health',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
            },
            error_file: '/var/log/nbu/worker-error.log',
            out_file: '/var/log/nbu/worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            restart_delay: 5000,
            max_restarts: 10,
            watch: false,
        },

        // ─── Admin Portal (Next.js) ──────────────────────────────────────────
        {
            name: 'nbu-admin',
            script: 'node_modules/.bin/next',
            args: 'start -p 3202',
            cwd: '/opt/nbu-mental-health/apps/admin',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3202,
            },
            error_file: '/var/log/nbu/admin-error.log',
            out_file: '/var/log/nbu/admin-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            restart_delay: 3000,
            max_restarts: 10,
            watch: false,
        },

        // ─── LIFF App (Next.js) ──────────────────────────────────────────────
        {
            name: 'nbu-liff',
            script: 'node_modules/.bin/next',
            args: 'start -p 3203',
            cwd: '/opt/nbu-mental-health/apps/liff',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3203,
            },
            error_file: '/var/log/nbu/liff-error.log',
            out_file: '/var/log/nbu/liff-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            restart_delay: 3000,
            max_restarts: 10,
            watch: false,
        },
    ],
}
