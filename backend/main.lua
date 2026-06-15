local logger = require("logger")
local millennium = require("millennium")

local function on_load()
  logger:info("Xbox 360 Achievement Notifications loaded")

  -- Default config values
  local defaults = {
    soundEnabled = true,
    theme = "xbox360",       -- "xbox360" | "modern" | "minimal"
    position = "bottom-right", -- "bottom-right" | "bottom-center" | "bottom-left"
    duration = 5000,         -- ms before auto-dismiss
    volume = 0.7,
    showDescription = true,
    showGamerScore = true,
  }

  for key, value in pairs(defaults) do
    if millennium.config.get(key) == nil then
      millennium.config.set(key, value)
    end
  end

  millennium.config.on_change(function(key, value)
    logger:info("Config changed: " .. key .. " = " .. tostring(value))
  end)

  millennium.ready()
end

local function on_unload()
  logger:info("Xbox 360 Achievement Notifications unloaded")
end

local function on_frontend_loaded()
  logger:info("Frontend loaded")
end

return {
  on_load = on_load,
  on_unload = on_unload,
  on_frontend_loaded = on_frontend_loaded,
}
