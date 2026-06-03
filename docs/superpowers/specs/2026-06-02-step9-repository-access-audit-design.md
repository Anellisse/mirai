# Step 9 — Repositorio + Control de Acceso + Auditoría

**Fecha:** 2026-06-02  
**Estado:** Aprobado

## Contexto

El schema Prisma ya tiene `AccessRequest`, `AccessGrant` y `AuditLog` definidos. El layout web tiene el link "Repositorio" → `/repository` pero la página no existe. Ya existe `AccessRequestButton` para solicitar acceso a pacientes (se reutilizará el patrón). No existe ningún módulo API para repositorio, access-control ni auditoría.

## Alcance

Tres módulos API nuevos + cuatro páginas web nuevas + sidebar actualizado.

---

## API

### RepositoryModule

**Endpoint:** `GET /repository/reports`  
**Auth:** cualquier usuario autenticado  

Retorna todos los informes de la organización del usuario. Para cada informe incluye:
- `id`, `status`, `frameworkCode`, `createdAt`, `consultationReason`
- `author`: `{ name, title }`
- `patient`: nombre completo si el solicitante es el autor O tiene un `AccessGrant` vigente (no expirado) para ese informe; nombre enmascarado en caso contrario
- `isOwn`: boolean — true si el solicitante es el autor
- `hasAccess`: boolean — true si tiene AccessGrant vigente
- `pendingRequest`: boolean — true si ya existe una AccessRequest PENDING del solicitante para ese informe

**Enmascaramiento del nombre:** cada palabra del nombre se reemplaza por su primera letra + asteriscos hasta la longitud original. Ejemplo: `"María Rodríguez"` → `"M***** R*********"`. Se aplica consistentemente en todos los endpoints que retornan datos de repositorio.

**AccessGrant vigente:** `expiresAt IS NULL OR expiresAt > NOW()`

---

### AccessControlModule

#### `POST /reports/:id/access-requests`
Crea una AccessRequest para el informe. Solo clínicos que no sean autores del informe.  
Body: `{ reason: string }`  
Validación: no crear duplicado si ya existe una PENDING del mismo solicitante para el mismo informe.  
Crea entrada en AuditLog: acción `ACCESS_REQUESTED`.

#### `GET /access-requests`
- Admin/SuperAdmin: retorna todas las AccessRequests de la organización con `{ requester, report (nombre enmascarado), status, reason, createdAt, reviewedBy, rejectionReason, grant }`
- Clínico: retorna solo las propias

#### `POST /access-requests/:id/approve`
Solo Admin/SuperAdmin.  
Body: `{ duration: 'permanent' | '24h' | '48h' }`  
Crea un `AccessGrant` con `expiresAt` calculado:
- `permanent` → `expiresAt: null`
- `24h` → `expiresAt: now + 24 horas`
- `48h` → `expiresAt: now + 48 horas`

Transiciona la AccessRequest a `APPROVED`. Crea entrada en AuditLog: `ACCESS_GRANTED`.

#### `POST /access-requests/:id/reject`
Solo Admin/SuperAdmin.  
Body: `{ reason: string }` (obligatorio)  
Transiciona la AccessRequest a `REJECTED`, guarda `rejectionReason`. Crea entrada en AuditLog: `ACCESS_REJECTED`.

---

### AuditModule

**Endpoint:** `GET /audit-logs`  
**Auth:** Admin, SuperAdmin  
**Query params:** `page` (default 1), `limit` (default 50), `action?`, `userId?`  
Retorna lista paginada de AuditLog: `{ id, action, resource, resourceId, metadata, createdAt, user: { name, email } }` ordenada por `createdAt DESC`.

---

## Web

### `/repository` — Página del repositorio

**Tipo:** server component (carga la lista) + client components para interactividad.

**Layout de la tabla:**
| Paciente | Profesional | Estado | Fecha | Acción |
|---|---|---|---|---|
| García López, M. *(propio)* | Dra. Pérez | FINAL | 12/05/2026 | Abrir → |
| M***** R***** *(ajeno)* | Dr. Morales | REVIEW | 08/05/2026 | 🔒 Pedir / Pendiente |

