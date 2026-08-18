# gl-WOL-LAN

Native Wake-on-LAN page for the GL.iNet 4.x admin panel. `Wol-PC` appears under
**Network**, immediately after **Multi-WAN**, and follows the built-in GL.iNet
light and dark themes.

## Features

- discovers wired LAN devices and excludes Wi-Fi clients;
- remembers a custom PC name by MAC address;
- sends a Wake-on-LAN Magic Packet directly from its own RPC backend;
- shows TTL and live download/upload speed;
- responsive desktop and mobile layouts;
- Russian and English UI;
- animated five-second success notifications;
- preserves configuration during updates.

## Compatibility

The installer supports OpenWrt with `apk` or `opkg`. The project was tested on a
GL.iNet GL-MT6000 with GL.iNet UI 4.9.1-op25 and OpenWrt 25.12.5.

## Install or update

Connect to the router over SSH and run:

```sh
sh -c "$(wget -qO- https://raw.githubusercontent.com/sentiox/gl-WOL-LAN/master/install.sh)"
```

Or with curl:

```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/sentiox/gl-WOL-LAN/master/install.sh)"
```

Open `http://<router-LAN-IP>/#/wol-pc`. The installer prints the correct address
for the current router. Running the installer again updates the UI
without removing saved PC names or ignored devices. A timestamped backup is
created under `/root/gl-wol-lan-backup-*`.

## Uninstall

```sh
sh -c "$(wget -qO- https://raw.githubusercontent.com/sentiox/gl-WOL-LAN/master/uninstall.sh)"
```

Configuration is preserved by default. Use `uninstall.sh --purge` to remove it.

## Project layout

- `gl-wol-lan/` — OpenWrt package sources;
- `install.sh` — standalone installer and updater;
- `uninstall.sh` — standalone remover;
- `scripts/` — development deployment and test helpers;

The installer does not download or install `luci-app-wol`, `etherwake`, or any
other package. The web interface, Magic Packet sender, styles and configuration
are the files maintained in this repository. It uses the Lua/Nixio runtime that
is already part of the supported GL.iNet firmware.

## Security

MAC addresses and interface names are validated. RPC commands are argument
quoted. No router password or GitHub credential is stored in this repository.

## License

GPL-2.0-or-later
