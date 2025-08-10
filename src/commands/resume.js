const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Reanuda la reproducción de música"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo.current) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("No hay música en cola."),
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

    let resumed = false;
    try {
      const r2 = await interaction.client.app?.playbackService?.resume(guild.id);
      if (typeof r2 === "boolean") resumed = r2;
    } catch { }

    if (resumed) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#2ed573")
            .setTitle("▶️ Música reanudada")
            .setDescription("La reproducción ha sido reanudada."),
        ],
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("La música ya se está reproduciendo."),
        ],
        ephemeral: true,
      });
    }
  },
};
