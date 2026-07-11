import type {
  AppointmentCompletedEvent
} from "../events/appointment-completed-event";

export interface AppointmentCompletionPublisher {
  publishCompleted(
    event: AppointmentCompletedEvent
  ): Promise<void>;
}