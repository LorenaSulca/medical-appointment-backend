import {
  createPool,
  type Pool
} from "mysql2/promise";

import type {
  MySQLConfig
} from "./mysql-config";

export function createMySQLPool(
  config: MySQLConfig
): Pool {
  return createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,

    waitForConnections: true,
    connectionLimit: 2,
    maxIdle: 2,
    idleTimeout: 60_000,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    ssl: config.sslEnabled
      ? {
          rejectUnauthorized: true
        }
      : undefined
  });
}