import knex from 'knex';
import config from '../knexfile.js';

const SEED_PREFIX = 'seed-';
const EXPECTED_COUNT = 18;
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = config[env];
  if (!envConfig) {
    throw new Error(`Missing knex config for ${env}`);
  }
  return envConfig;
};

const waitForDatabase = async (db) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await db.raw('select 1');
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      console.log(`Waiting for database... (${attempt}/${MAX_ATTEMPTS})`);
      await sleep(RETRY_DELAY_MS);
    }
  }
};

const main = async () => {
  const db = knex(getConfig());
  try {
    await waitForDatabase(db);
    await db.migrate.latest();
    const [{ count }] = await db('products')
      .where('slug', 'like', `${SEED_PREFIX}%`)
      .count({ count: '*' });
    const existingCount = Number(count) || 0;
    if (existingCount >= EXPECTED_COUNT) {
      console.log(`Seed data already present (${existingCount} products).`);
      return;
    }
    console.log('Seeding sample products...');
    await db.seed.run();
    console.log('Seed data inserted.');
  } finally {
    await db.destroy();
  }
};

main().catch((error) => {
  console.error('Seed bootstrap failed:', error);
  process.exitCode = 1;
});
