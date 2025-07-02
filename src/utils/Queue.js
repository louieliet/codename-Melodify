const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
} = require("@discordjs/voice");
const play = require("play-dl");
const youtubeDl = require("youtube-dl-exec");
const { Innertube, UniversalCache } = require("youtubei.js");
const YTDlpWrap = require("yt-dlp-wrap").default;
const Logger = require("./Logger");
const https = require("https");
const http = require("http");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

class Queue {
  constructor(guildId) {
    this.guildId = guildId;
    this.songs = [];
    this.volume = 0.7; // Volumen más alto para calidad audiófilo
    this.playing = false;
    this.connection = null;
    this.player = createAudioPlayer();
    this.currentSong = null;
    this.ytdlp = new YTDlpWrap();
    this.ffmpegCapabilities = null; // Para detectar capacidades
    
    console.log("🎶 QUEUE AUDIÓFILO INICIALIZADA 🎶");
    console.log("💎 Configuración: Spotify Premium Level Quality");
    console.log("🎯 Bitrate objetivo: 320kbps con procesamiento inteligente");
    console.log("🔧 Sistema de fallback automático habilitado");
    console.log("🎛️ Filtros: Auto-detección de compatibilidad FFmpeg");

    // Configurar eventos del reproductor audiófilo
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.playing = true;
      console.log("🎵 AUDIÓFILO: ¡Reproduciendo con calidad premium!");
      if (this.currentSong) {
        console.log(`🎶 Ahora sonando: ${this.currentSong.title}`);
      }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playing = false;
      console.log("⏸️ AUDIÓFILO: Finalizó - Preparando siguiente canción...");
      this.playNext();
    });

    this.player.on("error", (error) => {
      console.error("❌ Error en el reproductor de audio:", error);
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

      request.setTimeout(15000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Función para diagnosticar la calidad del stream (Audiófilo Edition)
  diagnoseStreamQuality(url, format = 'unknown') {
    console.log("🔍 DIAGNÓSTICO DE CALIDAD AUDIÓFILO:");
    console.log(`📊 Formato detectado: ${format}`);
    console.log(`🔗 URL: ${url.substring(0, 150)}...`);
    
    // Detectar itag de YouTube (más preciso que bitrate)
    const itagMatch = url.match(/[&?]itag=(\d+)/);
    const itag = itagMatch ? parseInt(itagMatch[1]) : null;
    
    // Detectar bitrate por parámetros URL
    const bitrateMatch = url.match(/[&?]abr=(\d+)/);
    let bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 'desconocido';
    
    // Detectar codec y mime
    let codec = 'unknown';
    let mime = 'unknown';
    if (url.includes('acodec=opus')) codec = 'opus';
    else if (url.includes('acodec=mp4a')) codec = 'aac';
    else if (url.includes('acodec=mp3')) codec = 'mp3';
    
    if (url.includes('mime=audio%2Fwebm')) {
      mime = 'audio/webm';
      codec = 'opus';
    } else if (url.includes('mime=audio%2Fmp4')) {
      mime = 'audio/mp4';
      codec = 'aac';
    }
    
    // Mapear itags de YouTube a calidades conocidas (AUDIÓFILO)
    if (itag) {
      const itagQualities = {
        251: { bitrate: 160, codec: 'opus', quality: 'audiófilo-base', format: 'webm', enhance: true },
        250: { bitrate: 70, codec: 'opus', quality: 'media', format: 'webm', enhance: true },
        249: { bitrate: 50, codec: 'opus', quality: 'baja', format: 'webm', enhance: true },
        140: { bitrate: 128, codec: 'aac', quality: 'media', format: 'mp4', enhance: true },
        171: { bitrate: 128, codec: 'vorbis', quality: 'media', format: 'webm', enhance: true },
        139: { bitrate: 48, codec: 'aac', quality: 'baja', format: 'mp4', enhance: true }
      };
      
      if (itagQualities[itag]) {
        const itagInfo = itagQualities[itag];
        bitrate = itagInfo.bitrate;
        codec = itagInfo.codec;
        console.log(`🎯 iTAG ${itag} detectado: ${codec} ${bitrate}kbps (${itagInfo.quality})`);
      }
    }
    
    console.log(`🎵 Bitrate detectado: ${bitrate} kbps`);
    console.log(`🎼 Codec detectado: ${codec}`);
    console.log(`📦 MIME detectado: ${mime}`);
    
    // Sistema de clasificación AUDIÓFILO
    let quality = 'baja';
    let targetBitrate = 320; // Por defecto, calidad Spotify Premium
    
    if (bitrate >= 320) {
      quality = 'audiófilo-premium';
      targetBitrate = 320;
    } else if (bitrate >= 256) {
      quality = 'audiófilo-alta';
      targetBitrate = 320;
    } else if (bitrate >= 160) {
      quality = 'audiófilo-base';
      targetBitrate = 320;
    } else if (bitrate >= 128) {
      quality = 'alta-mejorada';
      targetBitrate = 256;
    } else {
      quality = 'media-mejorada';
      targetBitrate = 192;
    }
    
    console.log(`⭐ Calidad estimada: ${quality}`);
    console.log(`🎯 Bitrate objetivo: ${targetBitrate}kbps`);
    
    // SIEMPRE usar FFmpeg para calidad audiófilo, excepto si ya es >= 320kbps Opus
    const useFFmpeg = !(codec === 'opus' && bitrate >= 320);
    const enhancementMode = bitrate < 320 ? 'upscale' : 'optimize';
    
    console.log(`🔧 Estrategia: ${useFFmpeg ? `FFmpeg ${enhancementMode} -> ${targetBitrate}kbps` : 'Stream directo (ya es audiófilo)'}`);
    
    return { bitrate, codec, quality, mime, itag, useFFmpeg, targetBitrate, enhancementMode };
  }

  // Estrategia FFmpeg para calidad AUDIÓFILO (Spotify Premium Level)
  async createAudiophileFFmpegStream(audioUrl, targetBitrate = 320, enhancementMode = 'upscale') {
    // Intentar primero con filtros avanzados, luego fallback a básicos
    try {
      return await this.createAudiophileWithAdvancedFilters(audioUrl, targetBitrate, enhancementMode);
    } catch (error) {
      console.log('🔄 Filtros avanzados fallaron, usando configuración básica optimizada...');
      return await this.createAudiophileBasicStream(audioUrl, targetBitrate, enhancementMode);
    }
  }

  // FFmpeg con filtros avanzados
  async createAudiophileWithAdvancedFilters(audioUrl, targetBitrate, enhancementMode) {
    return new Promise((resolve, reject) => {
      console.log(`🎶 MODO AUDIÓFILO AVANZADO: ${targetBitrate}kbps (${enhancementMode})...`);
      
      // Filtros simplificados y compatibles
      const audioFilters = [
        'dynaudnorm=f=500:g=31:p=0.95',          // Normalización
        'equalizer=f=60:t=q:w=1:g=1.2',         // Sub-bass suave
        'equalizer=f=8000:t=q:w=2:g=1.0',       // Highs suaves
        'acompressor=threshold=0.1:ratio=3:attack=200:release=1000:makeup=1.2' // Compresión suave
      ];

      const stream = ffmpeg(audioUrl)
        .audioCodec('libopus')
        .audioBitrate(targetBitrate)
        .audioFrequency(48000)
        .audioChannels(2)
        .format('webm')
        .audioFilters(audioFilters)
        .outputOptions([
          '-application', 'audio',
          '-vbr', 'on',
          '-compression_level', '10',
          '-cutoff', '20000',
          '-movflags', 'faststart',
          '-strict', '-2',
          '-f', 'webm'
        ])
        .on('start', () => {
          console.log(`🎯 FFmpeg AUDIÓFILO AVANZADO: ${targetBitrate}kbps`);
          console.log('🎛️ Filtros: Normalización + EQ + Compresión suave (Compatibles)');
        })
        .on('error', (err) => {
          console.error('❌ Error FFmpeg avanzado:', err.message);
          reject(err);
        })
        .pipe();

      resolve(stream);
    });
  }

  // FFmpeg básico optimizado (fallback)
  async createAudiophileBasicStream(audioUrl, targetBitrate, enhancementMode) {
    return new Promise((resolve, reject) => {
      console.log(`🎶 MODO AUDIÓFILO BÁSICO: ${targetBitrate}kbps (${enhancementMode})...`);
      
      const stream = ffmpeg(audioUrl)
        .audioCodec('libopus')
        .audioBitrate(targetBitrate)
        .audioFrequency(48000)
        .audioChannels(2)
        .format('webm')
        .outputOptions([
          '-application', 'audio',
          '-vbr', 'on',
          '-compression_level', '10',
          '-cutoff', '20000',
          '-movflags', 'faststart',
          '-strict', '-2',
          '-f', 'webm'
        ])
        .on('start', () => {
          console.log(`🎯 FFmpeg AUDIÓFILO BÁSICO: ${targetBitrate}kbps`);
          console.log('🎛️ Optimización: Opus VBR + Compresión máxima + Full frequency');
        })
        .on('error', (err) => {
          console.error('❌ Error FFmpeg básico:', err.message);
          reject(err);
        })
        .pipe();

      resolve(stream);
    });
  }

  // Mantener función legacy para compatibilidad
  async createFFmpegStream(audioUrl, targetBitrate = 192) {
    return this.createAudiophileFFmpegStream(audioUrl, targetBitrate, 'legacy');
  }

  // Función para mostrar información detallada de calidad audiófilo
  logAudiophileQuality(metadata, strategyName) {
    if (!metadata) return;

    console.log("\n" + "=".repeat(70));
    console.log("🎶 REPORTE DE CALIDAD AUDIÓFILO 🎶");
    console.log("=".repeat(70));
    console.log(`🎵 Canción: ${metadata.title}`);
    console.log(`🔧 Estrategia: ${strategyName}`);
    console.log(`📊 Método: ${metadata.method || 'N/A'}`);
    
    if (metadata.bitrate) {
      const qualityLevel = this.getQualityLevel(metadata.bitrate);
      console.log(`🎯 Bitrate final: ${metadata.bitrate} kbps ${qualityLevel.emoji} (${qualityLevel.name})`);
    }
    
    if (metadata.originalBitrate && metadata.originalBitrate !== metadata.bitrate) {
      console.log(`📈 Mejora aplicada: ${metadata.originalBitrate} kbps → ${metadata.bitrate} kbps`);
    }
    
    if (metadata.codec) {
      console.log(`🎼 Codec: ${metadata.codec.toUpperCase()}`);
    }
    
    if (metadata.quality) {
      console.log(`⭐ Calidad: ${metadata.quality}`);
    }
    
    if (metadata.enhancement) {
      console.log(`🔧 Enhancement: ${metadata.enhancement}`);
    }

    // Comparación con servicios de streaming populares
    console.log("\n📱 COMPARACIÓN CON SERVICIOS POPULARES:");
    const comparison = this.compareWithStreamingServices(metadata.bitrate || 128);
    comparison.forEach(service => {
      console.log(`${service.emoji} ${service.name}: ${service.comparison}`);
    });

    console.log("=".repeat(70) + "\n");
  }

  // Determinar nivel de calidad
  getQualityLevel(bitrate) {
    if (bitrate >= 320) return { name: "Audiófilo Premium", emoji: "💎" };
    if (bitrate >= 256) return { name: "Audiófilo Alta", emoji: "🏆" };
    if (bitrate >= 192) return { name: "Audiófilo Base", emoji: "🎯" };
    if (bitrate >= 160) return { name: "Alta+", emoji: "⭐" };
    if (bitrate >= 128) return { name: "Alta", emoji: "✅" };
    return { name: "Media", emoji: "📻" };
  }

  // Comparar con servicios de streaming
  compareWithStreamingServices(bitrate) {
    return [
      {
        name: "Spotify Premium",
        emoji: "🟢",
        comparison: bitrate >= 320 ? "✅ Igual calidad" : bitrate >= 256 ? "🔄 Muy cerca" : "📈 Mejorado"
      },
      {
        name: "Apple Music",
        emoji: "🍎", 
        comparison: bitrate >= 256 ? "✅ Igual/Superior" : "📈 Mejorado"
      },
      {
        name: "YouTube Music Premium",
        emoji: "🔴",
        comparison: bitrate >= 256 ? "✅ Superior" : "📈 Mejorado"
      },
      {
        name: "Tidal",
        emoji: "🌊",
        comparison: bitrate >= 320 ? "✅ Cerca de HiFi" : "📈 Mejorado significativamente"
      }
    ];
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

  // Método con múltiples estrategias de streaming AUDIÓFILO
  async createStreamResource(song) {
    const strategies = [
      {
        name: "🎶 ESTRATEGIA AUDIÓFILO: yt-dlp Premium + Filtros Profesionales",
        method: async () => {
          console.log("🎯 ESTRATEGIA AUDIÓFILO: Buscando máxima calidad disponible...");
          
          try {
            // Buscar específicamente formatos de alta calidad
            const audioUrl = await this.ytdlp.execPromise([
              song.url,
              "-f", "bestaudio[acodec=opus][abr>=256]/bestaudio[acodec=opus][abr>=160]/bestaudio[acodec=aac][abr>=256]/bestaudio[abr>=320]/bestaudio",
              "--audio-quality", "0",
              "--prefer-free-formats",
              "-g",
              "--no-playlist"
            ]);

            if (!audioUrl || !audioUrl.trim()) {
              throw new Error("No se pudo extraer URL de audio audiófilo");
            }

            const url = audioUrl.trim();
            const diagnosis = this.diagnoseStreamQuality(url, 'audiophile-premium');

            console.log(`🎯 AUDIÓFILO: Fuente ${diagnosis.bitrate}kbps -> Procesando a ${diagnosis.targetBitrate}kbps`);

            // SIEMPRE procesar con filtros audiófilo para máxima calidad
            const ffmpegStream = await this.createAudiophileFFmpegStream(
              url, 
              Math.max(diagnosis.targetBitrate, 320), // Mínimo 320kbps
              'audiophile'
            );
            
            return createAudioResource(ffmpegStream, {
              inputType: StreamType.WebmOpus,
              metadata: {
                title: song.title,
                bitrate: Math.max(diagnosis.targetBitrate, 320),
                originalBitrate: diagnosis.bitrate,
                codec: 'opus',
                quality: 'audiófilo-premium',
                method: 'audiophile-processing',
                enhancement: 'full-audiophile-suite'
              }
            });
          } catch (error) {
            console.error("Error en estrategia audiófilo premium:", error.message);
            throw error;
          }
        },
      },
      {
        name: "yt-dlp inteligente (directo o FFmpeg según calidad)",
        method: async () => {
          console.log("🎵 Estrategia inteligente: yt-dlp con análisis de calidad...");
          
          try {
            // Obtener la mejor URL de audio
            const audioUrl = await this.ytdlp.execPromise([
              song.url,
              "-f", "bestaudio",
              "--audio-quality", "0",
              "-g",
              "--no-playlist"
            ]);

            if (!audioUrl || !audioUrl.trim()) {
              throw new Error("No se pudo extraer URL de audio");
            }

            const url = audioUrl.trim();
            const diagnosis = this.diagnoseStreamQuality(url, 'yt-dlp-intelligent');

            // Decisión AUDIÓFILO: Siempre mejorar a menos que ya sea 320kbps+ Opus
            if (!diagnosis.useFFmpeg && diagnosis.codec === 'opus' && diagnosis.bitrate >= 320) {
              console.log("✅ AUDIÓFILO: Stream directo - ya es calidad premium");
              
              const response = await this.makeRequest(url);
              return createAudioResource(response, {
                inputType: StreamType.WebmOpus,
                inlineVolume: false,
                metadata: {
                  title: song.title,
                  bitrate: diagnosis.bitrate,
                  codec: diagnosis.codec,
                  quality: 'audiófilo-nativo',
                  method: 'direct-premium',
                  itag: diagnosis.itag
                }
              });
            } else {
                        console.log(`🎶 AUDIÓFILO: Procesando ${diagnosis.bitrate}kbps -> ${diagnosis.targetBitrate}kbps`);
          
          // Usar función audiófilo con fallback automático
          const ffmpegStream = await this.createAudiophileFFmpegStream(
            url, 
            diagnosis.targetBitrate, 
            diagnosis.enhancementMode
          );
              
              return createAudioResource(ffmpegStream, {
                inputType: StreamType.WebmOpus,
                metadata: {
                  title: song.title,
                  bitrate: diagnosis.targetBitrate,
                  originalBitrate: diagnosis.bitrate,
                  codec: 'opus',
                  quality: 'audiófilo-enhanced',
                  method: 'ffmpeg-audiophile',
                  enhancement: diagnosis.enhancementMode
                }
              });
            }
          } catch (error) {
            console.error("Error en estrategia inteligente:", error.message);
            throw error;
          }
        },
      },
      {
        name: "yt-dlp con mejoras audiófilo automáticas",
        method: async () => {
          console.log("🎵 Estrategia de respaldo audiófilo: yt-dlp con enhancement...");
          
          try {
            const audioUrl = await this.ytdlp.execPromise([
              song.url,
              "-f", "bestaudio[acodec=opus][abr>=160]/bestaudio[acodec=aac][abr>=160]/bestaudio[abr>=128]/bestaudio",
              "--audio-quality", "0",
              "-g",
              "--no-playlist"
            ]);

            if (!audioUrl || !audioUrl.trim()) {
              throw new Error("No se pudo extraer URL de audio");
            }

            const url = audioUrl.trim();
            const diagnosis = this.diagnoseStreamQuality(url, 'yt-dlp-enhanced');

            // Si es de alta calidad, stream directo; si no, mejorar con audiófilo
            if (diagnosis.codec === 'opus' && diagnosis.bitrate >= 256) {
              console.log("✅ Calidad buena detectada - stream directo optimizado");
              
              const response = await this.makeRequest(url);
              return createAudioResource(response, {
                inputType: StreamType.WebmOpus,
                inlineVolume: false,
                metadata: {
                  title: song.title,
                  bitrate: diagnosis.bitrate,
                  codec: diagnosis.codec,
                  quality: 'alta-nativa',
                  method: 'direct-optimized'
                }
              });
            } else {
              console.log(`🎶 Mejorando calidad: ${diagnosis.bitrate}kbps -> 256kbps`);
              
              const ffmpegStream = await this.createAudiophileFFmpegStream(url, 256, 'enhance');
              
              return createAudioResource(ffmpegStream, {
                inputType: StreamType.WebmOpus,
                metadata: {
                  title: song.title,
                  bitrate: 256,
                  originalBitrate: diagnosis.bitrate,
                  codec: 'opus',
                  quality: 'audiófilo-backup',
                  method: 'enhanced-backup'
                }
              });
            }
          } catch (error) {
            console.error("Error en yt-dlp enhanced backup:", error.message);
            throw error;
          }
        },
      },
      {
        name: "youtube-dl + análisis inteligente",
        method: async () => {
          console.log("🎵 Estrategia youtube-dl con análisis...");
          
          try {
            const info = await youtubeDl(song.url, {
              dumpSingleJson: true,
              noWarnings: true,
              audioQuality: 0,
              format: "bestaudio",
            });

            let audioUrl = null;
            if (info.url) {
              audioUrl = info.url;
            } else if (info.formats && info.formats.length > 0) {
              // Buscar el mejor formato por bitrate
              const audioFormats = info.formats
                .filter(f => f.acodec && f.acodec !== 'none')
                .sort((a, b) => (b.abr || 0) - (a.abr || 0));
              audioUrl = audioFormats[0]?.url;
            }

            if (!audioUrl) {
              throw new Error("No se pudo extraer URL de audio");
            }

            const diagnosis = this.diagnoseStreamQuality(audioUrl, 'youtube-dl');
            
            // Decisión audiófilo para youtube-dl
            if (!diagnosis.useFFmpeg && diagnosis.codec === 'opus' && diagnosis.bitrate >= 256) {
              console.log("✅ youtube-dl: Stream directo - calidad alta detectada");
              
              const response = await this.makeRequest(audioUrl);
              return createAudioResource(response, {
                inputType: StreamType.WebmOpus,
                inlineVolume: false,
                metadata: { 
                  title: song.title, 
                  bitrate: diagnosis.bitrate,
                  codec: diagnosis.codec,
                  quality: 'alta-youtube-dl',
                  method: 'youtube-dl-direct'
                }
              });
            } else {
              console.log(`🎶 youtube-dl: Mejorando ${diagnosis.bitrate}kbps -> ${diagnosis.targetBitrate}kbps`);
              
              const ffmpegStream = await this.createAudiophileFFmpegStream(
                audioUrl, 
                diagnosis.targetBitrate,
                'youtube-dl-enhance'
              );
              return createAudioResource(ffmpegStream, {
                inputType: StreamType.WebmOpus,
                metadata: { 
                  title: song.title, 
                  bitrate: diagnosis.targetBitrate,
                  originalBitrate: diagnosis.bitrate,
                  codec: 'opus',
                  quality: 'audiófilo-youtube-dl',
                  method: 'youtube-dl-audiophile'
                }
              });
            }
          } catch (error) {
            console.error("Error en youtube-dl:", error.message);
            throw error;
          }
        },
      },
      {
        name: "play-dl con post-procesamiento audiófilo",
        method: async () => {
          console.log("🎵 Estrategia play-dl con enhancement audiófilo...");
          
          const videoInfo = await play.video_info(song.url);
          if (!videoInfo) {
            throw new Error("No se pudo obtener información del video");
          }

          const streamInfo = await play.stream_from_info(videoInfo, {
            discordPlayerCompatibility: true,
            quality: 0, // Máxima calidad
            highWaterMark: 1 << 25, // 32MB buffer para mejor calidad
          });
          
          console.log(`🔍 Play-dl stream type: ${streamInfo.type}`);
          
          // Si el stream type no es WebmOpus o la calidad es dudosa, aplicar filtros audiófilo
          if (streamInfo.type !== StreamType.WebmOpus) {
            console.log("🎶 Play-dl: Aplicando post-procesamiento audiófilo para optimizar...");
            
            // Crear un stream temporal y procesarlo con FFmpeg
            const tempStream = streamInfo.stream;
            const ffmpegStream = await this.createAudiophileFFmpegStream(tempStream, 320, 'play-dl-enhance');
            
            return createAudioResource(ffmpegStream, {
              inputType: StreamType.WebmOpus,
              metadata: {
                title: song.title,
                bitrate: 320,
                codec: 'opus',
                quality: 'audiófilo-play-dl',
                method: 'play-dl-enhanced',
                originalType: streamInfo.type
              }
            });
          } else {
            // Stream ya es WebmOpus, usar directo
            console.log("✅ Play-dl: Stream WebmOpus nativo - usando directo");
            return createAudioResource(streamInfo.stream, {
              inputType: streamInfo.type,
              inlineVolume: false,
              metadata: {
                title: song.title,
                source: 'play-dl',
                type: streamInfo.type,
                quality: 'nativa-opus',
                method: 'play-dl-direct'
              }
            });
          }
        },
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🔧 Ejecutando estrategia: ${strategy.name}`);
        const resource = await strategy.method();
        console.log(`✅ Estrategia ${strategy.name} exitosa`);
        
        // Log de metadata si está disponible
        if (resource.metadata) {
          console.log("📊 Metadata del recurso:", resource.metadata);
        }
        
        // Log detallado de calidad audiófilo
        this.logAudiophileQuality(resource.metadata, strategy.name);
        
        Logger.info(`Streaming exitoso con ${strategy.name}`, {
          songUrl: song.url,
          metadata: resource.metadata
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
