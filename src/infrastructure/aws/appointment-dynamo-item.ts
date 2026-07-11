import type {
  AppointmentProperties,
  AppointmentStatus,
  CountryISO
} from "../../domain/entities/appointment";

export interface AppointmentDynamoItem {
  PK: string;
  SK: string;

  GSI1PK: string;
  GSI1SK: string;

  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export function appointmentToDynamoItem(
  appointment: AppointmentProperties
): AppointmentDynamoItem {
  return {
    PK: `INSURED#${appointment.insuredId}`,
    SK:
      `APPOINTMENT#${appointment.createdAt}` +
      `#${appointment.appointmentId}`,

    GSI1PK: `APPOINTMENT#${appointment.appointmentId}`,
    GSI1SK: `INSURED#${appointment.insuredId}`,

    ...appointment
  };
}