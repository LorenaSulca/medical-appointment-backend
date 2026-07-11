import type {
  DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";

import {
  Appointment
} from "../../src/domain/entities/appointment";
import {
  DynamoDBAppointmentRepository
} from "../../src/infrastructure/aws/dynamodb-appointment-repository";

describe("DynamoDBAppointmentRepository", () => {
  it("actualiza pending a completed con una operación condicional", async () => {
    const send =
      jest.fn().mockResolvedValue({});

    const client = {
      send
    } as unknown as DynamoDBDocumentClient;

    const repository =
      new DynamoDBAppointmentRepository(
        client,
        {
          tableName: "appointments-test",
          appointmentIdIndexName: "GSI1"
        }
      );

    const appointment =
      Appointment.create({
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        status: "completed",
        createdAt:
          "2026-07-10T20:00:00.000Z",
        updatedAt:
          "2026-07-10T20:00:05.000Z"
      });

    await repository.update(
      appointment
    );

    expect(send).toHaveBeenCalledTimes(1);

    const command =
      send.mock.calls[0][0];

    expect(command.input).toEqual(
      expect.objectContaining({
        TableName: "appointments-test",

        Key: {
          PK: "INSURED#00125",
          SK:
            "APPOINTMENT#" +
            "2026-07-10T20:00:00.000Z#" +
            "appointment-1"
        },

        ConditionExpression:
          "attribute_exists(PK) " +
          "AND attribute_exists(SK) " +
          "AND #status = :pending",

        ExpressionAttributeValues: {
          ":pending": "pending",
          ":completed": "completed",
          ":updatedAt":
            "2026-07-10T20:00:05.000Z"
        }
      })
    );
  });
});