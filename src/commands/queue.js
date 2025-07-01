const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MusicUtils = require("../utils/MusicUtils");

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
    const queue = interaction.client.queues.get(guild.id);

    if (!queue) {
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
    const embed = MusicUtils.createQueueEmbed(queue, page);

    await interaction.reply({ embeds: [embed] });
  },
};
