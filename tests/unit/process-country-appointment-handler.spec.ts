import type {
  SQSEvent,
  SQSRecord
} from "aws-lambda";

import {
  buildProcessCountryAppointmentHandler
} from "../../src/interfaces/sqs/process-country-appointment";

function createRecord(
  messageId: string,
  detail: unknown
): SQSRecord {
  return {
    messageId,
    receiptHandle: "receipt",
    body: JSON.stringify({
      Type: "Notification",
      Message: JSON.stringify({
        eventType: "AppointmentRequested",
        detail
      })
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
      "arn:aws:sqs:us-east-1:000000000000:test",
    awsRegion: "us-east-1"
  };
}

describe("process country appointment handler", () => {
  it("procesa correctamente un mensaje SNS recibido por SQS", async () => {
    const execute =
      jest.fn().mockResolvedValue(undefined);

    const handler =
      buildProcessCountryAppointmentHandler({
        execute
      });

    const event: SQSEvent = {
      Records: [
        createRecord("message-1", {
          appointmentId: "appointment-1",
          insuredId: "00125",
          scheduleId: 100,
          countryISO: "PE",
          requestedAt:
            "2026-07-10T20:00:00.000Z"
        })
      ]
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toEqual([]);

    expect(execute).toHaveBeenCalledWith({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      requestedAt:
        "2026-07-10T20:00:00.000Z"
    });
  });

  it("reporta únicamente el mensaje que falla", async () => {
    const execute =
      jest.fn().mockResolvedValue(undefined);

    const handler =
      buildProcessCountryAppointmentHandler({
        execute
      });

    const validRecord = createRecord(
      "message-valid",
      {
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        requestedAt:
          "2026-07-10T20:00:00.000Z"
      }
    );

    const invalidRecord: SQSRecord = {
      ...validRecord,
      messageId: "message-invalid",
      body: "{json-invalido"
    };

    const result = await handler({
      Records: [
        validRecord,
        invalidRecord
      ]
    });

    expect(result.batchItemFailures).toEqual([
      {
        itemIdentifier: "message-invalid"
      }
    ]);

    expect(execute).toHaveBeenCalledTimes(1);
  });
});