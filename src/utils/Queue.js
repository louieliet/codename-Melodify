const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const play = require("play-dl");
const youtubeDl = require("youtube-dl-exec");
const { Innertube, UniversalCache } = require("youtubei.js");
const YTDlpWrap = require("yt-dlp-wrap").default;
const Logger = require("./Logger");
const https = require("https");
const http = require("http");

class Queue {
  constructor(guildId) {
    this.guildId = guildId;
    this.songs = [];
    this.volume = 0.5;
    this.playing = false;
    this.connection = null;
    this.player = createAudioPlayer();
    this.currentSong = null;
    this.ytdlp = new YTDlpWrap();

    // Configurar eventos del reproductor
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.playing = true;
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playing = false;
      this.playNext();
    });

    this.player.on("error", (error) => {
      console.error("Error en el reproductor de audio:", error);
      this.playNext();
    });
  }

  // Función helper para hacer requests HTTP usando módulos nativos
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error! status: ${response.statusCode}`));
          return;
        }
        resolve(response);
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Añadir canción a la cola
  addSong(song) {
    this.songs.push(song);
  }

  // Reproducir la siguiente canción
  async playNext() {
    if (this.songs.length === 0) {
      this.currentSong = null;
      return false;
    }

    const song = this.songs.shift();
    this.currentSong = song;

    console.log("🎵 Intentando reproducir:", song);

    return this.playWithRetry(song, 0);
  }

  // Manejar errores de reproducción con reintentos
  async handlePlaybackError(error, song, retryCount = 0) {
    const maxRetries = 2;
    Logger.logPlaybackError(song, error, retryCount);

    if (retryCount < maxRetries) {
      console.log(`🔄 Reintentando reproducción en 2 segundos...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return this.playWithRetry(song, retryCount + 1);
    } else {
      Logger.error(`Máximo de reintentos alcanzado para: ${song.title}`, error);
      return this.playNext(); // Saltar a la siguiente canción
    }
  }

  // Reproducir con sistema de reintentos
  async playWithRetry(song, retryCount = 0) {
    try {
      // Verificar que la URL no sea undefined
      if (!song.url) {
        throw new Error("URL de la canción es undefined");
      }

      console.log(`🔗 Validando URL (intento ${retryCount + 1}):`, song.url);
      
      // Validar URL con play-dl
      const isValid = await play.validate(song.url);
      console.log("✅ URL válida:", isValid);

      if (!isValid) {
        throw new Error("URL no válida para play-dl");
      }

      // Crear stream con múltiples estrategias
      console.log("🎵 Creando stream con múltiples estrategias...");
      const resource = await this.createStreamResource(song);

      this.player.play(resource);

      if (this.connection) {
        this.connection.subscribe(this.player);
      }

      Logger.logSuccessfulPlayback(song);
      return true;
    } catch (error) {
      return this.handlePlaybackError(error, song, retryCount);
    }
  }

  // Método con múltiples estrategias de streaming mejorado
  async createStreamResource(song) {
    const strategies = [
      {
        name: "yt-dlp-wrap con streams nativos",
        method: async () => {
          console.log("🎵 Intentando con yt-dlp-wrap y streams nativos...");
          
          try {
            // Obtener URL de audio usando yt-dlp
            const audioUrl = await this.ytdlp.execPromise([
              song.url,
              "-f", "bestaudio/best",
              "-g",
              "--no-playlist"
            ]);

            if (!audioUrl || !audioUrl.trim()) {
              throw new Error("No se pudo extraer URL de audio con yt-dlp");
            }

            const url = audioUrl.trim();
            console.log("🔗 URL de audio extraída con yt-dlp:", url.substring(0, 100) + "...");

            // Crear stream usando módulos nativos de Node.js
            const response = await this.makeRequest(url);
            
            return createAudioResource(response, {
              inputType: "arbitrary",
              inlineVolume: true,
            });
          } catch (error) {
            console.error("Error en yt-dlp-wrap:", error.message);
            throw error;
          }
        },
      },
      {
        name: "youtube-dl-exec con streams nativos",
        method: async () => {
          console.log("🎵 Intentando con youtube-dl-exec y streams nativos...");

          try {
            // Obtener información del video
            const info = await youtubeDl(song.url, {
              dumpSingleJson: true,
              noWarnings: true,
              preferFreeFormats: true,
              format: "bestaudio/best",
              extractAudio: true,
              audioFormat: "mp3",
            });

            // Extraer URL de audio
            let audioUrl = null;
            if (info.url) {
              audioUrl = info.url;
            } else if (info.formats && info.formats.length > 0) {
              // Buscar el mejor formato de audio
              const audioFormat =
                info.formats.find((f) => f.acodec && f.acodec !== "none") ||
                info.formats[0];
              audioUrl = audioFormat.url;
            }

            if (!audioUrl) {
              throw new Error("No se pudo extraer URL de audio del video");
            }

            console.log(
              "🔗 URL de audio extraída:",
              audioUrl.substring(0, 100) + "..."
            );

            // Crear stream usando módulos nativos de Node.js
            const response = await this.makeRequest(audioUrl);
            
            return createAudioResource(response, {
              inputType: "arbitrary",
              inlineVolume: true,
            });
          } catch (error) {
            console.error("Error en youtube-dl-exec:", error.message);
            throw error;
          }
        },
      },
      {
        name: "play-dl stream directo",
        method: async () => {
          console.log("🎵 Intentando con play-dl stream directo...");
          
          // Obtener información del video primero
          const videoInfo = await play.video_info(song.url);
          if (!videoInfo) {
            throw new Error("No se pudo obtener información del video");
          }

          // Crear stream desde la información del video
          const streamInfo = await play.stream_from_info(videoInfo, {
            discordPlayerCompatibility: true,
            quality: 2, // Calidad media para mejor compatibilidad
          });
          
          return createAudioResource(streamInfo.stream, {
            inputType: streamInfo.type,
            inlineVolume: true,
          });
        },
      },
      {
        name: "play-dl stream con URL",
        method: async () => {
          console.log("🎵 Intentando con play-dl stream con URL...");
          
          // Intentar stream directo desde URL
          const streamInfo = await play.stream(song.url, {
            discordPlayerCompatibility: true,
            quality: 2,
          });
          
          return createAudioResource(streamInfo.stream, {
            inputType: streamInfo.type,
            inlineVolume: true,
          });
        },
      },
      {
        name: "youtubei.js con streams nativos",
        method: async () => {
          console.log("🎵 Intentando con youtubei.js y streams nativos...");
          
          try {
            const youtube = await Innertube.create({
              cache: new UniversalCache(),
            });
            
            const info = await youtube.getInfo(song.url);

            // Obtener formato de audio
            const format = info.chooseFormat({
              type: "audio",
              quality: "best",
            });

            if (!format || !format.decipher_url) {
              throw new Error("No se pudo obtener formato de audio válido");
            }

            console.log(
              "🔗 URL de youtubei.js extraída:",
              format.decipher_url.substring(0, 100) + "..."
            );

            // Crear stream usando módulos nativos de Node.js
            const response = await this.makeRequest(format.decipher_url);
            
            return createAudioResource(response, {
              inputType: "webm/opus",
              inlineVolume: true,
            });
          } catch (error) {
            console.error("Error en youtubei.js:", error.message);
            throw error;
          }
        },
      },
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🔧 Ejecutando estrategia: ${strategy.name}`);
        const resource = await strategy.method();
        console.log(`✅ Estrategia ${strategy.name} exitosa`);
        Logger.info(`Streaming exitoso con ${strategy.name}`, {
          songUrl: song.url,
        });
        return resource;
      } catch (error) {
        console.error(`❌ Estrategia ${strategy.name} falló:`, error.message);
        Logger.error(`Estrategia ${strategy.name} falló`, error, {
          songUrl: song.url,
        });

        if (strategy === strategies[strategies.length - 1]) {
          throw new Error(
            `Todas las estrategias de streaming fallaron. Último error: ${error.message}`
          );
        }
      }
    }
  }

  // Pausar reproducción
  pause() {
    if (this.playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  // Reanudar reproducción
  resume() {
    if (!this.playing) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  // Parar reproducción y limpiar cola
  stop() {
    this.songs = [];
    this.currentSong = null;
    this.player.stop();
  }

  // Saltar canción actual
  skip() {
    if (this.currentSong) {
      this.player.stop();
      return true;
    }
    return false;
  }

  // Obtener información de la cola
  getQueueInfo() {
    return {
      current: this.currentSong,
      queue: this.songs,
      playing: this.playing,
      length: this.songs.length,
    };
  }

  // Mezclar cola
  shuffle() {
    for (let i = this.songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
    }
  }

  // Limpiar cola
  clear() {
    this.songs = [];
  }

  // Destruir cola
  destroy() {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
    }
  }
}

module.exports = Queue;
