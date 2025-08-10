const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const EmbedsFactory = require("../interfaces/discord/embeds/EmbedsFactory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Muestra la canción que se está reproduciendo actualmente"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo || !queueInfo.current) {
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

    const currentSong = queueInfo.current;
    const isPlaying = queueInfo.playing;

    const base = new EmbedBuilder()
      .setColor("#ff6b6b")
      .setTitle(`${isPlaying ? "🎵" : "⏸️"} ${isPlaying ? "Reproduciendo ahora" : "Pausado"}`)
      .setTimestamp();

    const songEmbed = EmbedsFactory.song(currentSong, isPlaying ? "playing" : "queued");
    // Copiamos campos del embed base a fin de mantener el título/estilo solicitado
    songEmbed.setColor(base.data.color);
    songEmbed.setTitle(base.data.title);

    if (queueInfo.length > 0) {
      songEmbed.addFields({
        name: "📝 En cola",
        value: `${queueInfo.length} canción${queueInfo.length !== 1 ? "es" : ""} en espera`,
        inline: true,
      });
    }

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("np_pause").setLabel(isPlaying ? "Pausar" : "Reanudar").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("np_skip").setLabel("Saltar").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("np_stop").setLabel("Detener").setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [songEmbed], components: [controls] });
  },
};
