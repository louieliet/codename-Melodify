const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Detiene la música y limpia la cola"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo.current && queueInfo.length === 0) {
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

    try {
      await interaction.client.app?.playbackService?.stop(guild.id);
      interaction.client.app?.queueRepository?.clear(guild.id);
    } catch { }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ff4757")
          .setTitle("⏹️ Música detenida")
          .setDescription("La música ha sido detenida y la cola limpiada."),
      ],
    });
  },
};
