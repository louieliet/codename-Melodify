const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Salta la canción actual"),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo.current) {
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

    const currentSong = queueInfo.current;
    let skipped = false;
    try {
      const s2 = await interaction.client.app?.playbackService?.skip(guild.id);
      if (typeof s2 === "boolean") skipped = skipped || s2;
    } catch { }

    if (skipped) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff6b6b")
            .setTitle("⏭️ Canción saltada")
            .setDescription(`**${currentSong.title}** ha sido saltada.`),
        ],
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("No se pudo saltar la canción."),
        ],
        ephemeral: true,
      });
    }
  },
};
