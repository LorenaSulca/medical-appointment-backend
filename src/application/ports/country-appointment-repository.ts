import type {
  AppointmentRequestedEvent
} from "../events/appointment-requested-event";

export interface CountryAppointmentRepository {
  save(
    appointment: AppointmentRequestedEvent
  ): Promise<void>;
}