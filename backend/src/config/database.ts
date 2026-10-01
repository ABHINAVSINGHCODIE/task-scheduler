import { Sequelize } from 'sequelize';
import path from 'path';
import { env } from './env';

const isPostgres = process.env.DB_DIALECT === 'postgres';

export const sequelize = isPostgres
  ? new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: 'postgres',
      logging: env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: false,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.resolve(__dirname, '../../database.sqlite'),
      logging: false,
      define: {
        timestamps: true,
        underscored: false,
      },
    });

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(`[Database] ${isPostgres ? 'PostgreSQL' : 'SQLite'} connection established successfully.`);
    await sequelize.sync();
    console.log('[Database] Models synchronized.');
  } catch (error) {
    console.error('[Database] Unable to connect:', error);
    throw error;
  }
}
