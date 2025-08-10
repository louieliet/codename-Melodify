/**
 * PlaybackService coordina la reproducción usando puertos (a implementar):
 * - AudioPlayerPort: conexión y control del reproductor de voz
 * - StreamPort: creación de recursos de audio desde un Track
 * - QueueRepositoryPort: acceso al estado de la cola por guild
 */

const Logger = require("../../utils/Logger");

class PlaybackService {
    constructor({ audioPlayer, streamProvider, queueRepository, logger }) {
        this.audioPlayer = audioPlayer; // AudioPlayerPort
        this.streamProvider = streamProvider; // StreamPort
        this.queueRepository = queueRepository; // QueueRepositoryPort
        this.logger = logger || Logger; // LoggerPort compatible
    }

    async playNext(guildId) {
        const queue = this.queueRepository.get(guildId);
        if (!queue || queue.songs.length === 0) {
            if (queue) {
                queue.currentSong = null;
                queue.playing = false;
                this.queueRepository.save(queue);
            }
            return false;
        }

        const track = queue.nextSong();
        const maxAttempts = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const { resource, metadata } = await this.streamProvider.createResource(track, guildId);
                // Log de calidad/estrategia del recurso
                try {
                    this.logger.info("Playback resource", {
                        guildId,
                        quality: {
                            source: metadata?.source,
                            codec: metadata?.codec,
                            container: metadata?.container,
                            passthrough: metadata?.passthrough,
                            bitrateKbps: metadata?.bitrateKbps,
                            highWaterMark: metadata?.highWaterMark,
                        },
                    });
                } catch { }
                await this.audioPlayer.subscribe(guildId, resource);
                queue.playing = true;
                this.queueRepository.save(queue);
                this.logger.info("Playback started", { guildId, track: { title: track?.title, url: track?.url } });

                // Prefetch (mejorar transición): preparar siguiente recurso si hay canciones
                try {
                    if (queue.songs.length > 0 && typeof this.streamProvider.prefetch === "function") {
                        const next = queue.songs[0];
                        this.streamProvider.prefetch(next).catch(() => { });
                    }
                } catch { }
                return true;
            } catch (error) {
                lastError = error;
                this.logger.warn("PlaybackService.playNext attempt failed", { guildId, attempt, error: error?.message });
                await new Promise((r) => setTimeout(r, attempt * 250));
            }
        }
        this.logger.error("PlaybackService.playNext failed", lastError, { guildId, trackUrl: track?.url });
        queue.playing = false;
        this.queueRepository.save(queue);
        return false;
    }

    pause(guildId) {
        this.logger.info("Playback paused", { guildId });
        return this.audioPlayer.pause(guildId);
    }

    resume(guildId) {
        this.logger.info("Playback resumed", { guildId });
        return this.audioPlayer.resume(guildId);
    }

    async skip(guildId) {
        try {
            if (typeof this.streamProvider.cancel === "function") {
                await this.streamProvider.cancel(guildId);
            }
            await this.audioPlayer.stop(guildId);
        } catch { }
        this.logger.info("Playback skipped", { guildId });
        return this.playNext(guildId);
    }

    stop(guildId) {
        const queue = this.queueRepository.get(guildId);
        if (queue) {
            queue.clear();
            this.queueRepository.save(queue);
        }
        this.logger.info("Playback stopped", { guildId });
        if (typeof this.streamProvider.cancel === "function") {
            this.streamProvider.cancel(guildId).catch(() => { });
        }
        return this.audioPlayer.stop(guildId);
    }
}

module.exports = PlaybackService;


