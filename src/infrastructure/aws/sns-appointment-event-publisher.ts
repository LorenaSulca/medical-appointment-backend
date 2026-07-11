import {
  PublishCommand,
  type SNSClient
} from "@aws-sdk/client-sns";

import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import type {
  AppointmentEventPublisher
} from "../../application/ports/appointment-event-publisher";

export class SNSAppointmentEventPublisher
  implements AppointmentEventPublisher
{
  constructor(
    private readonly client: SNSClient,
    private readonly topicArn: string
  ) {}

  async publishRequested(
    event: AppointmentRequestedEvent
  ): Promise<void> {
    const response = await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,

        Message: JSON.stringify({
          eventType: "AppointmentRequested",
          detail: event
        }),

        MessageAttributes: {
          countryISO: {
            DataType: "String",
            StringValue: event.countryISO
          }
        }
      })
    );

    if (!response.MessageId) {
      throw new Error(
        "SNS no devolvió el identificador del mensaje publicado."
      );
    }
  }
}