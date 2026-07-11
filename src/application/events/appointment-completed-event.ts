import type {
  CountryISO
} from "../../domain/entities/appointment";

export interface AppointmentCompletedEvent {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  status: "completed";
  completedAt: string;
}