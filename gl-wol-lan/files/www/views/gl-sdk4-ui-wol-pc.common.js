({
  name: "wol-pc",
  data: function () {
    return {
      loading: true,
      busy: "",
      error: "",
      notice: "",
      targets: [],
      clients: [],
      trafficTimer: null,
      noticeTimer: null,
      editorOpen: false,
      editingId: "",
      form: { name: "", mac: "" }
    };
  },
  created: function () {
    var self = this;
    this.refresh();
    this.trafficTimer = setInterval(function () { self.refresh(true); }, 3000);
  },
  beforeDestroy: function () {
    if (this.trafficTimer) clearInterval(this.trafficTimer);
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  },
  watch: {
    notice: function (value) {
      var self = this;
      if (this.noticeTimer) clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
      if (value) {
        this.noticeTimer = setTimeout(function () {
          self.notice = "";
          self.noticeTimer = null;
        }, 5000);
      }
    }
  },
  methods: {
    t: function (ru, en) {
      var lang = ((document.documentElement && document.documentElement.getAttribute("lang")) ||
        (typeof navigator !== "undefined" && navigator.language) || "").toLowerCase();
      return lang.indexOf("ru") === 0 ? ru : en;
    },
    api: function (method, params) {
      if (!window.$request) return Promise.reject(new Error("GL request API is unavailable"));
      return window.$request("call", ["sid", "wol_pc", method, params || {}], { timeout: 30000, isCancel: false });
    },
    refresh: function (silent) {
      var self = this;
      if (!silent) self.loading = true;
      self.error = "";
      return self.api("list").then(function (res) {
        self.targets = Array.isArray(res && res.targets) ? res.targets : [];
        self.clients = Array.isArray(res && res.clients) ? res.clients : [];
      }).catch(function (err) {
        self.error = err && err.message ? err.message : String(err);
      }).then(function () { if (!silent) self.loading = false; });
    },
    formatRate: function (value) {
      var bytes = Math.max(0, Number(value || 0));
      if (bytes >= 125000) return (bytes * 8 / 1000000).toFixed(bytes >= 1250000 ? 1 : 2) + " Мбит/с";
      if (bytes >= 125) return (bytes * 8 / 1000).toFixed(bytes >= 12500 ? 0 : 1) + " Кбит/с";
      return Math.round(bytes) + " Б/с";
    },
    openAdd: function () {
      this.editingId = "";
      this.form = { name: "", mac: "" };
      this.editorOpen = true;
      this.error = "";
    },
    openEdit: function (target) {
      this.editingId = target.id;
      this.form = { name: target.name, mac: target.mac };
      this.editorOpen = true;
      this.error = "";
    },
    normalizeMac: function () {
      var raw = String(this.form.mac || "").replace(/[^0-9a-f]/gi, "").slice(0, 12).toUpperCase();
      this.form.mac = raw.match(/.{1,2}/g) ? raw.match(/.{1,2}/g).join(":") : raw;
    },
    save: function () {
      var self = this;
      self.normalizeMac();
      if (!self.form.name.trim()) { self.error = self.t("Укажите название компьютера.", "Enter a computer name."); return; }
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(self.form.mac)) { self.error = self.t("Проверьте MAC-адрес.", "Check the MAC address."); return; }
      self.busy = "save";
      self.error = "";
      self.api("save", { id: self.editingId, name: self.form.name.trim(), mac: self.form.mac }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "save_failed");
        self.editorOpen = false;
        self.notice = self.t("Устройство сохранено", "Device saved");
        return self.refresh();
      }).catch(function (err) { self.error = err.message || String(err); }).then(function () { self.busy = ""; });
    },
    removeTarget: function (target) {
      var self = this;
      if (!window.confirm(self.t("Удалить «" + target.name + "»?", "Delete “" + target.name + "”?"))) return;
      self.busy = target.id;
      self.api("remove", { id: target.id }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "remove_failed");
        self.notice = self.t("Устройство удалено", "Device removed");
        return self.refresh();
      }).catch(function (err) { self.error = err.message || String(err); }).then(function () { self.busy = ""; });
    },
    wake: function (target) {
      var self = this;
      self.busy = target.id;
      self.error = "";
      self.api("wake", { mac: target.mac }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.output) || (res && res.error) || "wake_failed");
        self.notice = self.t("Magic Packet отправлен на " + target.name, "Magic Packet sent to " + target.name);
      }).catch(function (err) { self.error = err.message || String(err); }).then(function () { self.busy = ""; });
    }
  },
  render: function (h) {
    var self = this;
    var button = function (label, cls, action, disabled) {
      var nativeClass = cls === "primary" ? "gl-btn primary-type oval-round is-none btn" :
        cls === "secondary" ? "gl-btn default-type oval-round is-none btn" : "wpc-delete";
      return h("button", { staticClass: nativeClass, attrs: { disabled: disabled }, on: { click: action } }, [label]);
    };
    var knownMacs = {};
    var savedByMac = {};
    self.targets.forEach(function (target) {
      savedByMac[String(target.mac || "").toUpperCase()] = target;
    });
    var visibleItems = self.clients.map(function (item) {
      var macKey = String(item.mac || "").toUpperCase();
      var saved = savedByMac[macKey];
      var portName = String(item.port || "LAN").toUpperCase();
      knownMacs[macKey] = true;
      return { id: "client-" + item.mac, savedId: saved ? saved.id : "", name: saved ? saved.name : (item.name || self.t("Неизвестное устройство", "Unknown device")), mac: item.mac, ip: item.ip || "", port: portName, ttl: saved && saved.ttl ? saved.ttl : Number(item.ttl || 0), download: Number(item.download || 0), upload: Number(item.upload || 0), online: !!item.online, discovered: true };
    }).concat(self.targets.filter(function (item) {
      return !knownMacs[String(item.mac || "").toUpperCase()];
    }).map(function (item) {
      return { id: item.id, name: item.name, mac: item.mac, ip: "", online: false, discovered: false };
    }));
    var cards = visibleItems.map(function (item) {
      return h("section", { staticClass: "wpc-device", key: item.id }, [
        h("div", { staticClass: "wpc-device-icon" }, [h("span", "⚡")]),
        h("div", { staticClass: "wpc-device-info" }, [
          h("div", { staticClass: "wpc-device-name" }, [h("strong", item.name), item.discovered ? h("i", { staticClass: item.online ? "online" : "offline" }, item.online ? self.t("В сети", "Online") : self.t("Известное устройство", "Known device")) : null]),
          h("span", (item.port ? item.port.toUpperCase() + "  ·  " : "") + (item.ip ? item.ip + "  ·  " : "") + item.mac + (item.ttl ? "  ·  TTL " + item.ttl : ""))
        ]),
        item.discovered ? h("div", { staticClass: "wpc-traffic" }, [
          h("strong", { staticClass: "wpc-speed-title" }, self.t("Скорость", "Speed")),
          h("div", { staticClass: "wpc-rates" }, [h("span", { staticClass: "download" }, "↓ " + self.formatRate(item.download)), h("span", { staticClass: "upload" }, "↑ " + self.formatRate(item.upload))])
        ]) : null,
        h("div", { staticClass: "wpc-device-actions" }, [
          button(item.discovered ? self.t("Имя", "Name") : self.t("Изменить", "Edit"), "secondary", function () { self.openEdit({ id: item.savedId || item.id, name: item.name, mac: item.mac }); }, !!self.busy),
          button(self.busy === item.id ? "…" : self.t("Разбудить", "Wake"), "primary", function () { self.wake(item); }, !!self.busy)
        ])
      ]);
    });
    if (!cards.length && !self.loading) cards.push(h("div", { staticClass: "wpc-empty" }, [
      h("div", { staticClass: "wpc-empty-icon" }, "◉"),
      h("strong", self.t("Компьютеры пока не добавлены", "No computers added yet")),
      h("p", self.t("Добавьте MAC-адрес устройства, которое поддерживает Wake-on-LAN.", "Add the MAC address of a Wake-on-LAN capable device."))
    ]));
    var modal = self.editorOpen ? h("div", { staticClass: "wpc-overlay", on: { click: function (event) { if (event.target === event.currentTarget) self.editorOpen = false; } } }, [
      h("div", { staticClass: "wpc-modal" }, [
        h("div", { staticClass: "wpc-modal-head" }, [h("h3", self.editingId ? self.t("Изменить устройство", "Edit device") : self.t("Новое устройство", "New device")), h("button", { on: { click: function () { self.editorOpen = false; } } }, "×")]),
        h("label", [h("span", self.t("Название", "Name")), h("div", { staticClass: "el-input" }, [h("input", { staticClass: "el-input__inner", attrs: { placeholder: "Wol-PC" }, domProps: { value: self.form.name }, on: { input: function (e) { self.form.name = e.target.value; } } })])]),
        h("label", [h("span", "MAC"), h("div", { staticClass: "el-input" }, [h("input", { staticClass: "el-input__inner", attrs: { placeholder: "AA:BB:CC:DD:EE:FF", maxlength: 17 }, domProps: { value: self.form.mac }, on: { input: function (e) { self.form.mac = e.target.value; self.normalizeMac(); } } })])]),
        h("div", { staticClass: "wpc-modal-actions" }, [button(self.t("Отмена", "Cancel"), "secondary", function () { self.editorOpen = false; }, false), button(self.busy === "save" ? "…" : self.t("Сохранить", "Save"), "primary", self.save, !!self.busy)])
      ])
    ]) : null;
    return h("div", { staticClass: "wpc-page" }, [
      h("style", `.wpc-page{padding:20px 0 40px;font-size:14px}.wpc-title{margin:0 16px 20px;font-size:24px;font-weight:600}.wpc-card{margin-top:0;border-radius:5px;background:#fff;box-shadow:2px 6px 16px 6px #d2d2d6;overflow:hidden}.wpc-card>.header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#f2f2f7}.wpc-card-title{font-size:16px}.wpc-card-body{padding:20px}.wpc-description{margin:0 0 18px;line-height:22px;color:#606266}.wpc-page .gl-btn{display:inline-flex;align-items:center;justify-content:center;min-height:36px;margin:0 4px;padding:8px 22px;border:0;border-radius:20px;font-size:14px;font-weight:400;cursor:pointer}.wpc-page .gl-btn.primary-type{background:#5272f7;color:#fff}.wpc-page .gl-btn.default-type{background:#fff;color:#5272f7;border:1px solid #5272f7}.wpc-delete{border:0;background:transparent;color:#e65b5b;padding:7px 6px;cursor:pointer}.wpc-delete:disabled,.gl-btn:disabled{opacity:.5}.wpc-device{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid rgba(127,127,127,.18)}.wpc-device:last-child{border-bottom:0}.wpc-device-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:rgba(82,114,247,.12);color:#5272f7;font-size:18px}.wpc-device-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.wpc-device-name{display:flex;align-items:center;gap:9px}.wpc-device-info strong{font-size:14px;font-weight:400}.wpc-device-info i{padding:2px 7px;border-radius:10px;background:rgba(144,147,153,.14);color:#909399;font-size:11px;font-style:normal}.wpc-device-info i.online{background:rgba(20,180,116,.14);color:#13aa70}.wpc-device-info span{font-family:monospace;color:#909399}.wpc-device-actions{display:flex;align-items:center;gap:4px}.wpc-empty{text-align:center;padding:48px 20px}.wpc-empty-icon{font-size:32px;color:#5272f7;margin-bottom:12px}.wpc-empty strong{display:block;font-weight:400;margin-bottom:8px}.wpc-empty p{margin:0;color:#909399}.wpc-alert{margin:0 0 14px;padding:12px 15px;border-radius:5px}.wpc-alert.ok{background:rgba(21,175,115,.12);color:#10a46c}.wpc-alert.err{background:rgba(225,70,70,.11);color:#df5656}.wpc-overlay{position:fixed;z-index:3000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.56)}.wpc-modal{width:min(460px,100%);padding:0 20px 20px;border-radius:5px;background:#fff;box-shadow:2px 6px 16px 6px rgba(0,0,0,.2)}.wpc-modal-head{display:flex;align-items:center;justify-content:space-between;height:54px;margin-bottom:10px;border-bottom:1px solid rgba(127,127,127,.18)}.wpc-modal-head h3{margin:0;font-size:16px;font-weight:400}.wpc-modal-head button{border:0;background:none;color:inherit;font-size:23px;cursor:pointer}.wpc-modal label{display:block;margin:15px 0}.wpc-modal label>span{display:block;margin-bottom:8px}.wpc-modal .el-input{width:100%}.wpc-modal-actions{display:flex;justify-content:flex-end;gap:4px;margin-top:22px}html:has(#theme-dark:not([disabled])) .wpc-page{color:#f0f0f5}html:has(#theme-dark:not([disabled])) .wpc-title{color:#f0f0f5}html:has(#theme-dark:not([disabled])) .wpc-card{background:#121225;color:#f0f0f5;box-shadow:2px 6px 16px 6px rgba(0,0,0,.36)}html:has(#theme-dark:not([disabled])) .wpc-card>.header{background:#202047;color:#fff}html:has(#theme-dark:not([disabled])) .wpc-description{color:#bfc2d8}html:has(#theme-dark:not([disabled])) .wpc-empty strong{color:#f0f0f5}html:has(#theme-dark:not([disabled])) .wpc-empty p,html:has(#theme-dark:not([disabled])) .wpc-device-info span{color:#aeb2ca}html:has(#theme-dark:not([disabled])) .wpc-device{border-color:#303047}html:has(#theme-dark:not([disabled])) .wpc-modal{background:#121225;color:#f0f0f5}html:has(#theme-dark:not([disabled])) .wpc-modal-head{border-color:#303047}html:has(#theme-dark:not([disabled])) .wpc-modal .el-input__inner{background:#15152a;border-color:#65657a;color:#f0f0f5}html:has(#theme-dark:not([disabled])) .wpc-page .gl-btn.default-type{background:#121225}@media(max-width:700px){.wpc-title{font-size:20px}.wpc-card>.header{padding:0 14px}.wpc-card-body{padding:14px}.wpc-device{align-items:flex-start;flex-wrap:wrap}.wpc-device-actions{width:100%;justify-content:flex-end}.wpc-device-actions .default-type{margin-right:auto}}`),
      h("style", `.wpc-traffic{width:145px;margin:0 14px;padding-left:16px;border-left:1px solid rgba(127,127,127,.2)}.wpc-speed-title{display:block;margin-bottom:6px;font-size:12px;font-weight:600}.wpc-rates{display:flex;flex-direction:column;gap:3px;font-family:monospace;font-size:12px}.wpc-rates .download{color:#7f92ff}.wpc-rates .upload{color:#13c184}.wpc-alert.ok{position:relative;overflow:hidden;animation:wpcToastLife 5s ease forwards}.wpc-alert.ok:after{content:"";position:absolute;left:0;bottom:0;height:3px;width:100%;background:#13aa70;transform-origin:left;animation:wpcToastProgress 5s linear forwards}@keyframes wpcToastProgress{from{transform:scaleX(1)}to{transform:scaleX(0)}}@keyframes wpcToastLife{0%,88%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}@media(max-width:850px){.wpc-traffic{order:4;width:100%;margin:10px 0;padding:10px 0 0;border-left:0;border-top:1px solid rgba(127,127,127,.2)}.wpc-device{flex-wrap:wrap}}`),
      h("style", `@media(max-width:600px){.wpc-page{padding-top:14px}.wpc-title{margin:0 12px 14px;font-size:21px}.wpc-card>.header{height:auto;min-height:54px;flex-wrap:wrap;gap:10px;padding:13px 14px}.wpc-card-title{width:100%;font-size:16px}.wpc-header-actions{display:grid;width:100%;grid-template-columns:1fr 1fr;gap:8px}.wpc-header-actions .gl-btn{width:100%;min-width:0;margin:0;padding:8px 10px}.wpc-card-body{padding:14px}.wpc-description{font-size:13px;line-height:20px}.wpc-device{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:16px 0}.wpc-device-icon{grid-column:1;grid-row:1}.wpc-device-info{grid-column:2;grid-row:1}.wpc-device-info span{white-space:normal;overflow-wrap:anywhere;line-height:18px}.wpc-traffic{grid-column:1/-1;grid-row:2;width:auto;margin:2px 0 0;padding:10px 0 0;border-left:0;border-top:1px solid rgba(127,127,127,.2)}.wpc-rates{display:grid;grid-template-columns:1fr 1fr;font-size:13px}.wpc-device-actions{grid-column:1/-1;grid-row:3;display:grid;grid-template-columns:1fr 1fr;width:100%;gap:8px}.wpc-device-actions .gl-btn{width:100%;margin:0;padding:9px 12px}.wpc-modal{padding:0 14px 16px}.wpc-modal-actions{display:grid;grid-template-columns:1fr 1fr}.wpc-modal-actions .gl-btn{width:100%;margin:0}}`),
      h("div", { staticClass: "wpc-title" }, "Wol-PC"),
      self.notice ? h("div", { staticClass: "wpc-alert ok" }, self.notice) : null,
      self.error ? h("div", { staticClass: "wpc-alert err" }, self.error) : null,
      h("section", { staticClass: "gl-card-wrapper wpc-card" }, [
        h("div", { staticClass: "header" }, [h("span", { staticClass: "wpc-card-title" }, self.t("Устройства LAN", "LAN devices")), h("div", { staticClass: "wpc-header-actions" }, [button(self.loading ? "…" : self.t("Обновить", "Refresh"), "primary", self.refresh, self.loading), button(self.t("Ввести MAC", "Enter MAC"), "secondary", self.openAdd, false)])]),
        h("div", { staticClass: "wpc-card-body" }, [h("p", { staticClass: "wpc-description" }, self.t("Показываются только проводные устройства на LAN-портах. Wi-Fi-клиенты исключены.", "Only wired devices on LAN ports are shown. Wi-Fi clients are excluded.")), self.loading ? h("div", { staticClass: "wpc-empty" }, self.t("Поиск устройств LAN…", "Discovering LAN devices…")) : cards])
      ]),
      modal
    ]);
  }
})
