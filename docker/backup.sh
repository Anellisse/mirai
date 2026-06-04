#!/bin/bash
set -euo pipefail

# Leer variables desde .env.prod en la raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] No se encontró $ENV_FILE" >&2
  exit 1
fi

# Cargar solo las variables de backup/postgres (evitar sobreescribir env del sistema)
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
BACKUP_PASSPHRASE=$(grep '^BACKUP_PASSPHRASE=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')

BACKUP_DIR="${BACKUP_DIR:-/opt/mirai/backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
FILENAME="mirai_${TIMESTAMP}.sql.gz.gpg"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup: $FILENAME"

# pg_dump → gzip → gpg (AES-256 simétrico)
docker exec mirai-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip \
  | gpg --batch --yes \
        --passphrase "$BACKUP_PASSPHRASE" \
        --symmetric \
        --cipher-algo AES256 \
  > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] OK: $BACKUP_DIR/$FILENAME" | tee -a "$BACKUP_DIR/backup.log"

# Eliminar backups con más de 30 días
find "$BACKUP_DIR" -name "*.sql.gz.gpg" -mtime +30 -delete

echo "[$(date)] Limpieza de backups > 30 días completada"
