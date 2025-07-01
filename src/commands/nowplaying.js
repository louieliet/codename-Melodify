const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MusicUtils = require("../utils/MusicUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Muestra la canción que se está reproduciendo actualmente"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queue = interaction.client.queues.get(guild.id);

    if (!queue || !queue.currentSong) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("No hay música reproduciéndose actualmente."),
        ],
        ephemeral: true,
      });
    }

    const currentSong = queue.currentSong;
    const isPlaying = queue.playing;

    const embed = new EmbedBuilder()
      .setColor("#ff6b6b")
      .setTitle(
        `${isPlaying ? "🎵" : "⏸️"} ${
          isPlaying ? "Reproduciendo ahora" : "Pausado"
        }`
      )
      .setDescription(`**${currentSong.title}**`)
      .addFields(
        { name: "👤 Autor", value: currentSong.author, inline: true },
        { name: "⏱️ Duración", value: currentSong.duration, inline: true },
        { name: "👁️ Vistas", value: currentSong.views, inline: true },
        {
          name: "🔗 URL",
          value: `[Abrir en YouTube](${currentSong.url})`,
          inline: false,
        }
      )
      .setTimestamp();

    if (currentSong.thumbnail) {
      embed.setThumbnail(currentSong.thumbnail);
    }

    const queueInfo = queue.getQueueInfo();
    if (queueInfo.length > 0) {
      embed.addFields({
        name: "📝 En cola",
        value: `${queueInfo.length} canción${
          queueInfo.length !== 1 ? "es" : ""
        } en espera`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
