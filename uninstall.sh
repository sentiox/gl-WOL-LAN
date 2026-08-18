#!/bin/sh
set -eu
[ "$(id -u)" = "0" ] || { echo "[gl-WOL-LAN] ERROR: run as root" >&2; exit 1; }

rm -f /usr/share/oui/menu.d/wol-pc.json
rm -f /www/views/gl-sdk4-ui-wol-pc.common.js
rm -f /usr/lib/oui-httpd/rpc/wol_pc
rm -f /usr/share/rpcd/acl.d/wol-pc.json

if [ "${1:-}" = "--purge" ]; then
    rm -f /etc/config/gl-wol-lan
    echo "[gl-WOL-LAN] Configuration removed"
else
    echo "[gl-WOL-LAN] Configuration preserved in /etc/config/gl-wol-lan"
fi

/etc/init.d/nginx restart
echo "[gl-WOL-LAN] Uninstalled"
