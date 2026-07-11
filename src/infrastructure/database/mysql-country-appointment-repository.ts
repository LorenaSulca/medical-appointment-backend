import type {
  ResultSetHeader
} from "mysql2";
import type {
  Pool
} from "mysql2/promise";

import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import type {
  CountryAppointmentRepository
} from "../../application/ports/country-appointment-repository";

export class MySQLCountryAppointmentRepository
  implements CountryAppointmentRepository
{
  constructor(
    private readonly pool: Pool
  ) {}

  async save(
    appointment: AppointmentRequestedEvent
  ): Promise<void> {
    await this.pool.execute<ResultSetHeader>(
      `
        INSERT INTO appointments (
          appointment_id,
          insured_id,
          schedule_id,
          country_iso,
          status,
          requested_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE
          appointment_id = VALUES(appointment_id)
      `,
      [
        appointment.appointmentId,
        appointment.insuredId,
        appointment.scheduleId,
        appointment.countryISO,
        "completed",
        toMySQLDateTime(
          appointment.requestedAt
        )
      ]
    );
  }
}

function toMySQLDateTime(
  isoDate: string
): Date {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Fecha inválida: ${isoDate}.`
    );
  }

  return date;
}