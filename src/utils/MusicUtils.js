const play = require("play-dl");

class MusicUtils {
  // Inicializar play-dl para evitar límites de API
  static async initialize() {
    try {
      await play.getFreeClientID();
      console.log("✅ play-dl inicializado correctamente");
    } catch {
      console.warn(
        "⚠️ No se pudo inicializar play-dl, algunas funcionalidades pueden fallar"
      );
    }
  }

  // Formatear duración en segundos a MM:SS
  static formatDuration(seconds) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Buscar y obtener información de un video (URL o búsqueda)
  static async getYouTubeInfo(input) {
    try {
      console.log("🔍 Obteniendo info para:", input);

      let videoInfo;

      // Si es una URL directa, usar video_info
      if (this.isYouTubeURL(input)) {
        try {
          console.log("🔗 Detectada URL de YouTube, usando video_info...");
          videoInfo = await play.video_info(input);
          
          if (!videoInfo || !videoInfo.video_details) {
            throw new Error("No se pudo obtener información del video");
          }

          const video = videoInfo.video_details;
          
          const result = {
            title: video.title || "Título desconocido",
            url: video.url || input,
            duration: this.formatDuration(video.durationInSec),
            thumbnail: video.thumbnails?.[0]?.url || null,
            author: video.channel?.name || "Desconocido",
            views: video.views?.toLocaleString() || "0",
          };

          console.log("✅ Info obtenida con video_info:", result);
          console.log("🔗 URL para streaming:", result.url);

          return result;
        } catch (error) {
          console.warn("⚠️ video_info falló, intentando con search...", error.message);
        }
      }

      // Usar play.search como fallback o para búsquedas
      console.log("🔍 Usando search como método alternativo...");
      const results = await play.search(input, {
        limit: 1,
        source: { youtube: "video" },
      });

      if (!results.length) throw new Error("No se encontraron resultados");

      const video = results[0];

      // Validar que tenemos una URL válida
      if (!video.url) {
        throw new Error("No se pudo obtener URL del video");
      }

      const result = {
        title: video.title || "Título desconocido",
        url: video.url,
        duration: this.formatDuration(video.durationInSec),
        thumbnail: video.thumbnails?.[0]?.url || null,
        author: video.channel?.name || "Desconocido",
        views: video.views?.toLocaleString() || "0",
      };

      console.log("✅ Info obtenida con search:", result);
      console.log("🔗 URL para streaming:", result.url);

      return result;
    } catch (error) {
      console.error("Error obteniendo info de YouTube:", error);
      throw new Error("No se pudo obtener información del video");
    }
  }

  // Buscar múltiples resultados de video por texto
  static async searchYouTube(query, limit = 5) {
    try {
      const results = await play.search(query, {
        limit,
        source: { youtube: "video" },
      });
      return results.map((video) => ({
        title: video.title,
        url: video.url,
        duration: this.formatDuration(video.durationInSec),
        thumbnail: video.thumbnails?.[0]?.url || null,
        author: video.channel?.name || "Desconocido",
        views: video.views?.toLocaleString() || "0",
      }));
    } catch (error) {
      console.error("Error buscando en YouTube:", error);
      throw new Error("Error al buscar música");
    }
  }

  // Validar si el bot puede unirse a un canal de voz
  static canJoinVoiceChannel(member, botMember) {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel)
      return { canJoin: false, reason: "Debes estar en un canal de voz" };
    const perms = voiceChannel.permissionsFor(botMember);
    if (!perms.has("Connect"))
      return { canJoin: false, reason: "No tengo permiso para conectarme" };
    if (!perms.has("Speak"))
      return { canJoin: false, reason: "No tengo permiso para hablar" };
    return { canJoin: true, channel: voiceChannel };
  }

  // Crear embed para canción
  static createSongEmbed(song, type = "playing") {
    const { EmbedBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
      .setColor(type === "playing" ? "#2ed573" : "#4ecdc4")
      .setTitle(
        type === "playing" ? "🎵 Reproduciendo ahora" : "➕ Añadido a la cola"
      )
      .setDescription(`**${song.title}**`)
      .addFields(
        { name: "👤 Autor", value: song.author, inline: true },
        { name: "⏱️ Duración", value: song.duration, inline: true },
        { name: "👁️ Vistas", value: song.views, inline: true }
      )
      .setTimestamp();
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    return embed;
  }

  // Crear embed para la cola de reproducción
  static createQueueEmbed(queue, currentPage = 1, songsPerPage = 10) {
    const { EmbedBuilder } = require("discord.js");
    const { current, queue: songs } = queue.getQueueInfo();
    const totalPages = Math.ceil(songs.length / songsPerPage);
    const embed = new EmbedBuilder()
      .setColor("#4ecdc4")
      .setTitle("🎵 Cola de reproducción")
      .setTimestamp();
    if (current) {
      embed.addFields({
        name: "Reproduciendo ahora",
        value: `**${current.title}** - ${current.author} (${current.duration})`,
      });
    }
    if (!songs.length) {
      embed.setDescription("La cola está vacía. ¡Añade canciones!");
    } else {
      const start = (currentPage - 1) * songsPerPage;
      const list = songs
        .slice(start, start + songsPerPage)
        .map(
          (s, i) =>
            `${start + i + 1}. **${s.title}** - ${s.author} (${s.duration})`
        )
        .join("\n");
      embed.setDescription(list);
      const footer =
        totalPages > 1
          ? `Página ${currentPage}/${totalPages} • Total: ${songs.length}`
          : `Total: ${songs.length}`;
      embed.setFooter({ text: footer });
    }
    return embed;
  }

  // Validar si una cadena es una URL válida
  static isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // Verificar si es una URL de YouTube
  static isYouTubeURL(url) {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)/;
    return youtubeRegex.test(url);
  }

  // Wrapper para manejo centralizado de errores de play-dl
  static async safePlayDlCall(operation, operationName, input) {
    try {
      console.log(`🔧 Ejecutando ${operationName} para:`, input);
      const result = await operation();
      console.log(`✅ ${operationName} exitoso`);
      return result;
    } catch (error) {
      console.error(`❌ Error en ${operationName}:`, error.message);
      throw new Error(`Fallo en ${operationName}: ${error.message}`);
    }
  }

  // Validar URL de YouTube mejorada
  static async validateYouTubeURL(url) {
    if (!this.isYouTubeURL(url)) {
      throw new Error("No es una URL válida de YouTube");
    }

    const validationResult = await play.validate(url);
    if (!validationResult || validationResult === false) {
      throw new Error("URL de YouTube no válida para reproducción");
    }

    return validationResult;
  }
}

module.exports = MusicUtils;
