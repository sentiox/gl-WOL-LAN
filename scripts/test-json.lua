for _, name in ipairs({ "luci.jsonc", "jsonc", "cjson.safe", "cjson" }) do
    local ok, module = pcall(require, name)
    print(name, ok, type(module))
end
