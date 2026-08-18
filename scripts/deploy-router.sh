#!/bin/sh
set -eu

stage=/tmp/gl-wol-lan-stage
test -f "$stage/www/views/gl-sdk4-ui-wol-pc.common.js"

backup="/root/gl-wol-lan-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup" /usr/share/oui/menu.d /www/views \
    /usr/lib/oui-httpd/rpc /usr/share/rpcd/acl.d /etc/config

backup_file() {
    path="$1"
    if [ -e "$path" ]; then
        mkdir -p "$backup$(dirname "$path")"
        cp -p "$path" "$backup$path"
    fi
}

backup_file /usr/share/oui/menu.d/wol-pc.json
backup_file /www/views/gl-sdk4-ui-wol-pc.common.js
backup_file /usr/lib/oui-httpd/rpc/wol_pc
backup_file /usr/share/rpcd/acl.d/wol-pc.json
backup_file /etc/config/gl-wol-lan

cp "$stage/usr/share/oui/menu.d/wol-pc.json" /usr/share/oui/menu.d/wol-pc.json
cp "$stage/www/views/gl-sdk4-ui-wol-pc.common.js" /www/views/gl-sdk4-ui-wol-pc.common.js
cp "$stage/usr/lib/oui-httpd/rpc/wol_pc" /usr/lib/oui-httpd/rpc/wol_pc
cp "$stage/usr/share/rpcd/acl.d/wol-pc.json" /usr/share/rpcd/acl.d/wol-pc.json
[ -e /etc/config/gl-wol-lan ] || cp "$stage/etc/config/gl-wol-lan" /etc/config/gl-wol-lan

chmod 0644 /usr/share/oui/menu.d/wol-pc.json \
    /www/views/gl-sdk4-ui-wol-pc.common.js \
    /usr/lib/oui-httpd/rpc/wol_pc \
    /usr/share/rpcd/acl.d/wol-pc.json \
    /etc/config/gl-wol-lan

/etc/init.d/rpcd restart
/etc/init.d/nginx reload

echo "INSTALLED backup=$backup"
ls -l /usr/share/oui/menu.d/wol-pc.json \
    /www/views/gl-sdk4-ui-wol-pc.common.js \
    /usr/lib/oui-httpd/rpc/wol_pc \
    /etc/config/gl-wol-lan
