import type {
  EventBridgeClient
} from "@aws-sdk/client-eventbridge";

import {
  EventBridgeAppointmentCompletionPublisher
} from "../../src/infrastructure/aws/eventbridge-appointment-completion-publisher";

describe(
  "EventBridgeAppointmentCompletionPublisher",
  () => {
    it("publica AppointmentCompleted", async () => {
      const send =
        jest.fn().mockResolvedValue({
          FailedEntryCount: 0,
          Entries: [
            {
              EventId: "event-1"
            }
          ]
        });

      const client = {
        send
      } as unknown as EventBridgeClient;

      const publisher =
        new EventBridgeAppointmentCompletionPublisher(
          client,
          "medical-appointment-dev"
        );

      await publisher.publishCompleted({
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        status: "completed",
        completedAt:
          "2026-07-10T20:00:05.000Z"
      });

      expect(send).toHaveBeenCalledTimes(1);

      const command =
        send.mock.calls[0][0];

      expect(
        command.input.Entries
      ).toEqual([
        expect.objectContaining({
          EventBusName:
            "medical-appointment-dev",
          Source:
            "medical-appointment.country-processor",
          DetailType:
            "AppointmentCompleted"
        })
      ]);

      expect(
        JSON.parse(
          command.input.Entries[0].Detail
        )
      ).toEqual({
        appointmentId: "appointment-1",
        insuredId: "00125",
        scheduleId: 100,
        countryISO: "PE",
        status: "completed",
        completedAt:
          "2026-07-10T20:00:05.000Z"
      });
    });

    it("lanza un error si EventBridge rechaza la entrada", async () => {
      const send =
        jest.fn().mockResolvedValue({
          FailedEntryCount: 1,
          Entries: [
            {
              ErrorCode:
                "InternalFailure",
              ErrorMessage:
                "No se pudo publicar"
            }
          ]
        });

      const client = {
        send
      } as unknown as EventBridgeClient;

      const publisher =
        new EventBridgeAppointmentCompletionPublisher(
          client,
          "medical-appointment-dev"
        );

      await expect(
        publisher.publishCompleted({
          appointmentId: "appointment-1",
          insuredId: "00125",
          scheduleId: 100,
          countryISO: "PE",
          status: "completed",
          completedAt:
            "2026-07-10T20:00:05.000Z"
        })
      ).rejects.toThrow(
        "EventBridge no pudo publicar"
      );
    });
  }
);