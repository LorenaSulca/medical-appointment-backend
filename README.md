**[EN]** | [ES](README.es.md)

# Medical Appointment Backend

Serverless backend for medical appointment scheduling, supporting both Peru (PE) and Chile (CL). Built with AWS (Lambda, API Gateway, DynamoDB, SNS, SQS, EventBridge, RDS) using the Serverless Framework, TypeScript, and Node.js.

## Architecture

```
                   ┌─────────────────────────┐
                   │   HTTP API Gateway V2    │
                   │  POST /appointments      │
                   │  GET /insureds/{id}/apps  │
                   └──────┬──────────┬───────┘
                          │          │
               ┌──────────▼──┐  ┌───▼──────────┐
               │create-      │  │list-          │
               │appointment   │  │appointments   │
               │Lambda       │  │Lambda         │
               └──────┬──────┘  └──────┬────────┘
                      │                │
               ┌──────▼────────────────▼────────┐
               │    DynamoDB (pending/completed) │
               └──────┬─────────────────────────┘
                      │ SNS Topic (countryISO filter)
                      │
               ┌──────▼──────┐   ┌──────▼──────┐
               │ SQS PE Queue│   │ SQS CL Queue│
               └──────┬──────┘   └──────┬──────┘
                      │                 │
               ┌──────▼──────┐   ┌──────▼──────┐
               │process-pe   │   │process-cl   │
               │Lambda       │   │Lambda       │
               │(RDS PE)     │   │(RDS CL)     │
               └──────┬──────┘   └──────┬──────┘
                      │                 │
                      └──────┬──────────┘
                             │ EventBridge
                             │ (AppointmentCompleted)
                             ▼
                     ┌───────────────┐
                     │ SQS Completion│
                     │ Queue         │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │complete-      │
                     │appointment    │
                     │Lambda         │
                     │(DynamoDB      │
                     │ update)       │
                     └───────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │  VPC (Public Subnets)                                       │
    │  ┌──────────────────────┐  ┌──────────────────────┐        │
    │  │ AppointmentsPEDB    │  │ AppointmentsCLDB    │        │
    │  │ (MySQL 8.0)         │  │ (MySQL 8.0)         │        │
    │  │ db.t3.micro / 20GB  │  │ db.t3.micro / 20GB  │        │
    │  │ appointments_pe     │  │ appointments_cl     │        │
    │  └──────────────────────┘  └──────────────────────┘        │
    │  Security Group: TCP/3306 from 0.0.0.0/0 → Internet Gateway│
    └─────────────────────────────────────────────────────────────┘
```

### Flow

1. Client sends `POST /appointments` with `insuredId`, `scheduleId`, `countryISO`
2. `createAppointment` Lambda saves the record to DynamoDB with status `pending`
3. Lambda publishes the event to the SNS topic with `countryISO` as a message attribute
4. SNS routes the message to the appropriate SQS queue based on the filter policy (`PE` or `CL`)
5. Country processor Lambda (`processPEAppointment` / `processCLAppointment`) reads from its SQS, saves to the corresponding RDS MySQL instance (publicly accessible via VPC + Internet Gateway)
6. Country Lambda publishes an `AppointmentCompleted` event to EventBridge
7. EventBridge routes the event to the `AppointmentCompletionQueue`
8. `completeAppointment` Lambda reads from the completion queue and updates DynamoDB status to `completed`
9. Messages that fail processing 3 times are moved to their respective Dead Letter Queue (DLQ)

## Prerequisites

- Node.js >= 24 < 25
- AWS account with appropriate credentials configured (`~/.aws/credentials`)
- Serverless Framework CLI (`npm install -g serverless`)

> RDS MySQL instances are created automatically via `serverless.yml` (no manual setup needed). They are publicly accessible for this test/dev project.

## Environment Variables

The following environment variables are auto-resolved from CloudFormation resources:

