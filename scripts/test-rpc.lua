local module = dofile("/usr/lib/oui-httpd/rpc/wol_pc")
local result = module.list()
print("clients", #(result.clients or {}))
for _, client in ipairs(result.clients or {}) do
    print(client.name, client.ip, client.mac, tostring(client.online), client.download, client.upload)
end
