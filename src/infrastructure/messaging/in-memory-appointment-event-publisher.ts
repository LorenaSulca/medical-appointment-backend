import type {
  AppointmentRequestedEvent
} from "../../application/events/appointment-requested-event";
import type {
  AppointmentEventPublisher
} from "../../application/ports/appointment-event-publisher";


export class InMemoryAppointmentEventPublisher
  implements AppointmentEventPublisher
{
  public readonly requestedEvents:
    AppointmentRequestedEvent[] = [];

  async publishRequested(
    event: AppointmentRequestedEvent
  ): Promise<void> {
    this.requestedEvents.push({ ...event });
  }

  clear(): void {
    this.requestedEvents.length = 0;
  }
}