| Variable | Auto-resolved from |
|---|---|
| `APPOINTMENTS_TABLE` | DynamoDB table (`Ref: AppointmentsTable`) |
| `APPOINTMENTS_BY_ID_INDEX` | GSI name `GSI1` |
| `APPOINTMENT_TOPIC_ARN` | SNS topic (`Ref: AppointmentTopic`) |
| `APPOINTMENT_EVENT_BUS_NAME` | EventBridge bus (`Ref: AppointmentEventBus`) |

### RDS connection variables (auto-resolved via `Fn::GetAtt`)

| Variable | Source |
|---|---|
| `PE_DB_HOST` | `Fn::GetAtt: [AppointmentsPEDB, Endpoint.Address]` |
| `PE_DB_PORT` | `Fn::GetAtt: [AppointmentsPEDB, Endpoint.Port]` |
| `PE_DB_USER` | `appointment_user` (static) |
| `PE_DB_PASSWORD` | `${param:peDbPassword}` (overridable via env `PE_DB_PASSWORD`) |
| `PE_DB_NAME` | `appointments_pe` (static) |
| `PE_DB_SSL` | `"true"` |
| `CL_DB_HOST` | `Fn::GetAtt: [AppointmentsCLDB, Endpoint.Address]` |
| `CL_DB_PORT` | `Fn::GetAtt: [AppointmentsCLDB, Endpoint.Port]` |
| `CL_DB_USER` | `appointment_user` (static) |
| `CL_DB_PASSWORD` | `${param:clDbPassword}` (overridable via env `CL_DB_PASSWORD`) |
| `CL_DB_NAME` | `appointments_cl` (static) |
| `CL_DB_SSL` | `"true"` |

> Default passwords: `ChangeMe123!` (override via `set PE_DB_PASSWORD=YourPass` before deploying)

## Database Schema

### DynamoDB (single-table design)

| Attribute | Type | Description |
|---|---|---|
| `PK` (HASH) | String | `INSURED#{insuredId}` |
| `SK` (RANGE) | String | `APPOINTMENT#{createdAt}#{appointmentId}` |
| `GSI1PK` (GSI HASH) | String | `APPOINTMENT#{appointmentId}` |
| `GSI1SK` (GSI RANGE) | String | `INSURED#{insuredId}` |
| `appointmentId` | String | UUID v4 |
| `insuredId` | String | 5-digit insured code |
| `scheduleId` | Number | Appointment slot ID |
| `countryISO` | String | `PE` or `CL` |
| `status` | String | `pending` or `completed` |
| `createdAt` | String | ISO 8601 timestamp |
| `updatedAt` | String | ISO 8601 timestamp |

### MySQL (one RDS instance per country)

```sql
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    appointment_id VARCHAR(36) NOT NULL,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id BIGINT UNSIGNED NOT NULL,
    country_iso CHAR(2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    requested_at DATETIME(3) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appointments_appointment_id (appointment_id),
    INDEX idx_appointments_insured_id (insured_id),
    INDEX idx_appointments_schedule_id (schedule_id),
    CONSTRAINT chk_appointments_country_iso CHECK (country_iso IN ('PE', 'CL')),
    CONSTRAINT chk_appointments_status CHECK (status IN ('completed'))
);
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Type-check

```bash
npm run check
```

### 3. Run unit tests

```bash
npm test
```

### 4. Deploy to AWS

```bash
npx serverless deploy --stage dev --region us-east-1
```

> RDS instances take 5-10 minutes to provision. The command returns once the full stack is ready.

To override the default RDS passwords:

```bash
set PE_DB_PASSWORD=YourSecurePass1
set CL_DB_PASSWORD=YourSecurePass2
npx serverless deploy --stage dev --region us-east-1
```

### 5. Remove deployment

```bash
npx serverless remove --stage dev --region us-east-1
```

## Stack Outputs

After deployment, the following outputs are available:

| Output | Description |
|---|---|
| `AppointmentsTableName` | DynamoDB table name |
| `AppointmentTopicArn` | SNS topic ARN |
| `AppointmentPEQueueUrl` | PE SQS queue URL |
| `AppointmentCLQueueUrl` | CL SQS queue URL |
| `AppointmentPEDeadLetterQueueUrl` | PE DLQ URL |
| `AppointmentCLDeadLetterQueueUrl` | CL DLQ URL |
| `AppointmentEventBusName` | EventBridge bus name |
| `AppointmentCompletionQueueUrl` | Completion SQS queue URL |
| `AppointmentCompletionDeadLetterQueueUrl` | Completion DLQ URL |
| `AppointmentsPEEndpoint` | PE RDS endpoint address |
| `AppointmentsCLEndpoint` | CL RDS endpoint address |

> Full OpenAPI specification is available in [`openapi.yaml`](openapi.yaml).

## API

### Create Appointment

```http
POST /appointments
Content-Type: application/json

