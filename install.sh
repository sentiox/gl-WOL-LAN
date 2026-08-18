#!/bin/sh
set -eu

BASE_URL="${GL_WOL_BASE_URL:-https://raw.githubusercontent.com/sentiox/gl-WOL-LAN/master}"
TMP_DIR="$(mktemp -d /tmp/gl-wol-lan.XXXXXX)"
BACKUP_DIR="/root/gl-wol-lan-backup-$(date +%Y%m%d-%H%M%S)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM
fail() { echo "[gl-WOL-LAN] ERROR: $*" >&2; exit 1; }
log() { echo "[gl-WOL-LAN] $*"; }

[ "$(id -u)" = "0" ] || fail "run this installer as root"
[ -d /usr/share/oui/menu.d ] || fail "native GL.iNet OUI was not found"
[ -d /www/views ] || fail "GL.iNet view directory was not found"

fetch() {
    relative="$1"; destination="$2"
    mkdir -p "$(dirname "$destination")"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$BASE_URL/$relative" -o "$destination"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$destination" "$BASE_URL/$relative"
    else
        fail "curl or wget is required"
    fi
    [ -s "$destination" ] || fail "downloaded file is empty: $relative"
}

install_dependencies() {
    missing=""
    command -v etherwake >/dev/null 2>&1 || missing="$missing etherwake"
    if command -v apk >/dev/null 2>&1; then
        apk info -e luci-app-wol >/dev/null 2>&1 || missing="$missing luci-app-wol"
        [ -z "$missing" ] || { log "Installing:$missing"; apk add $missing; }
    elif command -v opkg >/dev/null 2>&1; then
        opkg list-installed | grep -q '^luci-app-wol ' || missing="$missing luci-app-wol"
        [ -z "$missing" ] || { log "Installing:$missing"; opkg update; opkg install $missing; }
    else
        fail "apk or opkg was not found"
    fi
}

stage_file() { fetch "gl-wol-lan/files$1" "$TMP_DIR$1"; }
backup_file() {
    [ ! -e "$1" ] || { mkdir -p "$BACKUP_DIR$(dirname "$1")"; cp -p "$1" "$BACKUP_DIR$1"; }
}
install_file() {
    mkdir -p "$(dirname "$1")"; cp "$TMP_DIR$1" "$1"; chmod "$2" "$1"
}

install_dependencies
for path in \
    /usr/share/oui/menu.d/wol-pc.json \
    /www/views/gl-sdk4-ui-wol-pc.common.js \
    /usr/lib/oui-httpd/rpc/wol_pc \
    /usr/share/rpcd/acl.d/wol-pc.json \
    /etc/config/gl-wol-lan
do
    stage_file "$path"
    backup_file "$path"
done

install_file /usr/share/oui/menu.d/wol-pc.json 0644
install_file /www/views/gl-sdk4-ui-wol-pc.common.js 0644
install_file /usr/lib/oui-httpd/rpc/wol_pc 0644
install_file /usr/share/rpcd/acl.d/wol-pc.json 0644
[ -e /etc/config/gl-wol-lan ] || install_file /etc/config/gl-wol-lan 0644

# Clean up personal defaults accidentally shipped by one short-lived release.
# This migration contains no device names or addresses and runs only once.
if command -v uci >/dev/null 2>&1 && \
   [ "$(uci -q get gl-wol-lan.main.public_defaults_cleanup || true)" != "1" ]; then
    uci -q delete gl-wol-lan.komputer || true
    uci -q delete gl-wol-lan.main.ignore_mac || true
    uci set gl-wol-lan.main.public_defaults_cleanup='1'
    uci commit gl-wol-lan
fi

command -v lua >/dev/null 2>&1 || fail "Lua runtime was not found"
lua -e 'local m=dofile("/usr/lib/oui-httpd/rpc/wol_pc"); local r=m.list(); assert(type(r)=="table" and r.ok==true)' \
    || fail "RPC self-test failed; backup: $BACKUP_DIR"

/etc/init.d/nginx restart
log "Installed successfully"
log "Open: http://192.168.8.1/#/wol-pc"
log "Backup: $BACKUP_DIR"
