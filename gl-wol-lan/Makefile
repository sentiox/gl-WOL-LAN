include $(TOPDIR)/rules.mk

PKG_NAME:=gl-wol-lan
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_MAINTAINER:=sentiox
PKG_LICENSE:=GPL-2.0-or-later

include $(INCLUDE_DIR)/package.mk

define Package/gl-wol-lan
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Wol-PC for the native GL.iNet UI
endef

define Package/gl-wol-lan/description
  Native GL.iNet Wake-on-LAN interface shown under Network as Wol-PC.
endef

define Package/gl-wol-lan/conffiles
/etc/config/gl-wol-lan
endef

define Package/gl-wol-lan/install
	$(INSTALL_DIR) $(1)/usr/share/oui/menu.d
	$(INSTALL_CONF) ./files/usr/share/oui/menu.d/wol-pc.json $(1)/usr/share/oui/menu.d/wol-pc.json
	$(INSTALL_DIR) $(1)/www/views
	$(INSTALL_DATA) ./files/www/views/gl-sdk4-ui-wol-pc.common.js $(1)/www/views/gl-sdk4-ui-wol-pc.common.js
	$(INSTALL_DIR) $(1)/usr/lib/oui-httpd/rpc
	$(INSTALL_DATA) ./files/usr/lib/oui-httpd/rpc/wol_pc $(1)/usr/lib/oui-httpd/rpc/wol_pc
	$(INSTALL_DIR) $(1)/usr/libexec/gl-wol-lan
	$(INSTALL_BIN) ./files/usr/libexec/gl-wol-lan/wol-send $(1)/usr/libexec/gl-wol-lan/wol-send
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_CONF) ./files/usr/share/rpcd/acl.d/wol-pc.json $(1)/usr/share/rpcd/acl.d/wol-pc.json
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/gl-wol-lan $(1)/etc/config/gl-wol-lan
endef

define Package/gl-wol-lan/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] && exit 0
/etc/init.d/rpcd restart >/dev/null 2>&1 || true
/etc/init.d/nginx reload >/dev/null 2>&1 || true
exit 0
endef

$(eval $(call BuildPackage,gl-wol-lan))
