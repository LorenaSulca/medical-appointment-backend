import type {
  SQSBatchResponse,
  SQSEvent
} from "aws-lambda";

import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import {
  parseSNSAppointmentMessage
} from "../../shared/aws/parse-sns-sqs-message";

export interface CountryAppointmentExecutor {
  execute(
    event: AppointmentRequestedEvent
  ): Promise<void>;
}

export type SQSAppointmentHandler = (
  event: SQSEvent
) => Promise<SQSBatchResponse>;

export function buildProcessCountryAppointmentHandler(
  useCase: CountryAppointmentExecutor
): SQSAppointmentHandler {
  return async (event) => {
    const batchItemFailures:
      SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        const appointment =
          parseSNSAppointmentMessage(
            record.body
          );

        await useCase.execute(appointment);
      } catch (error) {
        console.error(
          "No se pudo procesar el mensaje SQS",
          {
            messageId: record.messageId,
            error
          }
        );

        batchItemFailures.push({
          itemIdentifier: record.messageId
        });
      }
    }

    return {
      batchItemFailures
    };
  };
}