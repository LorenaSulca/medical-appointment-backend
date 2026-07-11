import type {
  Appointment
} from "../entities/appointment";

export interface AppointmentRepository {
  save(appointment: Appointment): Promise<void>;

  findByInsuredId(
    insuredId: string
  ): Promise<Appointment[]>;

  findByAppointmentId(
    appointmentId: string
  ): Promise<Appointment | null>;

  update(appointment: Appointment): Promise<void>;
}