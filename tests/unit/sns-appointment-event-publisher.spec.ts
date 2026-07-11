import type {
  SNSClient
} from "@aws-sdk/client-sns";

import {
  SNSAppointmentEventPublisher
} from "../../src/infrastructure/aws/sns-appointment-event-publisher";

describe("SNSAppointmentEventPublisher", () => {
  it("publica el evento con countryISO como atributo SNS", async () => {
    const send = jest.fn().mockResolvedValue({
      MessageId: "message-1"
    });

    const client = {
      send
    } as unknown as SNSClient;

    const publisher =
      new SNSAppointmentEventPublisher(
        client,
        "arn:aws:sns:us-east-1:123456789012:appointment-topic"
      );

    await publisher.publishRequested({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      requestedAt:
        "2026-07-10T20:00:00.000Z"
    });

    expect(send).toHaveBeenCalledTimes(1);

    const command = send.mock.calls[0][0];

    expect(command.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:appointment-topic"
    );

    expect(
      command.input.MessageAttributes
    ).toEqual({
      countryISO: {
        DataType: "String",
        StringValue: "PE"
      }
    });

    expect(
      JSON.parse(command.input.Message)
    ).toEqual({
      eventType: "AppointmentRequested",
      detail: {
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        requestedAt:
          "2026-07-10T20:00:00.000Z"
      }
    });
  });
});

it("lanza un error si SNS no confirma la publicación", async () => {
  const send = jest.fn().mockResolvedValue({});

  const client = {
    send
  } as unknown as SNSClient;

  const publisher =
    new SNSAppointmentEventPublisher(
      client,
      "arn:aws:sns:us-east-1:123456789012:appointment-topic"
    );

  await expect(
    publisher.publishRequested({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "CL",
      requestedAt:
        "2026-07-10T20:00:00.000Z"
    })
  ).rejects.toThrow(
    "SNS no devolvió el identificador"
  );
});