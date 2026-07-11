import type {
  AppointmentRequestedEvent
} from "../events/appointment-requested-event";

export interface AppointmentEventPublisher {
  publishRequested(
    event: AppointmentRequestedEvent
  ): Promise<void>;
}
