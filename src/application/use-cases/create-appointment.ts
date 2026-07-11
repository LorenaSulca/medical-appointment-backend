import { randomUUID } from "node:crypto";

import {
  Appointment
} from "../../domain/entities/appointment";
import type {
  AppointmentRepository
} from "../../domain/repositories/appointment-repository";
import type {
  AppointmentOutput
} from "../dto/appointment-output";
import type {
  CreateAppointmentInput
} from "../dto/create-appointment-input";
import type {
  AppointmentEventPublisher
} from "../ports/appointment-event-publisher";
import {
  validateCreateAppointmentInput
} from "./validate-create-appointment";

export interface CreateAppointmentDependencies {
  appointmentRepository: AppointmentRepository;
  eventPublisher: AppointmentEventPublisher;
  generateId?: () => string;
  now?: () => Date;
}

export class CreateAppointment {
  private readonly generateId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly dependencies: CreateAppointmentDependencies
  ) {
    this.generateId =
      dependencies.generateId ?? randomUUID;

    this.now =
      dependencies.now ?? (() => new Date());
  }

  async execute(
    input: CreateAppointmentInput
  ): Promise<AppointmentOutput> {
    const validatedInput =
      validateCreateAppointmentInput(input);

    const currentDate =
      this.now().toISOString();

    const appointment = Appointment.create({
      appointmentId: this.generateId(),
      insuredId: validatedInput.insuredId,
      scheduleId: validatedInput.scheduleId,
      countryISO: validatedInput.countryISO,
      status: "pending",
      createdAt: currentDate,
      updatedAt: currentDate
    });

    await this.dependencies.appointmentRepository.save(
      appointment
    );

    await this.dependencies.eventPublisher.publishRequested({
      appointmentId: appointment.appointmentId,
      insuredId: appointment.insuredId,
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO,
      requestedAt: currentDate
    });

    return appointment.toPrimitives();
  }
}