import {
  EventBridgeClient
} from "@aws-sdk/client-eventbridge";

import {
  ProcessCountryAppointment
} from "../application/use-cases/process-country-appointment";
import type {
  CountryISO
} from "../domain/entities/appointment";
import {
  EventBridgeAppointmentCompletionPublisher
} from "../infrastructure/aws/eventbridge-appointment-completion-publisher";
import {
  createMySQLConfigFromEnvironment
} from "../infrastructure/database/mysql-config";
import {
  MySQLCountryAppointmentRepository
} from "../infrastructure/database/mysql-country-appointment-repository";
import {
  createMySQLPool
} from "../infrastructure/database/mysql-pool-factory";

const instances =
  new Map<CountryISO, ProcessCountryAppointment>();

export function getCountryProcessor(
  countryISO: CountryISO
): ProcessCountryAppointment {
  const existing =
    instances.get(countryISO);

  if (existing) {
    return existing;
  }

  const pool = createMySQLPool(
    createMySQLConfigFromEnvironment(
      countryISO
    )
  );

  const repository =
    new MySQLCountryAppointmentRepository(
      pool
    );

  const eventBridgeClient =
    new EventBridgeClient({});

  const completionPublisher =
    new EventBridgeAppointmentCompletionPublisher(
      eventBridgeClient,
      requiredEnvironmentVariable(
        "APPOINTMENT_EVENT_BUS_NAME"
      )
    );

  const processor =
    new ProcessCountryAppointment({
      repository,
      completionPublisher,
      expectedCountry: countryISO
    });

  instances.set(countryISO, processor);

  return processor;
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