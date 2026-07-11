CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    appointment_id VARCHAR(36) NOT NULL,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id BIGINT UNSIGNED NOT NULL,
    country_iso CHAR(2) NOT NULL,
    status VARCHAR(20) NOT NULL,

    requested_at DATETIME(3) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_appointments_appointment_id (
        appointment_id
    ),
    INDEX idx_appointments_insured_id (
        insured_id
    ),
    INDEX idx_appointments_schedule_id (
        schedule_id
    ),

    CONSTRAINT chk_appointments_country_iso
        CHECK (country_iso IN ('PE', 'CL')),

    CONSTRAINT chk_appointments_status
        CHECK (status IN ('completed'))
);