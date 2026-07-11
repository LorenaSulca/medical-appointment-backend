import type {
  CountryISO
} from "../../domain/entities/appointment";

export interface AppointmentRequestedEvent {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  requestedAt: string;
}