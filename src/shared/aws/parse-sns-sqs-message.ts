import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import { ApplicationError } from "../errors/application-error";
import {
  parseAppointmentRequestedEvent
} from "./parse-appointment-requested-event";

interface SNSNotification {
  Type?: unknown;
  Message?: unknown;
}

interface AppointmentMessage {
  eventType?: unknown;
  detail?: unknown;
}

export function parseSNSAppointmentMessage(
  sqsBody: string
): AppointmentRequestedEvent {
  let notification: SNSNotification;

  try {
    notification =
      JSON.parse(sqsBody) as SNSNotification;
  } catch {
    throw new ApplicationError(
      "INVALID_SQS_MESSAGE",
      "El mensaje SQS no contiene JSON válido.",
      400
    );
  }

  if (
    notification.Type !== "Notification" ||
    typeof notification.Message !== "string"
  ) {
    throw new ApplicationError(
      "INVALID_SNS_NOTIFICATION",
      "El mensaje no contiene una notificación SNS válida.",
      400
    );
  }

  let message: AppointmentMessage;

  try {
    message =
      JSON.parse(
        notification.Message
      ) as AppointmentMessage;
  } catch {
    throw new ApplicationError(
      "INVALID_SNS_MESSAGE",
      "El contenido del mensaje SNS no es JSON válido.",
      400
    );
  }

  if (
    message.eventType !==
    "AppointmentRequested"
  ) {
    throw new ApplicationError(
      "UNEXPECTED_EVENT_TYPE",
      "El tipo de evento recibido no es compatible.",
      400
    );
  }

  return parseAppointmentRequestedEvent(
    message.detail
  );
}