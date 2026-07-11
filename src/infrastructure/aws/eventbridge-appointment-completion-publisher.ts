import {
  PutEventsCommand,
  type EventBridgeClient
} from "@aws-sdk/client-eventbridge";

import type {
  AppointmentCompletedEvent
} from "../../application/events/appointment-completed-event";
import type {
  AppointmentCompletionPublisher
} from "../../application/ports/appointment-completion-publisher";

export class EventBridgeAppointmentCompletionPublisher
  implements AppointmentCompletionPublisher
{
  constructor(
    private readonly client: EventBridgeClient,
    private readonly eventBusName: string
  ) {}

  async publishCompleted(
    event: AppointmentCompletedEvent
  ): Promise<void> {
    const response = await this.client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.eventBusName,
            Source:
              "medical-appointment.country-processor",
            DetailType:
              "AppointmentCompleted",
            Time: new Date(event.completedAt),
            Detail: JSON.stringify(event)
          }
        ]
      })
    );

    const failedEntry =
      response.Entries?.find(
        (entry) =>
          entry.ErrorCode ||
          entry.ErrorMessage
      );

    if (
      response.FailedEntryCount &&
      response.FailedEntryCount > 0
    ) {
      throw new Error(
        [
          "EventBridge no pudo publicar AppointmentCompleted.",
          failedEntry?.ErrorCode,
          failedEntry?.ErrorMessage
        ]
          .filter(Boolean)
          .join(" ")
      );
    }

    if (!response.Entries?.[0]?.EventId) {
      throw new Error(
        "EventBridge no devolvió el identificador del evento publicado."
      );
    }
  }
}