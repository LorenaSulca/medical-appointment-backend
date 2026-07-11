import type {
  SQSBatchResponse,
  SQSEvent
} from "aws-lambda";

import type {
  AppointmentCompletedEvent
} from "../../application/events/appointment-completed-event";
import {
  parseEventBridgeCompletionMessage
} from "../../shared/aws/parse-eventbridge-sqs-message";

export interface CompleteAppointmentExecutor {
  execute(
    event: AppointmentCompletedEvent
  ): Promise<void>;
}

export type CompleteAppointmentHandler = (
  event: SQSEvent
) => Promise<SQSBatchResponse>;

export function buildCompleteAppointmentHandler(
  useCase: CompleteAppointmentExecutor
): CompleteAppointmentHandler {
  return async (event) => {
    const batchItemFailures:
      SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        const completedEvent =
          parseEventBridgeCompletionMessage(
            record.body
          );

        await useCase.execute(
          completedEvent
        );
      } catch (error) {
        console.error(
          "No se pudo completar el agendamiento",
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

export async function handler(
  event: SQSEvent
): Promise<SQSBatchResponse> {
  const {
    completeAppointmentUseCase
  } = await import(
    "../../main/container"
  );

  const runtimeHandler =
    buildCompleteAppointmentHandler(
      completeAppointmentUseCase
    );

  return runtimeHandler(event);
}