export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslEnabled: boolean;
}

export function createMySQLConfigFromEnvironment(
  prefix: "PE" | "CL"
): MySQLConfig {
  return {
    host: requiredEnvironmentVariable(
      `${prefix}_DB_HOST`
    ),
    port: parsePort(
      requiredEnvironmentVariable(
        `${prefix}_DB_PORT`
      )
    ),
    user: requiredEnvironmentVariable(
      `${prefix}_DB_USER`
    ),
    password: requiredEnvironmentVariable(
      `${prefix}_DB_PASSWORD`
    ),
    database: requiredEnvironmentVariable(
      `${prefix}_DB_NAME`
    ),
    sslEnabled:
      process.env[`${prefix}_DB_SSL`] === "true"
  };
}

function requiredEnvironmentVariable(
  name: string
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}.`
    );
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);

  if (
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
    throw new Error(
      `El puerto de MySQL no es válido: ${value}.`
    );
  }

  return port;
}