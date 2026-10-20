#!/bin/sh
# Enforces a hard disk quota for the PostgreSQL data directory.
#
# Docker cannot cap the size of a named volume on ext4, so this creates a
# fixed-size ext4 image file and mounts it as a loop device. When the image is
# full, writes fail and PostgreSQL reports "No space left on device" instead of
# silently filling the VPS disk.
#
# Run once as root, BEFORE the stack starts:
#   sudo ./db-disk-quota.sh /srv/aba-db 5G
# then set DB_DATA_DIR=/srv/aba-db in infra/.env and redeploy.
#
# Each stack needs its own directory and image file.
set -eu

dir=${1:?usage: db-disk-quota.sh <directory> <size>}
size=${2:-5G}
image="$dir.img"

case "$dir" in
    /*) ;;
    *) echo "usa una ruta absoluta, por ejemplo /srv/aba-db" >&2; exit 1 ;;
esac

if [ "$(id -u)" -ne 0 ]; then
    echo "este script necesita root (monta un loop device)" >&2
    exit 1
fi

mkdir -p "$dir"

if [ ! -f "$image" ]; then
    echo "creando imagen ext4 de $size en $image"
    truncate -s "$size" "$image"
    mkfs.ext4 -q -F "$image"
fi

if ! mountpoint -q "$dir"; then
    mount -o loop "$image" "$dir"
fi

if ! grep -qE "^[^#]*[[:space:]]$dir[[:space:]]" /etc/fstab; then
    echo "$image $dir ext4 loop,nofail 0 0" >> /etc/fstab
    echo "agregado a /etc/fstab (nofail: si el montaje falla, el VPS arranca igual)"
fi

# The postgres:17-alpine image runs as uid 70.
chown 70:70 "$dir"
chmod 700 "$dir"

echo "listo: $dir montado con tope de $size"
df -h "$dir"
