import {
  CreateAppointment
} from "../../src/application/use-cases/create-appointment";
import {
  ListAppointmentsByInsured
} from "../../src/application/use-cases/list-appointments-by-insured";
import {
  InMemoryAppointmentEventPublisher
} from "../../src/infrastructure/messaging/in-memory-appointment-event-publisher";
import {
  InMemoryAppointmentRepository
} from "../../src/infrastructure/repositories/in-memory-appointment-repository";

describe("ListAppointmentsByInsured", () => {
  it("devuelve las solicitudes del asegurado", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    const publisher =
      new InMemoryAppointmentEventPublisher();

    let sequence = 0;

    const createAppointment =
      new CreateAppointment({
        appointmentRepository: repository,
        eventPublisher: publisher,
        generateId: () => {
          sequence += 1;
          return `appointment-${sequence}`;
        },
        now: () =>
          new Date(
            `2026-07-10T20:00:0${sequence}.000Z`
          )
      });

    await createAppointment.execute({
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE"
    });

    await createAppointment.execute({
      insuredId: "00125",
      scheduleId: 200,
      countryISO: "CL"
    });

    await createAppointment.execute({
      insuredId: "99999",
      scheduleId: 300,
      countryISO: "PE"
    });

    const listAppointments =
      new ListAppointmentsByInsured(repository);

    const result =
      await listAppointments.execute("00125");

    expect(result).toHaveLength(2);

    expect(
      result.every(
        (appointment) =>
          appointment.insuredId === "00125"
      )
    ).toBe(true);
  });

  it("devuelve una lista vacía cuando no existen solicitudes", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    const listAppointments =
      new ListAppointmentsByInsured(repository);

    await expect(
      listAppointments.execute("00125")
    ).resolves.toEqual([]);
  });

  it("rechaza un código de asegurado inválido", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    const listAppointments =
      new ListAppointmentsByInsured(repository);

    await expect(
      listAppointments.execute("125")
    ).rejects.toMatchObject({
      code: "INVALID_INSURED_ID",
      statusCode: 400
    });
  });
});