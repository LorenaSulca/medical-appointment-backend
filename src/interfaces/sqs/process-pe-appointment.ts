import type {
  SQSEvent,
  SQSBatchResponse
} from "aws-lambda";

import {
  buildProcessCountryAppointmentHandler
} from "./process-country-appointment";

export async function handler(
  event: SQSEvent
): Promise<SQSBatchResponse> {
  const {
    getCountryProcessor
  } = await import(
    "../../main/country-container"
  );

  const useCase =
    getCountryProcessor("PE");

  const runtimeHandler =
    buildProcessCountryAppointmentHandler(
      useCase
    );

  return runtimeHandler(event);
}