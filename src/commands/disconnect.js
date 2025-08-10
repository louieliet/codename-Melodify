const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Desconecta el bot del canal de voz"),

  async execute(interaction) {
    const guild = interaction.guild;

    const member = interaction.member;
    const botVoiceChannel = guild.members.me.voice.channel;
    const userVoiceChannel = member.voice.channel;

    if (!botVoiceChannel) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Aviso")
            .setDescription("No estoy conectado a ningún canal de voz."),
        ],
        ephemeral: true,
      });
    }

    if (!userVoiceChannel || userVoiceChannel.id !== botVoiceChannel.id) {
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
      await interaction.client.app?.audioPlayer?.disconnect(guild.id);
      interaction.client.app?.queueRepository?.clear(guild.id);
    } catch { }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ed573")
          .setTitle("👋 Desconectado")
          .setDescription(
            "Me he desconectado del canal de voz. ¡Hasta la próxima!"
          ),
      ],
    });
  },
};
