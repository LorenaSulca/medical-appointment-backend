import type {
  APIGatewayProxyStructuredResultV2
} from "aws-lambda";

import {
  ApplicationError
} from "../errors/application-error";
import {
  jsonResponse
} from "./json-response";

export function errorResponse(
  error: unknown
): APIGatewayProxyStructuredResultV2 {
  if (error instanceof ApplicationError) {
    return jsonResponse(error.statusCode, {
      code: error.code,
      message: error.message
    });
  }

  console.error("Unexpected error", error);

  return jsonResponse(500, {
    code: "INTERNAL_SERVER_ERROR",
    message:
      "Ocurrió un error inesperado al procesar la solicitud."
  });
}