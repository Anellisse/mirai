# Security — Deuda Técnica Documentada

Ítems de seguridad fuera del alcance del MVP (Paso 10). Revisitar antes de escalar o exponer el sistema a más usuarios.

## Alta prioridad

- [ ] **Backup externo**: configurar `rclone` para copiar backups a Backblaze B2 o similar, encriptados en origen. El backup local actual no protege contra fallo de hardware del servidor.
- [ ] **Encriptación de campos clínicos adicionales**: los campos `diagnoses`, `medications`, `hospitalizations` e `hypotheses` en Prisma actualmente van en texto plano. `EncryptionService` (AES-256-GCM) ya existe — falta aplicarlo. Requiere migración de datos.
- [ ] **Log rotation**: configurar `logrotate` para los logs de Nginx y la aplicación. Sin esto, los logs crecen indefinidamente en disco.

## Media prioridad

- [ ] **Prueba automática de restauración**: script o cron job que restaura el último backup en una BD de staging y verifica integridad (`pg_restore --list`). Hoy la restauración es solo manual.
- [ ] **Monitoreo y alertas**: uptime check (UptimeRobot o similar), alerta si el servicio cae o si el disco supera el 80%. Sin esto, los fallos se detectan tarde.
- [ ] **Revisión de dependencias**: configurar `npm audit` en CI o Dependabot para detectar vulnerabilidades en paquetes npm.

## Baja prioridad

- [ ] **2FA para todos los roles**: actualmente es obligatorio solo para admins. Considerar para clínicos también.
- [ ] **Audit log de accesos fallidos**: los intentos fallidos de login se bloquean (AccountLockout) pero no quedan en `AuditLog`. Útil para detectar ataques.
- [ ] **Content-Security-Policy ajustada**: el CSP actual usa `'unsafe-inline'` para scripts y estilos (necesario para Next.js sin configuración adicional). Investigar nonces o hash-based CSP.
