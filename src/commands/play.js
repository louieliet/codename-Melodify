const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const Queue = require("../utils/Queue");
const MusicUtils = require("../utils/MusicUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce música desde YouTube")
    .addStringOption((option) =>
      option
        .setName("cancion")
        .setDescription("URL de YouTube o términos de búsqueda")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("cancion");
    const member = interaction.member;
    const guild = interaction.guild;
    const botMember = guild.members.me;

    // Verificar si el usuario está en un canal de voz
    const voiceCheck = MusicUtils.canJoinVoiceChannel(member, botMember);
    if (!voiceCheck.canJoin) {
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff4757")
            .setTitle("❌ Error")
            .setDescription(voiceCheck.reason),
        ],
      });
    }

    const voiceChannel = voiceCheck.channel;

    try {
      // Obtener o crear cola para este servidor
      let queue = interaction.client.queues.get(guild.id);
      if (!queue) {
        queue = new Queue(guild.id);
        interaction.client.queues.set(guild.id, queue);
      }

      // Conectar al canal de voz si no está conectado
      if (!queue.connection) {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        });
        queue.connection = connection;
      }

      let songInfo;

      // Verificar si es una URL o términos de búsqueda
      if (MusicUtils.isValidURL(query)) {
        if (MusicUtils.isYouTubeURL(query)) {
          songInfo = await MusicUtils.getYouTubeInfo(query);
        } else {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor("#ff4757")
                .setTitle("❌ Error")
                .setDescription("Solo se admiten URLs de YouTube por ahora."),
            ],
          });
        }
      } else {
        // Buscar en YouTube
        const searchResults = await MusicUtils.searchYouTube(query, 1);
        if (searchResults.length === 0) {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor("#ff4757")
                .setTitle("❌ Sin resultados")
                .setDescription(
                  "No se encontraron canciones con esa búsqueda."
                ),
            ],
          });
        }
        songInfo = searchResults[0];
      }

      // Añadir canción a la cola
      queue.addSong(songInfo);

      // Si no hay nada reproduciéndose, empezar la reproducción
      const wasEmpty = !queue.playing && queue.songs.length === 1;

      if (wasEmpty) {
        const started = await queue.playNext();
        if (started) {
          await interaction.editReply({
            embeds: [MusicUtils.createSongEmbed(songInfo, "playing")],
          });
        } else {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor("#ff4757")
                .setTitle("❌ Error")
                .setDescription("No se pudo reproducir la canción."),
            ],
          });
        }
      } else {
        await interaction.editReply({
          embeds: [MusicUtils.createSongEmbed(songInfo, "queued")],
        });
      }
    } catch (error) {
      console.error("Error en comando play:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff4757")
            .setTitle("❌ Error")
            .setDescription("Hubo un error al procesar la canción."),
        ],
      });
    }
  },
};
