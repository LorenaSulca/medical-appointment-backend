import type {
  Pool
} from "mysql2/promise";

import {
  MySQLCountryAppointmentRepository
} from "../../src/infrastructure/database/mysql-country-appointment-repository";

describe(
  "MySQLCountryAppointmentRepository",
  () => {
    it("registra el agendamiento mediante una consulta parametrizada", async () => {
      const execute =
        jest.fn().mockResolvedValue([
          {
            affectedRows: 1
          },
          []
        ]);

      const pool = {
        execute
      } as unknown as Pool;

      const repository =
        new MySQLCountryAppointmentRepository(
          pool
        );

      await repository.save({
        appointmentId:
          "11111111-2222-4333-8444-555555555555",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        requestedAt:
          "2026-07-10T20:00:00.000Z"
      });

      expect(execute).toHaveBeenCalledTimes(1);

      const [
        statement,
        parameters
      ] = execute.mock.calls[0];

      expect(statement).toContain(
        "INSERT INTO appointments"
      );

      expect(statement).toContain(
        "ON DUPLICATE KEY UPDATE"
      );

      expect(parameters).toEqual([
        "11111111-2222-4333-8444-555555555555",
        "00125",
        100,
        "PE",
        "completed",
        new Date(
          "2026-07-10T20:00:00.000Z"
        )
      ]);
    });
  }
);