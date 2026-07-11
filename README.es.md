[EN](README.md) | **[ES]**

# Medical Appointment Backend

Backend serverless para agendamiento de citas médicas, con soporte para Perú (PE) y Chile (CL). Construido con AWS (Lambda, API Gateway, DynamoDB, SNS, SQS, EventBridge, RDS) usando Serverless Framework, TypeScript y Node.js.

## Arquitectura

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
    │  VPC (Subnets Públicas)                                     │
    │  ┌──────────────────────┐  ┌──────────────────────┐        │
    │  │ AppointmentsPEDB    │  │ AppointmentsCLDB    │        │
    │  │ (MySQL 8.0)         │  │ (MySQL 8.0)         │        │
    │  │ db.t3.micro / 20GB  │  │ db.t3.micro / 20GB  │        │
    │  │ appointments_pe     │  │ appointments_cl     │        │
    │  └──────────────────────┘  └──────────────────────┘        │
    │  Security Group: TCP/3306 from 0.0.0.0/0 → Internet Gateway│
    └─────────────────────────────────────────────────────────────┘
```

### Flujo

1. El cliente envía `POST /appointments` con `insuredId`, `scheduleId`, `countryISO`
2. El Lambda `createAppointment` guarda el registro en DynamoDB con estado `pending`
3. El Lambda publica el evento en el tópico SNS con `countryISO` como atributo del mensaje
4. SNS enruta el mensaje a la cola SQS correspondiente según la política de filtro (`PE` o `CL`)
5. El Lambda procesador del país (`processPEAppointment` / `processCLAppointment`) lee desde su SQS y guarda en la instancia RDS MySQL correspondiente (accesible públicamente vía VPC + Internet Gateway)
6. El Lambda del país publica un evento `AppointmentCompleted` a EventBridge
7. EventBridge enruta el evento a `AppointmentCompletionQueue`
8. El Lambda `completeAppointment` lee de la cola de finalización y actualiza DynamoDB a estado `completed`
9. Los mensajes que fallan 3 veces se mueven a su respectiva Dead Letter Queue (DLQ)

## Requisitos Previos

- Node.js >= 24 < 25
- Cuenta de AWS con credenciales configuradas (`~/.aws/credentials`)
- Serverless Framework CLI (`npm install -g serverless`)

> Las instancias RDS MySQL se crean automáticamente vía `serverless.yml`. Son de acceso público para este proyecto de prueba/desarrollo.

## Variables de Entorno

Las siguientes variables se resuelven automáticamente desde los recursos de CloudFormation:

| Variable | Resuelta desde |
|---|---|
| `APPOINTMENTS_TABLE` | Tabla DynamoDB (`Ref: AppointmentsTable`) |
| `APPOINTMENTS_BY_ID_INDEX` | Nombre del GSI `GSI1` |
| `APPOINTMENT_TOPIC_ARN` | Tópico SNS (`Ref: AppointmentTopic`) |
| `APPOINTMENT_EVENT_BUS_NAME` | Bus EventBridge (`Ref: AppointmentEventBus`) |

### Variables de conexión RDS (resueltas vía `Fn::GetAtt`)

| Variable | Fuente |
|---|---|
| `PE_DB_HOST` | `Fn::GetAtt: [AppointmentsPEDB, Endpoint.Address]` |
| `PE_DB_PORT` | `Fn::GetAtt: [AppointmentsPEDB, Endpoint.Port]` |
| `PE_DB_USER` | `appointment_user` (estático) |
| `PE_DB_PASSWORD` | `${param:peDbPassword}` (sobrescribible vía env `PE_DB_PASSWORD`) |
| `PE_DB_NAME` | `appointments_pe` (estático) |
| `PE_DB_SSL` | `"true"` |
| `CL_DB_HOST` | `Fn::GetAtt: [AppointmentsCLDB, Endpoint.Address]` |
| `CL_DB_PORT` | `Fn::GetAtt: [AppointmentsCLDB, Endpoint.Port]` |
| `CL_DB_USER` | `appointment_user` (estático) |
| `CL_DB_PASSWORD` | `${param:clDbPassword}` (sobrescribible vía env `CL_DB_PASSWORD`) |
| `CL_DB_NAME` | `appointments_cl` (estático) |
| `CL_DB_SSL` | `"true"` |

> Contraseñas por defecto: `ChangeMe123!` (sobrescribir con `set PE_DB_PASSWORD=TuClave` antes de desplegar)

## Esquema de Base de Datos

### DynamoDB (diseño de tabla única)

| Atributo | Tipo | Descripción |
|---|---|---|
| `PK` (HASH) | String | `INSURED#{insuredId}` |
| `SK` (RANGE) | String | `APPOINTMENT#{createdAt}#{appointmentId}` |
| `GSI1PK` (GSI HASH) | String | `APPOINTMENT#{appointmentId}` |
| `GSI1SK` (GSI RANGE) | String | `INSURED#{insuredId}` |
| `appointmentId` | String | UUID v4 |
| `insuredId` | String | Código de asegurado de 5 dígitos |
| `scheduleId` | Number | ID del espacio de agendamiento |
| `countryISO` | String | `PE` o `CL` |
| `status` | String | `pending` o `completed` |
| `createdAt` | String | Timestamp ISO 8601 |
| `updatedAt` | String | Timestamp ISO 8601 |

