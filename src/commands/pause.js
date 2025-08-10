const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausa la reproducción de música"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo.playing) {
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

    const member = interaction.member;
    const botVoiceChannel = guild.members.me.voice.channel;
    const userVoiceChannel = member.voice.channel;

    if (!userVoiceChannel || userVoiceChannel.id !== botVoiceChannel?.id) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff4757")
            .setTitle("❌ Error")
            .setDescription("Debes estar en el mismo canal de voz que el bot."),
        ],
        ephemeral: true,
      });
    }

    let paused = false;
    try {
      const p2 = await interaction.client.app?.playbackService?.pause(guild.id);
      if (typeof p2 === "boolean") paused = p2;
    } catch { }

    if (paused) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff6b6b")
            .setTitle("⏸️ Música pausada")
            .setDescription(
              "La reproducción ha sido pausada. Usa `/resume` para continuar."
            ),
        ],
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("La música ya está pausada."),
        ],
        ephemeral: true,
      });
    }
  },
};
