# Diseño: Paso 2 — CRUD Pacientes + Máquina de Estados del Informe

**Fecha:** 2026-05-30  
**Proyecto:** Mirai — Plataforma de informes neuropsicológicos  
**Enfoque elegido:** API-first (NestJS completo → Next.js páginas)

---

## 1. Cambios al schema Prisma

Una sola migración con 4 cambios:

### Patient
```prisma
model Patient {
  // campos existentes...
  createdById  String        // nuevo: quién creó el registro
  rutHash      String?       // nuevo: HMAC-SHA256 del RUT normalizado (para búsqueda)

  createdBy    User          @relation("CreatedPatients", fields: [createdById], references: [id])
}
```

### AccessRequest
```prisma
model AccessRequest {
  // campos existentes...
  reportId    String?       // cambia de requerido a opcional
  patientId   String?       // nuevo: para solicitudes de acceso a nivel paciente

  patient     Patient?      @relation(fields: [patientId], references: [id])
}
```

### Variables de entorno necesarias
- `RUT_HMAC_SECRET` — clave para HMAC-SHA256 del RUT
- `ENCRYPTION_KEY` — clave AES-256-GCM para cifrado del RUT

---

## 2. EncryptionService (compartido)

Módulo NestJS global con utilidades de cifrado:

| Método | Descripción |
|---|---|
| `normalizeRut(rut)` | Elimina puntos, guion y espacios → `"12.345.678-9"` → `"123456789"` |
| `hashRut(rut)` | HMAC-SHA256 con `RUT_HMAC_SECRET` sobre el RUT normalizado |
| `encryptRut(rut)` | AES-256-GCM con `ENCRYPTION_KEY`, retorna `iv:ciphertext` |
| `decryptRut(cipher)` | Inverso del anterior |

---

## 3. PatientsModule (API)

### Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/patients` | Todos los roles | Lista todos los pacientes de la org. Acepta `?name=` (búsqueda parcial) y `?rut=` (búsqueda exacta via hash). Devuelve info mínima + flag `isAssigned` por paciente. |
| `GET` | `/patients/:id` | `isAssigned` o `AccessGrant` activo | Detalle completo. `403` si no autorizado. |
| `POST` | `/patients` | Todos los roles | Crea paciente. Encripta RUT, guarda hash. El creador queda como `createdById`. |
| `PATCH` | `/patients/:id` | Solo si `isAssigned` | Edita datos del paciente. |
| `DELETE` | `/patients/:id` | `ADMIN` / `SUPER_ADMIN` | Soft delete (setea `deletedAt`). |
| `POST` | `/patients/:id/access-requests` | Todos los roles | Crea `AccessRequest` con `patientId`. |

### Lógica `isAssigned(userId, patientId)`

```
patient.createdById === userId
OR
EXISTS Report WHERE patientId = patientId
  AND (authorId = userId OR supervisorId = userId)
  AND deletedAt IS NULL
```

### Respuesta del listado `/patients`

```json
{
  "id": "...",
  "name": "...",
  "birthDate": "...",
  "gender": "...",
  "isAssigned": true,
  "reportCount": 3
}
```

Los pacientes no asignados incluyen solo `id`, `name`, `isAssigned: false` y `reportCount`.

---

