import knex from 'knex';
import pg from 'pg';
import { config } from './config.js';

// Return PostgreSQL `date` columns as plain "YYYY-MM-DD" strings instead of Date objects.
// Without this, pg creates Date objects at local midnight, which shifts the date when
// read back with UTC methods (e.g. getUTCDate) on a UTC+7 server.
pg.types.setTypeParser(1082, (val: string) => val);

export const db = knex({
    client: 'pg',
    connection: config.DATABASE_URL,
    pool: {
        min: 2,
        max: 10,
    },
    // Use snake_case in DB, camelCase in JS
    wrapIdentifier: (value, origImpl) => origImpl(value),
});

export default db;
