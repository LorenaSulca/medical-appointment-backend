import type {
  Appointment
} from "../../domain/entities/appointment";
import type {
  AppointmentRepository
} from "../../domain/repositories/appointment-repository";

export class InMemoryAppointmentRepository
  implements AppointmentRepository
{
  private readonly appointments =
    new Map<string, Appointment>();

  async save(
    appointment: Appointment
  ): Promise<void> {
    this.appointments.set(
      appointment.appointmentId,
      appointment
    );
  }

  async findByInsuredId(
    insuredId: string
  ): Promise<Appointment[]> {
    return Array.from(
      this.appointments.values()
    )
      .filter(
        (appointment) =>
          appointment.insuredId === insuredId
      )
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(
            left.createdAt
          )
      );
  }

  async findByAppointmentId(
    appointmentId: string
  ): Promise<Appointment | null> {
    return (
      this.appointments.get(appointmentId) ??
      null
    );
  }

  async update(
    appointment: Appointment
  ): Promise<void> {
    this.appointments.set(
      appointment.appointmentId,
      appointment
    );
  }

  clear(): void {
    this.appointments.clear();
  }
}