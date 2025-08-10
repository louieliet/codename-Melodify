const play = require("play-dl");
const Track = require("../../domain/entities/Track");

const isYouTubeURL = (url) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)/.test(
        url
    );

class SearchPlayDL {
    async initialize() {
        try {
            await play.getFreeClientID();
            // Inicialización silenciosa
        } catch {
            // no-op
        }
    }

    async getInfo(input) {
        if (isYouTubeURL(input)) {
            try {
                const info = await play.video_info(input);
                const v = info?.video_details;
                if (!v) throw new Error("No video_details");
                return new Track({
                    title: v.title || "Título desconocido",
                    url: v.url || input,
                    duration: this.format(v.durationInSec),
                    thumbnail: v.thumbnails?.[0]?.url ?? null,
                    author: v.channel?.name || "Desconocido",
                    views: v.views?.toLocaleString() || "0",
                });
            } catch {
                // fallback a search
            }
        }
        const res = await play.search(input, { limit: 1, source: { youtube: "video" } });
        if (!res.length) throw new Error("No se encontraron resultados");
        const v = res[0];
        return new Track({
            title: v.title || "Título desconocido",
            url: v.url,
            duration: this.format(v.durationInSec),
            thumbnail: v.thumbnails?.[0]?.url ?? null,
            author: v.channel?.name || "Desconocido",
            views: v.views?.toLocaleString() || "0",
        });
    }

    async search(query, limit = 5) {
        const res = await play.search(query, { limit, source: { youtube: "video" } });
        return res.map(
            (v) =>
                new Track({
                    title: v.title,
                    url: v.url,
                    duration: this.format(v.durationInSec),
                    thumbnail: v.thumbnails?.[0]?.url ?? null,
                    author: v.channel?.name || "Desconocido",
                    views: v.views?.toLocaleString() || "0",
                })
        );
    }

    format(seconds) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
}

module.exports = SearchPlayDL;