- Filas propias (`isOwn: true`): fondo `bg-green-50`, link "Abrir →" navega a `/reports/:id`
- Filas con acceso (`hasAccess: true`): fondo `bg-purple-50`, link "Abrir →" navega a `/reports/:id`  
- Filas con solicitud pendiente (`pendingRequest: true`): badge "Solicitud enviada" sin acción
- Filas ajenas sin acceso ni solicitud: botón "🔒 Pedir" que expande un panel inline

**Panel inline de solicitud:**  
Al hacer click en "🔒 Pedir", la fila se expande mostrando un `textarea` para el motivo y un botón "Enviar solicitud". Al enviar, llama a `POST /reports/:id/access-requests`, muestra confirmación y colapsa el panel actualizando el badge a "Solicitud enviada".

---

### `/admin/access-requests` — Panel de administrador

**Tipo:** server component (carga inicial) + client para tabs, modal y acciones.

**Tabs:** "Pendientes (N)" / "Resueltas"

**Tabla pendientes:** Solicitante | Informe (enmascarado) | Hace cuánto | "Revisar →"

**Modal de revisión** (abre al click en "Revisar →"):
- Muestra: solicitante, informe, motivo completo
- Selector de duración: `<select>` con opciones Permanente / 24 horas / 48 horas
- Botón "✓ Aprobar" → llama `POST /access-requests/:id/approve` → cierra modal, refresca lista
- Botón "✗ Rechazar" → muestra campo de motivo obligatorio → llama `POST /access-requests/:id/reject` → cierra modal

**Tabla resueltas:** mismas columnas + columna Estado (APPROVED / REJECTED) + fecha de resolución.

---

### `/admin/audit-log` — Log de auditoría

**Tipo:** server component con paginación.  
**Tabla:** Fecha/hora | Usuario | Acción | Recurso | ID recurso  
Paginación simple: botones "Anterior" / "Siguiente" como query params `?page=N`.  
Solo visible para Admin/SuperAdmin — redirige a `/dashboard` si el rol no aplica.

---

### Sidebar actualizado (`layout.tsx`)

La sección "Admin" aparece condicionalmente si el rol del usuario es `ADMIN` o `SUPER_ADMIN`:

```
Admin
  ├── Solicitudes de acceso  → /admin/access-requests
  └── Log de auditoría       → /admin/audit-log
```

El rol se obtiene desde la sesión (ya disponible en el layout vía `requireAuth()`).

---

## apiClient — Métodos nuevos

```typescript
getRepositoryReports(): Promise<RepositoryReportItem[]>
createAccessRequest(reportId: string, reason: string): Promise<void>
getAccessRequests(): Promise<AccessRequestItem[]>
approveAccessRequest(requestId: string, duration: 'permanent' | '24h' | '48h'): Promise<void>
rejectAccessRequest(requestId: string, reason: string): Promise<void>
getAuditLogs(page?: number): Promise<{ data: AuditLogItem[]; total: number; page: number }>
```

---

## Tests (API)

- **RepositoryService**: nombre enmascarado para ajeno sin grant, nombre completo para autor, nombre completo para ajeno con grant vigente, nombre enmascarado para ajeno con grant expirado, flag `isOwn`/`hasAccess`/`pendingRequest` correctos
- **AccessControlService**: crear solicitud, rechazar duplicado PENDING, aprobar con duración permanente (expiresAt null), aprobar 24h (expiresAt correcto), rechazar con motivo obligatorio, validación de rol (solo admin puede aprobar/rechazar)
- **AuditService**: listado paginado, validación de rol (solo admin/superadmin)

---

## Fuera de alcance

- Notificaciones por email al admin cuando llega una solicitud (queda para Paso 10)
- Notificación al solicitante cuando su solicitud es resuelta (queda para Paso 10)
- Búsqueda/filtrado avanzado en el repositorio
- Gestión de usuarios (`/admin/users`) — queda para Paso 10
