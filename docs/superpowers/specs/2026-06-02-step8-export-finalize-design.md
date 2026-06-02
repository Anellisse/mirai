# Step 8 — Export Word/PDF + Etapa de Informe Final

**Fecha:** 2026-06-02  
**Estado:** Aprobado

## Contexto

El código API del Paso 8 ya existe (no commiteado) en `apps/api/src/modules/export/` y `apps/api/src/modules/finalize/`. Ambos módulos tienen tests. Lo que falta es conectarlos en el backend y construir la UI en el frontend.

## Alcance

### API — Solo conexión de módulos

Registrar `ExportModule` y `FinalizeModule` en `apps/api/src/app.module.ts`. No se agrega ni modifica lógica de negocio.

**Endpoints ya implementados:**
- `GET /reports/:id/export/docx` — genera y descarga el `.docx` via `buildWordDocument`
- `GET /reports/:id/final-report` — consulta el `FinalReport` de un informe
- `POST /reports/:id/finalize` — sella el informe (Opción A: SYSTEM_PDF, Opción B: UPLOADED)

### Web — Tres cambios

#### 1. `apiClient` — dos métodos nuevos

**`downloadDocx(reportId)`**  
Hace fetch a `GET /reports/:id/export/docx`, recibe el blob, crea un `<a>` temporal y lo dispara para que el navegador descargue el archivo. No retorna nada.

**`finalizeReport(reportId, source, file?)`**  
Usa `FormData`. Envía `source` como campo de texto. Si `source === 'UPLOADED'`, adjunta el `file`. Llama a `POST /reports/:id/finalize`. Retorna el `FinalReport` creado.

#### 2. Componente `ExportButton`

Nuevo componente `apps/web/src/app/(dashboard)/reports/[id]/_components/export-button.tsx`.

Comportamiento al hacer click:
1. Llama `apiClient.downloadDocx(reportId)` → el navegador descarga el `.docx`
2. Llama `apiClient.transitionReport(reportId, 'export')` → estado pasa a EXPORTED
3. Llama `router.refresh()`

Muestra spinner durante la operación. Muestra error inline si falla.

En `report-overview.tsx`, la acción `export` usa `ExportButton` en lugar de `TransitionButton`.

#### 3. Página `/reports/[id]/finalize`

**Ruta:** `apps/web/src/app/(dashboard)/reports/[id]/finalize/`  
**Archivos:** `page.tsx` (server, carga el informe) + `_components/finalize-form.tsx` (client)

La página verifica que el informe esté en estado `EXPORTED` o `APPROVED`. Si el estado no permite finalizar, muestra mensaje de error.

`FinalizeForm` tiene tres estados internos:

**`selecting`** (inicial)
- Título: "Sellar versión final del informe"
- Dos tarjetas seleccionables (solo una activa a la vez):
  - **Opción A — Word del sistema:** usa el documento `.docx` generado por Mirai como versión oficial
  - **Opción B — Subir PDF editado:** file input que acepta solo `application/pdf`
- Checkbox de confirmación: *"Confirmo que revisé el contenido completo del informe y autorizo su sellado como versión oficial"*
- Botón "Sellar informe" deshabilitado hasta que: haya opción seleccionada + checkbox marcado (+ archivo adjunto si Opción B)

**`loading`**  
Spinner. Botón deshabilitado.

**`success`**  
Panel verde con ✅, "Informe sellado exitosamente", estado FINAL.  
Muestra: firma, hash SHA-256 (primeros 16 chars + `...`), versión (`v1`).  
Botón "← Volver al informe" que navega a `/reports/:id`.

El botón "Finalizar" en `report-overview.tsx` (estado EXPORTED) cambia de `TransitionButton` a un `<Link>` que navega a `/reports/:id/finalize`.

## Ciclo de estados del informe en este paso

```
APPROVED  →[click Exportar]→  EXPORTED  →[navega a /finalize]→  FINAL
            descarga .docx
```

## Tests

Los tests de `ExportService` y `FinalizeService` ya existen y deben pasar sin modificaciones. No se agregan tests de componentes React (el proyecto no tiene suite de frontend).

## Fuera de alcance

- Generación de PDF nativo (el sistema exporta `.docx`; el profesional puede subir su propio PDF editado)
- Nueva versión (v2) de un informe ya finalizado — queda para una iteración futura
- Descarga del `FinalReport` sellado desde la plataforma — queda para el Paso 9 (repositorio)
