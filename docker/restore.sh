#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.prod"

if [[ -z "${1:-}" ]]; then
  echo "Uso: ./restore.sh <archivo.sql.gz.gpg>"
  echo "Ejemplo: ./restore.sh /opt/mirai/backups/mirai_2026-06-03_02-00.sql.gz.gpg"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[ERROR] Archivo no encontrado: $BACKUP_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] No se encontró $ENV_FILE" >&2
  exit 1
fi

POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
BACKUP_PASSPHRASE=$(grep '^BACKUP_PASSPHRASE=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')

echo "[$(date)] Restaurando desde: $BACKUP_FILE"
echo "[!] Esto reemplazará todos los datos actuales en $POSTGRES_DB. Ctrl+C para cancelar."
sleep 5

gpg --batch \
    --passphrase "$BACKUP_PASSPHRASE" \
    --decrypt "$BACKUP_FILE" \
  | gunzip \
  | docker exec -i mirai-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date)] Restauración completada exitosamente."
