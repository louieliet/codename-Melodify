const { createAudioResource, StreamType } = require("@discordjs/voice");
const play = require("play-dl");
const youtubedl = require("youtube-dl-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { PassThrough } = require("stream");
const config = require("../../config");

ffmpeg.setFfmpegPath(ffmpegStatic);

class StreamYtDlp {
    async createResource(track) {
        // 1) Intento play-dl con passthrough WebmOpus
        try {
            const info = await play.video_info(track.url);
            const streamInfo = await play.stream_from_info(info, {
                discordPlayerCompatibility: true,
                quality: 0,
                highWaterMark: config.music.audio.highWaterMark,
            });

            if (streamInfo?.type === StreamType.WebmOpus && !config.music.audio.forceTranscode) {
                console.log("[Stream] passthrough WebmOpus via play-dl");
                return {
                    resource: createAudioResource(streamInfo.stream, {
                        inputType: StreamType.WebmOpus,
                    }),
                    metadata: {
                        source: "play-dl",
                        codec: "opus",
                        container: "webm",
                        passthrough: true,
                        highWaterMark: config.music.audio.highWaterMark,
                    },
                };
            }

            // Si no es Opus, transcodificar a Opus (48kHz estéreo)
            console.log("[Stream] transcode to Opus via FFmpeg (play-dl input)");
            const transcoded = await this.transcodeToOpus(streamInfo.stream);
            return {
                resource: createAudioResource(transcoded, { inputType: StreamType.OggOpus }),
                metadata: {
                    source: "play-dl",
                    codec: "opus",
                    container: "ogg",
                    passthrough: false,
                    bitrateKbps: config.music.audio.targetBitrateKbps,
                    highWaterMark: config.music.audio.highWaterMark,
                },
            };
        } catch (e1) {
            // 2) Fallback youtube-dl/yt-dlp
            try {
                const info = await youtubedl(track.url, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    format: "bestaudio/best",
                });

                // Elegir url de audio
                let audioUrl = info.url;
                if (!audioUrl && Array.isArray(info.formats)) {
                    const best = info.formats
                        .filter((f) => f.acodec && f.acodec !== "none")
                        .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
                    audioUrl = best?.url;
                }

                if (!audioUrl) throw new Error("No se pudo extraer URL de audio");

                // Heurística simple: si parece webm/opus → passthrough
                const looksOpus = /webm/.test(audioUrl) && /opus|acodec=opus/.test(audioUrl);
                if (looksOpus && !config.music.audio.forceTranscode) {
                    console.log("[Stream] passthrough WebmOpus via yt-dlp");
                    const response = await this.fetchHttp(audioUrl);
                    return {
                        resource: createAudioResource(response, { inputType: StreamType.WebmOpus }),
                        metadata: {
                            source: "yt-dlp",
                            codec: "opus",
                            container: "webm",
                            passthrough: true,
                            highWaterMark: config.music.audio.highWaterMark,
                        },
                    };
                }

                // Transcodificar si no es Opus
                console.log("[Stream] transcode to Opus via FFmpeg (yt-dlp input)");
                const response = await this.fetchHttp(audioUrl);
                const transcoded = await this.transcodeToOpus(response);
                return {
                    resource: createAudioResource(transcoded, { inputType: StreamType.OggOpus }),
                    metadata: {
                        source: "yt-dlp",
                        codec: "opus",
                        container: "ogg",
                        passthrough: false,
                        bitrateKbps: config.music.audio.targetBitrateKbps,
                        highWaterMark: config.music.audio.highWaterMark,
                    },
                };
            } catch (e2) {
                throw new Error(`Falló play-dl (${e1.message}) y yt-dlp (${e2.message})`);
            }
        }
    }

    async fetchHttp(url) {
        const https = require("https");
        const http = require("http");
        const mod = url.startsWith("https:") ? https : http;
        return new Promise((resolve, reject) => {
            const req = mod.get(url, (res) => {
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                resolve(res);
            });
            req.on("error", reject);
        });
    }

    async transcodeToOpus(inputStream) {
        const out = new PassThrough({ highWaterMark: config.music.audio.highWaterMark });
        const bitrate = Math.max(64, Math.min(320, config.music.audio.targetBitrateKbps));
        let command = ffmpeg(inputStream)
            .inputOptions([
                ...(config.music.audio.inputReconnect ? ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"] : []),
                "-thread_queue_size", "4096",
            ])
            .audioCodec("libopus")
            .audioChannels(2)
            .audioFrequency(48000)
            .audioBitrate(bitrate)
            .outputOptions(["-vbr", "on", "-application", "audio"]) // 20ms por defecto en opus
            .format("ogg");

        if (config.music.audio.enableNormalize) {
            command = command.audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"]);
        }

        command.on("error", (err) => out.destroy(err));
        command.pipe(out, { end: true });
        return out;
    }
}

module.exports = StreamYtDlp;


