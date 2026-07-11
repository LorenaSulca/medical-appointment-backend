import {
  APPOINTMENT_COUNTRIES,
  type CountryISO
} from "../../domain/entities/appointment";
import { ApplicationError } from "../../shared/errors/application-error";
import type {
  CreateAppointmentInput
} from "../dto/create-appointment-input";

export interface ValidCreateAppointmentInput {
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
}

export function validateCreateAppointmentInput(
  input: CreateAppointmentInput
): ValidCreateAppointmentInput {
  if (
    typeof input.insuredId !== "string" ||
    !/^\d{5}$/.test(input.insuredId)
  ) {
    throw new ApplicationError(
      "INVALID_INSURED_ID",
      "insuredId debe contener exactamente 5 dígitos.",
      400
    );
  }

  if (
    typeof input.scheduleId !== "number" ||
    !Number.isInteger(input.scheduleId) ||
    input.scheduleId <= 0
  ) {
    throw new ApplicationError(
      "INVALID_SCHEDULE_ID",
      "scheduleId debe ser un número entero positivo.",
      400
    );
  }

  if (
    typeof input.countryISO !== "string" ||
    !APPOINTMENT_COUNTRIES.includes(
      input.countryISO as CountryISO
    )
  ) {
    throw new ApplicationError(
      "INVALID_COUNTRY_ISO",
      "countryISO solo puede ser PE o CL.",
      400
    );
  }

  return {
    insuredId: input.insuredId,
    scheduleId: input.scheduleId,
    countryISO: input.countryISO as CountryISO
  };
}