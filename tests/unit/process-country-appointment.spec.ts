import {
  ProcessCountryAppointment
} from "../../src/application/use-cases/process-country-appointment";
import {
  InMemoryAppointmentCompletionPublisher
} from "../../src/infrastructure/messaging/in-memory-appointment-completion-publisher";
import {
  InMemoryCountryAppointmentRepository
} from "../../src/infrastructure/repositories/in-memory-country-appointment-repository";

describe("ProcessCountryAppointment", () => {
  const requestedAt =
    "2026-07-10T20:00:00.000Z";

  const completedAt =
    new Date("2026-07-10T20:00:05.000Z");

  it("registra una cita de Perú y publica su finalización", async () => {
    const repository =
      new InMemoryCountryAppointmentRepository();

    const publisher =
      new InMemoryAppointmentCompletionPublisher();

    const useCase =
      new ProcessCountryAppointment({
        repository,
        completionPublisher: publisher,
        expectedCountry: "PE",
        now: () => completedAt
      });

    await useCase.execute({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      requestedAt
    });

    expect(repository.appointments).toHaveLength(1);

    expect(publisher.completedEvents).toEqual([
      {
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        status: "completed",
        completedAt:
          completedAt.toISOString()
      }
    ]);
  });

  it("rechaza una cita de otro país", async () => {
    const repository =
      new InMemoryCountryAppointmentRepository();

    const publisher =
      new InMemoryAppointmentCompletionPublisher();

    const useCase =
      new ProcessCountryAppointment({
        repository,
        completionPublisher: publisher,
        expectedCountry: "PE"
      });

    await expect(
      useCase.execute({
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "CL",
        requestedAt
      })
    ).rejects.toMatchObject({
      code: "UNEXPECTED_COUNTRY"
    });

    expect(repository.appointments).toHaveLength(0);
    expect(publisher.completedEvents).toHaveLength(0);
  });

  it("no duplica el registro si el mensaje llega nuevamente", async () => {
    const repository =
      new InMemoryCountryAppointmentRepository();

    const publisher =
      new InMemoryAppointmentCompletionPublisher();

    const useCase =
      new ProcessCountryAppointment({
        repository,
        completionPublisher: publisher,
        expectedCountry: "PE"
      });

    const event = {
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE" as const,
      requestedAt
    };

    await useCase.execute(event);
    await useCase.execute(event);

    expect(repository.appointments).toHaveLength(1);
  });
});