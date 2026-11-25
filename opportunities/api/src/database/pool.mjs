import mysql from 'mysql2/promise';

export function parseMysqlUrl(databaseUrl, { mysqlSsl = true } = {}) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid MySQL connection URL.');
  }

  if (url.protocol !== 'mysql:' || !url.hostname || !url.username || !url.pathname.replace(/^\/+/, '')) {
    throw new Error('DATABASE_URL must use mysql:// and include a host, user, and database name.');
  }

  const port = url.port ? Number(url.port) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_URL contains an invalid port.');
  }

  let user;
  let password;
  let database;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('DATABASE_URL contains invalid URL encoding.');
  }

  return {
    host: url.hostname,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 30_000,
    queueLimit: 0,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    multipleStatements: false,
    ...(mysqlSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

export function createDatabasePool(databaseUrl, options = {}) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database operations.');
  }
  return mysql.createPool(parseMysqlUrl(databaseUrl, options));
}
