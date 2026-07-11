import type {
  APIGatewayProxyEventV2
} from "aws-lambda";

import {
  ApplicationError
} from "../errors/application-error";

export function parseJsonBody(
  event: APIGatewayProxyEventV2
): Record<string, unknown> {
  if (!event.body) {
    throw new ApplicationError(
      "MISSING_BODY",
      "La petición debe contener un cuerpo JSON.",
      400
    );
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(
          event.body,
          "base64"
        ).toString("utf8")
      : event.body;

    const parsed: unknown = JSON.parse(body);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "El cuerpo no es un objeto JSON"
      );
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new ApplicationError(
      "INVALID_JSON",
      "El cuerpo de la petición no contiene un JSON válido.",
      400
    );
  }
}