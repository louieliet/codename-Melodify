const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MusicUtils = require("../utils/MusicUtils");
const EmbedsFactory = require("../interfaces/discord/embeds/EmbedsFactory");

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
      const app = interaction.client.app;
      const hasNewPlayback = Boolean(app?.playbackService);
      if (hasNewPlayback) {
        await app.audioPlayer.connect(guild.id, voiceChannel);
        // Auto-advance: cuando el player quede idle, reproducir la siguiente
        app.audioPlayer.onStatus(guild.id, async (status) => {
          if (status === "idle") {
            try {
              await app.playbackService.playNext(guild.id);
            } catch { }
          }
        });
      }

      let songInfo;
      const search = interaction.client.app?.search;

      // Fase 1: usar el adapter de búsqueda si está disponible; fallback a MusicUtils
      if (search) {
        if (MusicUtils.isValidURL(query)) {
          if (MusicUtils.isYouTubeURL(query)) {
            songInfo = await search.getInfo(query);
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
          const results = await search.search(query, 1);
          if (!results.length) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor("#ff4757")
                  .setTitle("❌ Sin resultados")
                  .setDescription("No se encontraron canciones con esa búsqueda."),
              ],
            });
          }
          songInfo = results[0];
        }
      } else {
        // Fallback legacy a MusicUtils
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
          const searchResults = await MusicUtils.searchYouTube(query, 1);
          if (searchResults.length === 0) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor("#ff4757")
                  .setTitle("❌ Sin resultados")
                  .setDescription("No se encontraron canciones con esa búsqueda."),
              ],
            });
          }
          songInfo = searchResults[0];
        }
      }

      // Determinar si estaba vacía antes de encolar
      const existing = app.queueRepository.get(guild.id);
      const wasEmpty = !existing || (!existing.playing && (existing.songs?.length || 0) === 0);

      // Encolar en la nueva capa de aplicación
      app.queueService.addSong(guild.id, songInfo);

      // Si estaba vacía, empezar la reproducción con la nueva capa
      if (wasEmpty) {
        const started = await app.playbackService.playNext(guild.id);
        if (started) {
          await interaction.editReply({
            embeds: [EmbedsFactory.song(songInfo, "playing")],
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
          embeds: [EmbedsFactory.song(songInfo, "queued")],
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
