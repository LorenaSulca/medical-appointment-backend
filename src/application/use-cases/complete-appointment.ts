import type {
  AppointmentRepository
} from "../../domain/repositories/appointment-repository";
import {
  ApplicationError
} from "../../shared/errors/application-error";
import type {
  AppointmentCompletedEvent
} from "../events/appointment-completed-event";

export interface CompleteAppointmentDependencies {
  appointmentRepository: AppointmentRepository;
  now?: () => Date;
}

export class CompleteAppointment {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies:
      CompleteAppointmentDependencies
  ) {
    this.now =
      dependencies.now ?? (() => new Date());
  }

  async execute(
    event: AppointmentCompletedEvent
  ): Promise<void> {
    const appointment =
      await this.dependencies
        .appointmentRepository
        .findByAppointmentId(
          event.appointmentId
        );

    if (!appointment) {
      throw new ApplicationError(
        "APPOINTMENT_NOT_FOUND",
        `No existe el agendamiento ${event.appointmentId}.`,
        404
      );
    }

    if (
      appointment.insuredId !== event.insuredId ||
      appointment.scheduleId !== event.scheduleId ||
      appointment.countryISO !== event.countryISO
    ) {
      throw new ApplicationError(
        "APPOINTMENT_EVENT_MISMATCH",
        "El evento no coincide con el agendamiento almacenado.",
        409
      );
    }

    // Un evento duplicado se considera procesado.
    if (appointment.status === "completed") {
      return;
    }

    const completedAppointment =
      appointment.complete(
        this.now().toISOString()
      );

    await this.dependencies
      .appointmentRepository
      .update(completedAppointment);
  }
}