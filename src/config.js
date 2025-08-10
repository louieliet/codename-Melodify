module.exports = {
  // Configuración del bot
  bot: {
    name: "Melodify",
    version: "1.0.0",
    description: "Bot de música para Discord",
    emoji: "🎵",
  },

  // Configuración de música
  music: {
    maxQueueSize: 50,
    defaultVolume: 0.5,
    maxSongDuration: 3600, // 1 hora en segundos
    searchLimit: 5,
    songsPerPage: 10,
    // Audio advanced (calidad/estabilidad)
    audio: {
      highWaterMark: parseInt(process.env.AUDIO_HIGH_WATER_MARK || `${1 << 25}`, 10), // 32MB
      targetBitrateKbps: parseInt(process.env.AUDIO_TARGET_BITRATE || "128", 10),
      forceTranscode: process.env.AUDIO_FORCE_TRANSCODE === "true", // forzar re-encode (debug)
      enableNormalize: process.env.AUDIO_ENABLE_NORMALIZE === "true", // normalización loudness
      inputReconnect: process.env.AUDIO_INPUT_RECONNECT !== "false", // reconexiones HTTP
    },
  },

  // Colores para embeds
  colors: {
    primary: "#ff6b6b",
    success: "#2ed573",
    warning: "#ffa502",
    error: "#ff4757",
    info: "#4ecdc4",
  },

  // Emojis
  emojis: {
    play: "▶️",
    pause: "⏸️",
    stop: "⏹️",
    skip: "⏭️",
    queue: "📋",
    music: "🎵",
    volume: "🔊",
    loading: "⏳",
    success: "✅",
    error: "❌",
    warning: "⚠️",
  },
};
