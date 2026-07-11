import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
} from "aws-lambda";

import type {
  AppointmentOutput
} from "../../application/dto/appointment-output";
import {
  ApplicationError
} from "../../shared/errors/application-error";
import {
  errorResponse
} from "../../shared/http/error-response";
import {
  jsonResponse
} from "../../shared/http/json-response";

export interface ListAppointmentsExecutor {
  execute(
    insuredId: string
  ): Promise<AppointmentOutput[]>;
}

export type HttpHandler = (
  event: APIGatewayProxyEventV2
) => Promise<APIGatewayProxyStructuredResultV2>;

export function buildListAppointmentsHandler(
  useCase: ListAppointmentsExecutor
): HttpHandler {
  return async (event) => {
    try {
      const insuredId =
        event.pathParameters?.insuredId;

      if (!insuredId) {
        throw new ApplicationError(
          "MISSING_INSURED_ID",
          "insuredId es obligatorio.",
          400
        );
      }

      const appointments =
        await useCase.execute(insuredId);

      return jsonResponse(200, {
        insuredId,
        appointments
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const handler: HttpHandler =
  async (event) => {
    const {
      listAppointmentsByInsuredUseCase
    } = await import("../../main/container");

    const runtimeHandler =
      buildListAppointmentsHandler(
        listAppointmentsByInsuredUseCase
      );

    return runtimeHandler(event);
  };