import type {
  SQSEvent,
  SQSRecord
} from "aws-lambda";

import {
  buildCompleteAppointmentHandler
} from "../../src/interfaces/sqs/complete-appointment";

function createRecord(
  messageId: string,
  detail: unknown
): SQSRecord {
  return {
    messageId,
    receiptHandle: "receipt",
    body: JSON.stringify({
      version: "0",
      id: "event-1",
      "detail-type":
        "AppointmentCompleted",
      source:
        "medical-appointment.country-processor",
      account: "000000000000",
      time:
        "2026-07-10T20:00:05.000Z",
      region: "us-east-1",
      resources: [],
      detail
    }),
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "0",
      SenderId: "test",
      ApproximateFirstReceiveTimestamp: "0"
    },
    messageAttributes: {},
    md5OfBody: "test",
    eventSource: "aws:sqs",
    eventSourceARN:
      "arn:aws:sqs:us-east-1:000000000000:completion",
    awsRegion: "us-east-1"
  };
}

describe("complete appointment handler", () => {
  const validDetail = {
    appointmentId: "appointment-1",
    insuredId: "00125",
    scheduleId: 100,
    countryISO: "PE",
    status: "completed",
    completedAt:
      "2026-07-10T20:00:05.000Z"
  };

  it("procesa un evento de finalización", async () => {
    const execute =
      jest.fn().mockResolvedValue(undefined);

    const handler =
      buildCompleteAppointmentHandler({
        execute
      });

    const event: SQSEvent = {
      Records: [
        createRecord(
          "message-1",
          validDetail
        )
      ]
    };

    const result = await handler(event);

    expect(result).toEqual({
      batchItemFailures: []
    });

    expect(execute).toHaveBeenCalledWith(
      validDetail
    );
  });

  it("reporta solamente el registro inválido", async () => {
    const execute =
      jest.fn().mockResolvedValue(undefined);

    const validRecord =
      createRecord(
        "message-valid",
        validDetail
      );

    const invalidRecord: SQSRecord = {
      ...validRecord,
      messageId: "message-invalid",
      body: "{json-invalido"
    };

    const handler =
      buildCompleteAppointmentHandler({
        execute
      });

    const result = await handler({
      Records: [
        validRecord,
        invalidRecord
      ]
    });

    expect(result).toEqual({
      batchItemFailures: [
        {
          itemIdentifier:
            "message-invalid"
        }
      ]
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});