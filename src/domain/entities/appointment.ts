export const APPOINTMENT_COUNTRIES = ["PE", "CL"] as const;

export type CountryISO = (typeof APPOINTMENT_COUNTRIES)[number];

export const APPOINTMENT_STATUSES = [
  "pending",
  "completed"
] as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUSES)[number];

export interface AppointmentProperties {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export class Appointment {
  private constructor(
    private readonly properties: AppointmentProperties
  ) {}

  static create(properties: AppointmentProperties): Appointment {
    return new Appointment({ ...properties });
  }

  get appointmentId(): string {
    return this.properties.appointmentId;
  }

  get insuredId(): string {
    return this.properties.insuredId;
  }

  get scheduleId(): number {
    return this.properties.scheduleId;
  }

  get countryISO(): CountryISO {
    return this.properties.countryISO;
  }

  get status(): AppointmentStatus {
    return this.properties.status;
  }

  get createdAt(): string {
    return this.properties.createdAt;
  }

  get updatedAt(): string {
    return this.properties.updatedAt;
  }

  complete(updatedAt: string): Appointment {
    return Appointment.create({
      ...this.properties,
      status: "completed",
      updatedAt
    });
  }

  toPrimitives(): AppointmentProperties {
    return { ...this.properties };
  }
}