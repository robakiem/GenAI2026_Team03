# services

All business rules (BR-xx), permission and state checks, and transactions live here (ADR-0001, ADR-0006).
Services call the `data` layer and never touch `express` objects.
