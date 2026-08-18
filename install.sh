#!/bin/sh
set -eu

RELEASE_REF="${GL_WOL_RELEASE_REF:-0e92a4ba284bf1cd9aa0e335514b5b00de332d61}"
BASE_URL="${GL_WOL_BASE_URL:-https://raw.githubusercontent.com/sentiox/gl-WOL-LAN/$RELEASE_REF}"
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

stage_file() { fetch "gl-wol-lan/files$1" "$TMP_DIR$1"; }
backup_file() {
    [ ! -e "$1" ] || { mkdir -p "$BACKUP_DIR$(dirname "$1")"; cp -p "$1" "$BACKUP_DIR$1"; }
}
install_file() {
    mkdir -p "$(dirname "$1")"; cp "$TMP_DIR$1" "$1"; chmod "$2" "$1"
}

for path in \
    /usr/share/oui/menu.d/wol-pc.json \
    /www/views/gl-sdk4-ui-wol-pc.common.js \
    /usr/lib/oui-httpd/rpc/wol_pc \
    /usr/libexec/gl-wol-lan/wol-send \
    /usr/share/rpcd/acl.d/wol-pc.json \
    /etc/config/gl-wol-lan
do
    stage_file "$path"
    backup_file "$path"
done

install_file /usr/share/oui/menu.d/wol-pc.json 0644
install_file /www/views/gl-sdk4-ui-wol-pc.common.js 0644
install_file /usr/lib/oui-httpd/rpc/wol_pc 0644
install_file /usr/libexec/gl-wol-lan/wol-send 0755
install_file /usr/share/rpcd/acl.d/wol-pc.json 0644
[ -e /etc/config/gl-wol-lan ] || install_file /etc/config/gl-wol-lan 0644

# Apply a saved profile only when its actual device is present on this LAN.
# Other routers never receive an offline/foreign device entry.
lan_has_mac() {
    wanted="$1"
    brctl showmacs br-lan 2>/dev/null | grep -qi "$wanted" && return 0
    ip neigh show dev br-lan 2>/dev/null | grep -qi "$wanted" && return 0
    return 1
}

if command -v uci >/dev/null 2>&1; then
    config_changed=0
    if lan_has_mac '60:CF:84:82:93:A5'; then
        uci set gl-wol-lan.komputer=target
        uci set gl-wol-lan.komputer.name='KOMPUTER'
        uci set gl-wol-lan.komputer.mac='60:CF:84:82:93:A5'
        uci set gl-wol-lan.komputer.ttl='128'
        config_changed=1
    elif [ "$(uci -q get gl-wol-lan.komputer.mac || true)" = '60:CF:84:82:93:A5' ]; then
        uci -q delete gl-wol-lan.komputer || true
        config_changed=1
    fi

    if lan_has_mac '80:AF:CA:6D:44:FB'; then
        ignored="$(uci -q get gl-wol-lan.main.ignore_mac || true)"
        case " $ignored " in
            *" 80:AF:CA:6D:44:FB "*) ;;
            *) uci add_list gl-wol-lan.main.ignore_mac='80:AF:CA:6D:44:FB'; config_changed=1 ;;
        esac
    fi
    [ "$config_changed" = 0 ] || uci commit gl-wol-lan
fi

command -v lua >/dev/null 2>&1 || fail "GL.iNet Lua runtime was not found"
lua -e 'local m=dofile("/usr/lib/oui-httpd/rpc/wol_pc"); local r=m.list(); assert(type(r)=="table" and r.ok==true)' \
    || fail "RPC self-test failed; backup: $BACKUP_DIR"

/etc/init.d/nginx restart
LAN_IP="$(uci -q get network.lan.ipaddr || true)"
if [ -z "$LAN_IP" ] && command -v ip >/dev/null 2>&1; then
    LAN_IP="$(ip -4 -o addr show dev br-lan 2>/dev/null | awk 'NR == 1 { print $4 }' | cut -d/ -f1)"
fi
LAN_IP="${LAN_IP%%/*}"
[ -n "$LAN_IP" ] || LAN_IP="router.lan"
log "Installed successfully"
log "Open: http://$LAN_IP/#/wol-pc"
log "Backup: $BACKUP_DIR"