## 4. ReportsModule (API)

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/reports` | Crea informe. Inicializa todas las `ReportSection` en `PENDING`. Estado: `DRAFT`. |
| `GET` | `/reports` | Lista informes visibles: propios + supervisados + con `AccessGrant` activo. |
| `GET` | `/reports/:id` | Detalle del informe con sus secciones. |
| `PATCH` | `/reports/:id` | Edita `consultationReason`, `omitCit`, `selectedTests`. Solo en `DRAFT`/`IN_PROGRESS`. |
| `POST` | `/reports/:id/transition` | Ejecuta transición de estado. Body: `{ action }`. |

### Endpoints de secciones

| Método | Ruta | Descripción |
|---|---|---|
| `PATCH` | `/reports/:id/sections/:sectionType` | Guarda contenido de una sección. Disponible en `DRAFT` e `IN_PROGRESS`. Si `status` era `PENDING`, lo actualiza a `CLINICIAN_REVIEWING`. |
| `POST` | `/reports/:id/sections/:sectionType/approve` | Marca sección como `APPROVED`. Solo autor o supervisor. |

### Cuerpo de creación del informe

```json
{
  "patientId": "...",
  "frameworkCode": "SNP-CHC",
  "selectedTests": ["WISC-V", "TFCRO", "TAVECI"],
  "supervisorId": "..." // opcional
}
```

### Máquina de estados

```
DRAFT → IN_PROGRESS → REVIEW → [SUPERVISOR_REVIEW] → APPROVED → EXPORTED → FINAL
```

| Desde | Acción | Hacia | Quién | Condición |
|---|---|---|---|---|
| `DRAFT` | `start` | `IN_PROGRESS` | Autor | — |
| `IN_PROGRESS` | `submit` | `REVIEW` | Autor | Sin secciones IA sin revisar |
| `REVIEW` | `submit` | `SUPERVISOR_REVIEW` | Autor / Supervisor | `supervisorId` asignado |
| `REVIEW` | `approve` | `APPROVED` | Autor con rol ≥ `CLINICO_SENIOR` | Sin supervisor asignado |
| `SUPERVISOR_REVIEW` | `approve` | `APPROVED` | Supervisor asignado | — |
| `APPROVED` | `export` | `EXPORTED` | Autor / Supervisor | — |
| `EXPORTED` | `finalize` | `FINAL` | Autor / Supervisor | `FinalReport` existe |

**Validación en `submit` (IN_PROGRESS → REVIEW):**  
Si existe alguna `ReportSection` con `generatedBy: AI` y `status: AI_GENERATED` → retorna `422` con lista de secciones pendientes de revisión.

**Errores:**
- Transición inválida → `409 Conflict` con mensaje descriptivo
- Sin permisos para la transición → `403 Forbidden`
- Toda transición exitosa escribe un `AuditLog`

---

## 5. Páginas Next.js (construidas después de la API)

### Pacientes

| Ruta | Descripción |
|---|---|
| `/patients` | Tabla de todos los pacientes. Búsqueda por nombre (parcial) o RUT completo. Pacientes no asignados muestran candado + botón "Solicitar acceso". |
| `/patients/new` | Formulario: nombre, RUT, fecha de nacimiento, género, email, teléfono. |
| `/patients/[id]` | Datos del paciente + lista de informes con estado. Si no tiene acceso → pantalla bloqueada con "Solicitar acceso". |

### Informe — Wizard de creación (desde `/patients/[id]`)

| Paso | Contenido |
|---|---|
| 1 | Seleccionar marco clínico: SNP-CHC o Estándar |
| 2 | Seleccionar tests del catálogo, agrupados por dominio |
| 3 | Asignar supervisor (opcional). Confirmar → crea informe → redirige. |

### Informe — Vista general

| Ruta | Descripción |
|---|---|
| `/reports/[id]` | Estado actual (badge), secciones con su estado, acciones disponibles según estado y rol del usuario autenticado. |

---

## 6. Notas de implementación

- **`DRAFT` vs `IN_PROGRESS`:** ambos permiten editar secciones libremente. La distinción es semántica; `start` es una señal explícita del clínico de que comenzó el trabajo formal.
- **Secciones condicionales:** `SOCIAL_COGNITION` solo se inicializa si el marco es `SNP-CHC`.
- **Soft delete:** pacientes y reportes nunca se eliminan físicamente. Retención ≥ 5 años por legislación chilena de salud.
- **Audit log:** toda transición de estado y todo acceso a datos sensibles escribe en `AuditLog`.
