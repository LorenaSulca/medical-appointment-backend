import {
  CompleteAppointment
} from "../../src/application/use-cases/complete-appointment";
import {
  Appointment
} from "../../src/domain/entities/appointment";
import {
  InMemoryAppointmentRepository
} from "../../src/infrastructure/repositories/in-memory-appointment-repository";

describe("CompleteAppointment", () => {
  const completedDate =
    new Date("2026-07-10T20:00:05.000Z");

  const event = {
    appointmentId: "appointment-1",
    insuredId: "00125",
    scheduleId: 100,
    countryISO: "PE" as const,
    status: "completed" as const,
    completedAt:
      "2026-07-10T20:00:05.000Z"
  };

  function createPendingAppointment(): Appointment {
    return Appointment.create({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      status: "pending",
      createdAt:
        "2026-07-10T20:00:00.000Z",
      updatedAt:
        "2026-07-10T20:00:00.000Z"
    });
  }

  it("actualiza el agendamiento a completed", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    await repository.save(
      createPendingAppointment()
    );

    const useCase =
      new CompleteAppointment({
        appointmentRepository: repository,
        now: () => completedDate
      });

    await useCase.execute(event);

    const appointment =
      await repository.findByAppointmentId(
        "appointment-1"
      );

    expect(appointment?.status).toBe(
      "completed"
    );

    expect(appointment?.updatedAt).toBe(
      completedDate.toISOString()
    );
  });

  it("es idempotente cuando ya está completed", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    await repository.save(
      createPendingAppointment().complete(
        completedDate.toISOString()
      )
    );

    const updateSpy =
      jest.spyOn(repository, "update");

    const useCase =
      new CompleteAppointment({
        appointmentRepository: repository
      });

    await useCase.execute(event);
    await useCase.execute(event);

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rechaza un evento que no coincide con el registro", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    await repository.save(
      createPendingAppointment()
    );

    const useCase =
      new CompleteAppointment({
        appointmentRepository: repository
      });

    await expect(
      useCase.execute({
        ...event,
        scheduleId: 999
      })
    ).rejects.toMatchObject({
      code: "APPOINTMENT_EVENT_MISMATCH",
      statusCode: 409
    });
  });

  it("rechaza un appointmentId inexistente", async () => {
    const repository =
      new InMemoryAppointmentRepository();

    const useCase =
      new CompleteAppointment({
        appointmentRepository: repository
      });

    await expect(
      useCase.execute(event)
    ).rejects.toMatchObject({
      code: "APPOINTMENT_NOT_FOUND",
      statusCode: 404
    });
  });
});