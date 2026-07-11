import type {
  AppointmentCompletedEvent
} from "../../application/events/appointment-completed-event";
import type {
  AppointmentCompletionPublisher
} from "../../application/ports/appointment-completion-publisher";

export class InMemoryAppointmentCompletionPublisher
  implements AppointmentCompletionPublisher
{
  public readonly completedEvents:
    AppointmentCompletedEvent[] = [];

  async publishCompleted(
    event: AppointmentCompletedEvent
  ): Promise<void> {
    this.completedEvents.push({
      ...event
    });
  }
}