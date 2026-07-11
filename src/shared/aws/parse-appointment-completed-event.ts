import type {
  AppointmentCompletedEvent
} from "../../application/events/appointment-completed-event";
import {
  APPOINTMENT_COUNTRIES,
  type CountryISO
} from "../../domain/entities/appointment";
import {
  ApplicationError
} from "../errors/application-error";

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

export function parseAppointmentCompletedEvent(
  value: unknown
): AppointmentCompletedEvent {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw invalidEvent(
      "El evento de finalización no es válido."
    );
  }

  const event =
    value as Record<string, unknown>;

  if (
    typeof event.appointmentId !== "string" ||
    event.appointmentId.length === 0
  ) {
    throw invalidEvent(
      "appointmentId no es válido."
    );
  }

  if (
    typeof event.insuredId !== "string" ||
    !/^\d{5}$/.test(event.insuredId)
  ) {
    throw invalidEvent(
      "insuredId no es válido."
    );
  }

  if (
    typeof event.scheduleId !== "number" ||
    !Number.isInteger(event.scheduleId) ||
    event.scheduleId <= 0
  ) {
    throw invalidEvent(
      "scheduleId no es válido."
    );
  }

  if (!isCountryISO(event.countryISO)) {
    throw invalidEvent(
      "countryISO no es válido."
    );
  }

  if (event.status !== "completed") {
    throw invalidEvent(
      "status debe ser completed."
    );
  }

  if (
    typeof event.completedAt !== "string" ||
    Number.isNaN(
      Date.parse(event.completedAt)
    )
  ) {
    throw invalidEvent(
      "completedAt no es válido."
    );
  }

  return {
    appointmentId: event.appointmentId,
    insuredId: event.insuredId,
    scheduleId: event.scheduleId,
    countryISO: event.countryISO,
    status: "completed",
    completedAt: event.completedAt
  };
}

function invalidEvent(
  message: string
): ApplicationError {
  return new ApplicationError(
    "INVALID_COMPLETION_EVENT",
    message,
    400
  );
}