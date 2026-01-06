import knex from 'knex';
import config from '../knexfile.js';

const MANUAL_MIGRATIONS_DIR = './manual-migrations';
const MANUAL_TABLE = 'manual_migrations';

const loadConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = config[env];
  if (!envConfig) {
    throw new Error(`Missing knex config for ${env}`);
  }
  return envConfig;
};

const run = async () => {
  const baseConfig = loadConfig();
  const db = knex({
    ...baseConfig,
    migrations: {
      ...baseConfig.migrations,
      directory: MANUAL_MIGRATIONS_DIR,
      tableName: MANUAL_TABLE
    }
  });

  try {
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
};

run().catch((error) => {
  console.error('Manual migrations failed:', error);
  process.exitCode = 1;
});
