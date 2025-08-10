const { EmbedBuilder } = require("discord.js");

const EmbedsFactory = {
    song(track, type = "playing") {
        const embed = new EmbedBuilder()
            .setColor(type === "playing" ? "#2ed573" : "#4ecdc4")
            .setTitle(
                type === "playing" ? "🎵 Reproduciendo ahora" : "➕ Añadido a la cola"
            )
            .setDescription(`**${track.title}**`)
            .addFields(
                { name: "👤 Autor", value: track.author, inline: true },
                { name: "⏱️ Duración", value: track.duration, inline: true },
                { name: "👁️ Vistas", value: track.views, inline: true }
            )
            .setTimestamp();

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        return embed;
    },

    queue(queueInfo, currentPage = 1, songsPerPage = 10) {
        const { current, queue } = queueInfo;
        const totalPages = Math.max(1, Math.ceil(queue.length / songsPerPage));
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

        if (!queue.length) {
            embed.setDescription("La cola está vacía. ¡Añade canciones!");
        } else {
            const start = (currentPage - 1) * songsPerPage;
            const list = queue
                .slice(start, start + songsPerPage)
                .map(
                    (s, i) => `${start + i + 1}. **${s.title}** - ${s.author} (${s.duration})`
                )
                .join("\n");
            embed.setDescription(list);
            const footer =
                totalPages > 1
                    ? `Página ${currentPage}/${totalPages} • Total: ${queue.length}`
                    : `Total: ${queue.length}`;
            embed.setFooter({ text: footer });
        }

        return embed;
    },
};

module.exports = EmbedsFactory;


