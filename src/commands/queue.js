const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MusicUtils = require("../utils/MusicUtils");
const EmbedsFactory = require("../interfaces/discord/embeds/EmbedsFactory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Muestra la cola de reproducción actual")
    .addIntegerOption((option) =>
      option
        .setName("pagina")
        .setDescription("Página de la cola a mostrar")
        .setMinValue(1)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const queueInfo = interaction.client.app.queueService.getQueueInfo(guild.id);

    if (!queueInfo || (!queueInfo.current && queueInfo.length === 0)) {
      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ffa502")
            .setTitle("⚠️ Cola vacía")
            .setDescription(
              "No hay música en cola. Usa `/play` para añadir canciones."
            ),
        ],
        ephemeral: true,
      });
    }

    const page = interaction.options.getInteger("pagina") || 1;
    const embed = EmbedsFactory.queue(queueInfo, page);

    await interaction.reply({ embeds: [embed] });
  },
};