### MySQL (una instancia RDS por país)

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

## Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Verificar tipos

```bash
npm run check
```

### 3. Ejecutar pruebas unitarias

```bash
npm test
```

### 4. Desplegar en AWS

```bash
npx serverless deploy --stage dev --region us-east-1
```

> Las instancias RDS tardan 5-10 minutos en aprovisionarse. El comando retorna cuando todo el stack está listo.

Para sobrescribir las contraseñas por defecto de RDS:

```bash
set PE_DB_PASSWORD=TuClaveSegura1
set CL_DB_PASSWORD=TuClaveSegura2
npx serverless deploy --stage dev --region us-east-1
```

### 5. Eliminar despliegue

```bash
npx serverless remove --stage dev --region us-east-1
```

## Salidas del Stack

Tras el despliegue, están disponibles las siguientes salidas:

| Salida | Descripción |
|---|---|
| `AppointmentsTableName` | Nombre de la tabla DynamoDB |
| `AppointmentTopicArn` | ARN del tópico SNS |
| `AppointmentPEQueueUrl` | URL de la cola SQS de PE |
| `AppointmentCLQueueUrl` | URL de la cola SQS de CL |
| `AppointmentPEDeadLetterQueueUrl` | URL de la DLQ de PE |
| `AppointmentCLDeadLetterQueueUrl` | URL de la DLQ de CL |
| `AppointmentEventBusName` | Nombre del bus EventBridge |
| `AppointmentCompletionQueueUrl` | URL de la cola SQS de finalización |
| `AppointmentCompletionDeadLetterQueueUrl` | URL de la DLQ de finalización |
| `AppointmentsPEEndpoint` | Endpoint de la RDS de PE |
| `AppointmentsCLEndpoint` | Endpoint de la RDS de CL |

## API

> La especificación OpenAPI completa está disponible en [`openapi.yaml`](openapi.yaml).

URL base del despliegue actual:

```
https://hamug0apz3.execute-api.us-east-1.amazonaws.com
```

### Crear una Cita

```http
POST /appointments
Content-Type: application/json

{
  "insuredId": "12345",
  "scheduleId": 100,
  "countryISO": "PE"
}
```

**Respuesta:** `202 Accepted`

```json
{
  "appointmentId": "uuid-v4",
  "status": "pending",
  "message": "El agendamiento está siendo procesado."
}
```

### Listar Citas por Asegurado

```http
GET /insureds/{insuredId}/appointments
```

