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
