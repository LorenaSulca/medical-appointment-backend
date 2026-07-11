import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";

import {
  Appointment
} from "../../domain/entities/appointment";
import type {
  AppointmentRepository
} from "../../domain/repositories/appointment-repository";
import {
  appointmentToDynamoItem,
  type AppointmentDynamoItem
} from "./appointment-dynamo-item";

export interface DynamoDBAppointmentRepositoryConfig {
  tableName: string;
  appointmentIdIndexName: string;
}

export class DynamoDBAppointmentRepository
  implements AppointmentRepository
{
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly config:
      DynamoDBAppointmentRepositoryConfig
  ) {}

  async save(
    appointment: Appointment
  ): Promise<void> {
    const item = appointmentToDynamoItem(
      appointment.toPrimitives()
    );

    await this.client.send(
      new PutCommand({
        TableName: this.config.tableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)"
      })
    );
  }

  async findByInsuredId(
    insuredId: string
  ): Promise<Appointment[]> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.config.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `INSURED#${insuredId}`
        },
        ScanIndexForward: false
      })
    );

    return (response.Items ?? []).map((item) =>
      this.toDomain(item as AppointmentDynamoItem)
    );
  }

  async findByAppointmentId(
    appointmentId: string
  ): Promise<Appointment | null> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.config.tableName,
        IndexName:
          this.config.appointmentIdIndexName,
        KeyConditionExpression: "GSI1PK = :appointment",
        ExpressionAttributeValues: {
          ":appointment":
            `APPOINTMENT#${appointmentId}`
        },
        Limit: 1
      })
    );

    const item = response.Items?.[0];

    if (!item) {
      return null;
    }

    return this.toDomain(
      item as AppointmentDynamoItem
    );
  }

async update(
  appointment: Appointment
): Promise<void> {
  const item = appointmentToDynamoItem(
    appointment.toPrimitives()
  );

  await this.client.send(
    new UpdateCommand({
      TableName: this.config.tableName,

      Key: {
        PK: item.PK,
        SK: item.SK
      },

      UpdateExpression:
        "SET #status = :completed, " +
        "updatedAt = :updatedAt",

      ConditionExpression:
        "attribute_exists(PK) " +
        "AND attribute_exists(SK) " +
        "AND #status = :pending",

      ExpressionAttributeNames: {
        "#status": "status"
      },

      ExpressionAttributeValues: {
        ":pending": "pending",
        ":completed": "completed",
        ":updatedAt": appointment.updatedAt
      }
    })
  );
}

  private toDomain(
    item: AppointmentDynamoItem
  ): Appointment {
    return Appointment.create({
      appointmentId: item.appointmentId,
      insuredId: item.insuredId,
      scheduleId: item.scheduleId,
      countryISO: item.countryISO,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    });
  }
}