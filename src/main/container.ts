import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
  SNSClient
} from "@aws-sdk/client-sns";
import {
  DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";

import {
  CreateAppointment
} from "../application/use-cases/create-appointment";
import {
  ListAppointmentsByInsured
} from "../application/use-cases/list-appointments-by-insured";
import {
  DynamoDBAppointmentRepository
} from "../infrastructure/aws/dynamodb-appointment-repository";
import {
  SNSAppointmentEventPublisher
} from "../infrastructure/aws/sns-appointment-event-publisher";
import {
  CompleteAppointment
} from "../application/use-cases/complete-appointment";

function requiredEnvironmentVariable(
  name: string
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}.`
    );
  }

  return value;
}

const documentClient =
  DynamoDBDocumentClient.from(
    new DynamoDBClient({})
  );

const snsClient = new SNSClient({});

const appointmentRepository =
  new DynamoDBAppointmentRepository(
    documentClient,
    {
      tableName:
        requiredEnvironmentVariable(
          "APPOINTMENTS_TABLE"
        ),
      appointmentIdIndexName:
        requiredEnvironmentVariable(
          "APPOINTMENTS_BY_ID_INDEX"
        )
    }
  );

const eventPublisher =
  new SNSAppointmentEventPublisher(
    snsClient,
    requiredEnvironmentVariable(
      "APPOINTMENT_TOPIC_ARN"
    )
  );

export const createAppointmentUseCase =
  new CreateAppointment({
    appointmentRepository,
    eventPublisher
  });

export const listAppointmentsByInsuredUseCase =
  new ListAppointmentsByInsured(
    appointmentRepository
  );
export const completeAppointmentUseCase =
    new CompleteAppointment({
        appointmentRepository
});