{
  "insuredId": "12345",
  "scheduleId": 100,
  "countryISO": "PE"
}
```

**Response:** `202 Accepted`

```json
{
  "appointmentId": "uuid-v4",
  "status": "pending",
  "message": "El agendamiento está siendo procesado."
}
```

### List Appointments by Insured

```http
GET /insureds/{insuredId}/appointments
```

**Response:** `200 OK`

```json
{
  "insuredId": "12345",
  "appointments": [
    {
      "appointmentId": "uuid-v4",
      "insuredId": "12345",
      "scheduleId": 100,
      "countryISO": "PE",
      "status": "completed",
      "createdAt": "2024-09-30T12:30:00.000Z",
      "updatedAt": "2024-09-30T12:31:00.000Z"
    }
  ]
}
```

### cURL Examples

> Replace `https://your-api-id.execute-api.us-east-1.amazonaws.com` with your actual endpoint from the deploy output.

```bash
# Create an appointment (Peru)
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"12345","scheduleId":100,"countryISO":"PE"}'

# Create an appointment (Chile)
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"12345","scheduleId":200,"countryISO":"CL"}'

# List appointments by insured
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/insureds/12345/appointments
```

## Project Structure

```
src/
├── application/          # Use cases, DTOs, events, ports
│   ├── dto/
│   ├── events/
│   ├── ports/
│   └── use-cases/
├── domain/               # Domain entities and repository interfaces
│   ├── entities/
│   └── repositories/
├── infrastructure/       # AWS adapters (DynamoDB, SNS, EventBridge, MySQL)
│   ├── aws/
│   ├── database/
│   ├── messaging/
│   └── repositories/
├── interfaces/           # Lambda handlers (HTTP + SQS)
│   ├── lambdas/
│   └── sqs/
├── main/                 # Dependency injection containers
└── shared/               # Shared utilities (parsers, errors, HTTP helpers)
```

## Design Decisions

- **Hexagonal Architecture** (Ports & Adapters): Domain logic isolated from infrastructure, making the system testable and adaptable
- **SOLID Principles**: Single responsibility per use case, dependency inversion via ports, open/closed through interface-based design
- **Repository Pattern**: Abstracts data access behind interfaces for both DynamoDB and MySQL
- **SNS Message Filtering**: Single SNS topic with `countryISO` message attribute filter policies, avoiding per-country topics
- **DynamoDB Single-Table Design**: PK/SK pattern for querying by insured ID, GSI for lookup by appointment ID
- **ReportBatchItemFailures**: All SQS-triggered Lambdas use partial batch failure reporting for resilient message processing
- **RDS via Serverless Framework**: RDS MySQL instances are defined in `serverless.yml` and created via CloudFormation alongside the rest of the infrastructure
- **Public RDS (test project)**: RDS instances are publicly accessible with security group restricted to port 3306. No VPC for Lambdas — they connect via public endpoint, simplifying the architecture and avoiding NAT Gateway costs

## Testing

Tests are written with Jest and use the `ts-jest` preset:

```bash
npm test
```

In-memory implementations of repositories and publishers are used in tests to avoid external dependencies.

## License

ISC
