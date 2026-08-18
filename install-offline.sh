#!/bin/sh
set -eu

PACKAGE_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
FILES_DIR="${GL_WOL_FILES_DIR:-$PACKAGE_DIR/files}"
BACKUP_DIR="/root/gl-wol-lan-backup-$(date +%Y%m%d-%H%M%S)"

fail() { echo "[gl-WOL-LAN] ERROR: $*" >&2; exit 1; }
log() { echo "[gl-WOL-LAN] $*"; }

[ "$(id -u)" = "0" ] || fail "run this installer as root"
[ -d /usr/share/oui/menu.d ] || fail "native GL.iNet OUI was not found"
[ -d /www/views ] || fail "GL.iNet view directory was not found"
[ -d "$FILES_DIR" ] || fail "offline package files were not found"

backup_file() {
    [ ! -e "$1" ] || {
        mkdir -p "$BACKUP_DIR$(dirname "$1")"
        cp -p "$1" "$BACKUP_DIR$1"
    }
}

install_file() {
    source_file="$FILES_DIR$1"
    [ -s "$source_file" ] || fail "package file is missing: $1"
    backup_file "$1"
    mkdir -p "$(dirname "$1")"
    cp "$source_file" "$1"
    chmod "$2" "$1"
}

install_file /usr/share/oui/menu.d/wol-pc.json 0644
install_file /www/views/gl-sdk4-ui-wol-pc.common.js 0644
install_file /usr/lib/oui-httpd/rpc/wol_pc 0644
install_file /usr/share/rpcd/acl.d/wol-pc.json 0644
[ -e /etc/config/gl-wol-lan ] || install_file /etc/config/gl-wol-lan 0644

command -v lua >/dev/null 2>&1 || fail "GL.iNet Lua runtime was not found"
lua -e 'local n=require("nixio"); assert(type(n.socket)=="function"); local m=dofile("/usr/lib/oui-httpd/rpc/wol_pc"); local r=m.list(); assert(type(r)=="table" and r.ok==true)' \
    || fail "RPC self-test failed; backup: $BACKUP_DIR"

/etc/init.d/nginx restart
LAN_IP="$(uci -q get network.lan.ipaddr || true)"
LAN_IP="${LAN_IP%%/*}"
[ -n "$LAN_IP" ] || LAN_IP="router.lan"
log "Offline package installed successfully"
log "Open: http://$LAN_IP/#/wol-pc"
log "Backup: $BACKUP_DIR"
