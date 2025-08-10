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
        try {
            const { resource, metadata } = await this.streamProvider.createResource(track);
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
            return true;
        } catch (error) {
            this.logger.error("PlaybackService.playNext failed", error, { guildId, trackUrl: track?.url });
            queue.playing = false;
            this.queueRepository.save(queue);
            return false;
        }
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
        return this.audioPlayer.stop(guildId);
    }
}

module.exports = PlaybackService;


