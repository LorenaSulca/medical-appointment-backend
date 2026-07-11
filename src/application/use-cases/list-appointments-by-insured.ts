import type {
  AppointmentRepository
} from "../../domain/repositories/appointment-repository";
import { ApplicationError } from "../../shared/errors/application-error";
import type {
  AppointmentOutput
} from "../dto/appointment-output";

export class ListAppointmentsByInsured {
  constructor(
    private readonly appointmentRepository:
      AppointmentRepository
  ) {}

  async execute(
    insuredId: string
  ): Promise<AppointmentOutput[]> {
    if (!/^\d{5}$/.test(insuredId)) {
      throw new ApplicationError(
        "INVALID_INSURED_ID",
        "insuredId debe contener exactamente 5 dígitos.",
        400
      );
    }

    const appointments =
      await this.appointmentRepository.findByInsuredId(
        insuredId
      );

    return appointments.map((appointment) =>
      appointment.toPrimitives()
    );
  }
}