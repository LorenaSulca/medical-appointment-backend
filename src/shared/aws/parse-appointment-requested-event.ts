import {
  APPOINTMENT_COUNTRIES,
  type CountryISO
} from "../../domain/entities/appointment";
import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import { ApplicationError } from "../errors/application-error";

function isCountryISO(
  value: unknown
): value is CountryISO {
  return (
    typeof value === "string" &&
    APPOINTMENT_COUNTRIES.includes(
      value as CountryISO
    )
  );
}

export function parseAppointmentRequestedEvent(
  value: unknown
): AppointmentRequestedEvent {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "El evento de agendamiento no es válido.",
      400
    );
  }

  const event =
    value as Record<string, unknown>;

  if (
    typeof event.appointmentId !== "string" ||
    event.appointmentId.length === 0
  ) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "appointmentId no es válido.",
      400
    );
  }

  if (
    typeof event.insuredId !== "string" ||
    !/^\d{5}$/.test(event.insuredId)
  ) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "insuredId no es válido.",
      400
    );
  }

  if (
    typeof event.scheduleId !== "number" ||
    !Number.isInteger(event.scheduleId) ||
    event.scheduleId <= 0
  ) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "scheduleId no es válido.",
      400
    );
  }

  if (!isCountryISO(event.countryISO)) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "countryISO no es válido.",
      400
    );
  }

  if (
    typeof event.requestedAt !== "string" ||
    Number.isNaN(Date.parse(event.requestedAt))
  ) {
    throw new ApplicationError(
      "INVALID_APPOINTMENT_EVENT",
      "requestedAt no es válido.",
      400
    );
  }

  return {
    appointmentId: event.appointmentId,
    insuredId: event.insuredId,
    scheduleId: event.scheduleId,
    countryISO: event.countryISO,
    requestedAt: event.requestedAt
  };
}