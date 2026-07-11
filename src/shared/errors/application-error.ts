export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);

    this.name = "ApplicationError";

    Object.setPrototypeOf(this, new.target.prototype);
  }
}