import {
  CreateAppointment
} from "../../src/application/use-cases/create-appointment";
import {
  InMemoryAppointmentEventPublisher
} from "../../src/infrastructure/messaging/in-memory-appointment-event-publisher";
import {
  InMemoryAppointmentRepository
} from "../../src/infrastructure/repositories/in-memory-appointment-repository";

describe("CreateAppointment", () => {
  const fixedDate =
    new Date("2026-07-10T20:00:00.000Z");

  const appointmentId =
    "11111111-2222-4333-8444-555555555555";

  let repository:
    InMemoryAppointmentRepository;

  let eventPublisher:
    InMemoryAppointmentEventPublisher;

  let useCase: CreateAppointment;

  beforeEach(() => {
    repository =
      new InMemoryAppointmentRepository();

    eventPublisher =
      new InMemoryAppointmentEventPublisher();

    useCase = new CreateAppointment({
      appointmentRepository: repository,
      eventPublisher,
      generateId: () => appointmentId,
      now: () => fixedDate
    });
  });

  it("registra una solicitud con estado pending", async () => {
    const result = await useCase.execute({
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE"
    });

    expect(result).toEqual({
      appointmentId,
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      status: "pending",
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString()
    });

    const persisted =
      await repository.findByAppointmentId(
        appointmentId
      );

    expect(persisted?.status).toBe("pending");
  });

  it("publica un evento de solicitud", async () => {
    await useCase.execute({
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE"
    });

    expect(
      eventPublisher.requestedEvents
    ).toEqual([
      {
        appointmentId,
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        requestedAt: fixedDate.toISOString()
      }
    ]);
  });

  it("conserva los ceros iniciales del asegurado", async () => {
    const result = await useCase.execute({
      insuredId: "00001",
      scheduleId: 25,
      countryISO: "CL"
    });

    expect(result.insuredId).toBe("00001");
  });

  it.each([
    "",
    "1234",
    "123456",
    "12A45",
    12345,
    null
  ])(
    "rechaza insuredId inválido: %p",
    async (insuredId) => {
      await expect(
        useCase.execute({
          insuredId,
          scheduleId: 100,
          countryISO: "PE"
        })
      ).rejects.toMatchObject({
        code: "INVALID_INSURED_ID",
        statusCode: 400
      });
    }
  );

  it.each([
    0,
    -1,
    1.5,
    "100",
    null
  ])(
    "rechaza scheduleId inválido: %p",
    async (scheduleId) => {
      await expect(
        useCase.execute({
          insuredId: "00125",
          scheduleId,
          countryISO: "PE"
        })
      ).rejects.toMatchObject({
        code: "INVALID_SCHEDULE_ID",
        statusCode: 400
      });
    }
  );

  it.each([
    "",
    "AR",
    "pe",
    123,
    null
  ])(
    "rechaza countryISO inválido: %p",
    async (countryISO) => {
      await expect(
        useCase.execute({
          insuredId: "00125",
          scheduleId: 100,
          countryISO
        })
      ).rejects.toMatchObject({
        code: "INVALID_COUNTRY_ISO",
        statusCode: 400
      });
    }
  );
});