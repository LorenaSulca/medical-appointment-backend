import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
} from "aws-lambda";

import type {
  CreateAppointmentInput
} from "../../application/dto/create-appointment-input";
import type {
  AppointmentOutput
} from "../../application/dto/appointment-output";
import {
  errorResponse
} from "../../shared/http/error-response";
import {
  jsonResponse
} from "../../shared/http/json-response";
import {
  parseJsonBody
} from "../../shared/http/parse-json-body";

export interface CreateAppointmentExecutor {
  execute(
    input: CreateAppointmentInput
  ): Promise<AppointmentOutput>;
}

export type HttpHandler = (
  event: APIGatewayProxyEventV2
) => Promise<APIGatewayProxyStructuredResultV2>;

export function buildCreateAppointmentHandler(
  useCase: CreateAppointmentExecutor
): HttpHandler {
  return async (event) => {
    try {
      const body = parseJsonBody(event);

      const appointment =
        await useCase.execute({
          insuredId: body.insuredId,
          scheduleId: body.scheduleId,
          countryISO: body.countryISO
        });

      return jsonResponse(202, {
        appointmentId:
          appointment.appointmentId,
        status: appointment.status,
        message:
          "El agendamiento está siendo procesado."
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const handler: HttpHandler =
  async (event) => {
    const {
      createAppointmentUseCase
    } = await import("../../main/container");

    const runtimeHandler =
      buildCreateAppointmentHandler(
        createAppointmentUseCase
      );

    return runtimeHandler(event);
  };