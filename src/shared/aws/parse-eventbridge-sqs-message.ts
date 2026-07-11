import type {
  AppointmentCompletedEvent
} from "../../application/events/appointment-completed-event";
import {
  ApplicationError
} from "../errors/application-error";
import {
  parseAppointmentCompletedEvent
} from "./parse-appointment-completed-event";

interface EventBridgeEnvelope {
  source?: unknown;
  "detail-type"?: unknown;
  detail?: unknown;
}

export function parseEventBridgeCompletionMessage(
  sqsBody: string
): AppointmentCompletedEvent {
  let envelope: EventBridgeEnvelope;

  try {
    envelope =
      JSON.parse(
        sqsBody
      ) as EventBridgeEnvelope;
  } catch {
    throw new ApplicationError(
      "INVALID_SQS_MESSAGE",
      "El mensaje SQS no contiene JSON válido.",
      400
    );
  }

  if (
    envelope.source !==
    "medical-appointment.country-processor"
  ) {
    throw new ApplicationError(
      "UNEXPECTED_EVENT_SOURCE",
      "El origen del evento no es compatible.",
      400
    );
  }

  if (
    envelope["detail-type"] !==
    "AppointmentCompleted"
  ) {
    throw new ApplicationError(
      "UNEXPECTED_EVENT_TYPE",
      "El tipo de evento no es compatible.",
      400
    );
  }

  return parseAppointmentCompletedEvent(
    envelope.detail
  );
}