**Respuesta:** `200 OK`

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

### Ejemplos con cURL

```bash
# Crear una cita (Perú)
curl -X POST https://hamug0apz3.execute-api.us-east-1.amazonaws.com/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"12345","scheduleId":100,"countryISO":"PE"}'

# Crear una cita (Chile)
curl -X POST https://hamug0apz3.execute-api.us-east-1.amazonaws.com/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"12345","scheduleId":200,"countryISO":"CL"}'

# Listar citas por asegurado
curl https://hamug0apz3.execute-api.us-east-1.amazonaws.com/insureds/12345/appointments
```

### Prueba rápida con PowerShell

```powershell
# Crear cita
Invoke-RestMethod -Uri "https://hamug0apz3.execute-api.us-east-1.amazonaws.com/appointments" `
  -Method Post `
  -Body '{"insuredId":"12345","scheduleId":100,"countryISO":"PE"}' `
  -ContentType "application/json" | ConvertTo-Json

# Listar citas
Invoke-RestMethod -Uri "https://hamug0apz3.execute-api.us-east-1.amazonaws.com/insureds/12345/appointments" `
  -Method Get | ConvertTo-Json -Depth 10
```

## Estructura del Proyecto

```
src/
├── application/          # Casos de uso, DTOs, eventos, puertos
│   ├── dto/
│   ├── events/
│   ├── ports/
│   └── use-cases/
├── domain/               # Entidades de dominio e interfaces de repositorio
│   ├── entities/
│   └── repositories/
├── infrastructure/       # Adaptadores AWS (DynamoDB, SNS, EventBridge, MySQL)
│   ├── aws/
│   ├── database/
│   ├── messaging/
│   └── repositories/
├── interfaces/           # Handlers de Lambda (HTTP + SQS)
│   ├── lambdas/
│   └── sqs/
├── main/                 # Contenedores de inyección de dependencias
└── shared/               # Utilidades compartidas (parsers, errores, helpers HTTP)
```

## Decisiones de Diseño

- **Arquitectura Hexagonal** (Puertos & Adaptadores): La lógica de dominio está aislada de la infraestructura, haciendo el sistema testeable y adaptable
- **Principios SOLID**: Responsabilidad única por caso de uso, inversión de dependencias vía puertos, abierto/cerrado mediante diseño basado en interfaces
- **Patrón Repositorio**: Abstrae el acceso a datos detrás de interfaces tanto para DynamoDB como para MySQL
- **Filtrado por SNS**: Un solo tópico SNS con atributo de mensaje `countryISO` y políticas de filtro, evitando tópicos por país
- **Diseño de Tabla Única en DynamoDB**: PK/SK para consultar por insured ID, GSI para búsqueda por appointment ID
- **ReportBatchItemFailures**: Todos los Lambdas activados por SQS usan notificación de fallos parciales para procesamiento resiliente
- **RDS vía Serverless Framework**: Las instancias RDS MySQL se definen en `serverless.yml` y se crean mediante CloudFormation junto con el resto de la infraestructura
- **RDS Público (proyecto de prueba)**: Las instancias RDS son de acceso público con el grupo de seguridad restringido al puerto 3306. Los Lambdas no están en VPC — se conectan vía endpoint público, simplificando la arquitectura y evitando costos de NAT Gateway
- **Separación de Lambdas**: A diferencia de un enfoque con un solo Lambda "appointment", se separaron en 5 funciones independientes (`createAppointment`, `listAppointments`, `completeAppointment`, `processPEAppointment`, `processCLAppointment`) para cumplir con el Principio de Responsabilidad Única, permitir escalado independiente, reducir el tamaño de los paquetes de despliegue (mejor cold start) y aislar errores

## Pruebas

Las pruebas están escritas con Jest y usan el preset `ts-jest`:

```bash
npm test
```

Se usan implementaciones en memoria de repositorios y publicadores para evitar dependencias externas.

## Licencia

ISC
