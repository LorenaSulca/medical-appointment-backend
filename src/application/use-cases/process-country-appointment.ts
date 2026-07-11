import type {
  CountryISO
} from "../../domain/entities/appointment";
import { ApplicationError } from "../../shared/errors/application-error";
import type {
  AppointmentRequestedEvent
} from "../events/appointment-requested-event";
import type {
  AppointmentCompletionPublisher
} from "../ports/appointment-completion-publisher";
import type {
  CountryAppointmentRepository
} from "../ports/country-appointment-repository";

export interface ProcessCountryAppointmentDependencies {
  repository: CountryAppointmentRepository;
  completionPublisher: AppointmentCompletionPublisher;
  expectedCountry: CountryISO;
  now?: () => Date;
}

export class ProcessCountryAppointment {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies:
      ProcessCountryAppointmentDependencies
  ) {
    this.now =
      dependencies.now ?? (() => new Date());
  }

  async execute(
    event: AppointmentRequestedEvent
  ): Promise<void> {
    if (
      event.countryISO !==
      this.dependencies.expectedCountry
    ) {
      throw new ApplicationError(
        "UNEXPECTED_COUNTRY",
        `El procesador ${this.dependencies.expectedCountry} no puede procesar una cita de ${event.countryISO}.`,
        400
      );
    }

    await this.dependencies.repository.save(event);

    await this.dependencies.completionPublisher.publishCompleted({
      appointmentId: event.appointmentId,
      insuredId: event.insuredId,
      scheduleId: event.scheduleId,
      countryISO: event.countryISO,
      status: "completed",
      completedAt: this.now().toISOString()
    });
  }
}