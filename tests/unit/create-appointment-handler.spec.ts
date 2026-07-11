import type {
  APIGatewayProxyEventV2
} from "aws-lambda";

import {
  buildCreateAppointmentHandler
} from "../../src/interfaces/lambdas/create-appointment";

function createEvent(
  body: string | undefined
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /appointments",
    rawPath: "/appointments",
    rawQueryString: "",
    headers: {
      "content-type": "application/json"
    },
    requestContext: {
      accountId: "test",
      apiId: "test",
      domainName: "test",
      domainPrefix: "test",
      http: {
        method: "POST",
        path: "/appointments",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest"
      },
      requestId: "test",
      routeKey: "POST /appointments",
      stage: "test",
      time: "test",
      timeEpoch: 0
    },
    body,
    isBase64Encoded: false
  };
}

describe("create appointment handler", () => {
  it("responde 202 cuando registra la solicitud", async () => {
    const execute = jest.fn().mockResolvedValue({
      appointmentId: "appointment-1",
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE",
      status: "pending",
      createdAt: "2026-07-10T20:00:00.000Z",
      updatedAt: "2026-07-10T20:00:00.000Z"
    });

    const handler =
      buildCreateAppointmentHandler({
        execute
      });

    const result = await handler(
      createEvent(
        JSON.stringify({
          insuredId: "00125",
          scheduleId: 100,
          countryISO: "PE"
        })
      )
    );

    expect(result).toMatchObject({
      statusCode: 202
    });

    expect(execute).toHaveBeenCalledWith({
      insuredId: "00125",
      scheduleId: 100,
      countryISO: "PE"
    });
  });

  it("responde 400 cuando el JSON es inválido", async () => {
    const execute = jest.fn();

    const handler =
      buildCreateAppointmentHandler({
        execute
      });

    const result = await handler(
      createEvent("{json-invalido")
    );

    expect(result).toMatchObject({
      statusCode: 400
    });

    expect(execute).not.toHaveBeenCalled();
  });
});