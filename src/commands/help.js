const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra todos los comandos disponibles"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#4ecdc4")
      .setTitle("🎵 Melodify - Comandos disponibles")
      .setDescription("Lista de todos los comandos de música disponibles:")
      .addFields(
        {
          name: "🎵 Reproducción",
          value:
            "`/play <canción>` - Reproduce música desde YouTube\n" +
            "`/pause` - Pausa la reproducción\n" +
            "`/resume` - Reanuda la reproducción\n" +
            "`/stop` - Detiene la música y limpia la cola\n" +
            "`/skip` - Salta la canción actual",
          inline: false,
        },
        {
          name: "📋 Información",
          value:
            "`/queue [página]` - Muestra la cola de reproducción\n" +
            "`/nowplaying` - Muestra la canción actual\n" +
            "`/help` - Muestra esta ayuda",
          inline: false,
        },
        {
          name: "🔧 Control",
          value: "`/disconnect` - Desconecta el bot del canal de voz",
          inline: false,
        },
        {
          name: "💡 Consejos",
          value:
            "• Puedes usar URLs de YouTube o buscar por nombre\n" +
            "• Debes estar en un canal de voz para usar los comandos\n" +
            "• El bot se unirá automáticamente a tu canal de voz",
          inline: false,
        }
      )
      .setFooter({
        text: "Melodify Bot • Hecho con ❤️",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
