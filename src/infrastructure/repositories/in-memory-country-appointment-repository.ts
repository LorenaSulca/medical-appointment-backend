import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import type {
  CountryAppointmentRepository
} from "../../application/ports/country-appointment-repository";

export class InMemoryCountryAppointmentRepository
  implements CountryAppointmentRepository
{
  public readonly appointments:
    AppointmentRequestedEvent[] = [];

  async save(
    appointment: AppointmentRequestedEvent
  ): Promise<void> {
    const alreadyExists =
      this.appointments.some(
        (stored) =>
          stored.appointmentId ===
          appointment.appointmentId
      );

    if (!alreadyExists) {
      this.appointments.push({
        ...appointment
      });
    }
  }
}