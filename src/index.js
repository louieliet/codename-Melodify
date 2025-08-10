const { Client, GatewayIntentBits, Collection } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno
require("dotenv").config();

// Inicializar play-dl para búsquedas y streaming
const MusicUtils = require("./utils/MusicUtils");
MusicUtils.initialize();

// Bootstrap de capa de aplicación (repositorio y servicios)
const InMemoryQueueRepository = require("./infrastructure/repositories/InMemoryQueueRepository");
const QueueService = require("./application/services/QueueService");
const SearchPlayDL = require("./infrastructure/adapters/SearchPlayDL");
const AudioPlayerDiscordVoice = require("./infrastructure/adapters/AudioPlayerDiscordVoice");
const StreamYtDlp = require("./infrastructure/adapters/StreamYtDlp");
const PlaybackService = require("./application/services/PlaybackService");

// Crear el cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Colección para almacenar comandos
client.commands = new Collection();

// Contenedor sencillo (expuesto en client.app para comandos)
client.app = {
  queueRepository: new InMemoryQueueRepository(),
  queueService: null,
  search: new SearchPlayDL(),
  audioPlayer: null,
  streamProvider: null,
  playbackService: null,
};
client.app.queueService = new QueueService(client.app.queueRepository);
client.app.search.initialize?.();
client.app.audioPlayer = new AudioPlayerDiscordVoice(client);
client.app.streamProvider = new StreamYtDlp();
client.app.playbackService = new PlaybackService({
  audioPlayer: client.app.audioPlayer,
  streamProvider: client.app.streamProvider,
  queueRepository: client.app.queueRepository,
  logger: console,
});

// Auto-advance: cuando el player quede idle, pasar a la siguiente
client.app.audioPlayer.onStatus("global", async (status) => {
  // Los adapters internos ya mapean por guild; si necesitas granularidad por guild, 
  // expón onStatus por guildId durante la conexión
});

// Cargar comandos
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Comando cargado: ${command.data.name}`);
  } else {
    console.log(
      `⚠️ El comando en ${filePath} no tiene las propiedades requeridas.`
    );
  }
}

// Eliminado: client.queues ya no se usa (QueueService reemplaza)
delete client.queues;

// Evento cuando el bot está listo
client.once("ready", () => {
  console.log(`🎵 ${client.user.tag} está online y listo para tocar música!`);
  console.log(`📊 Conectado a ${client.guilds.cache.size} servidor(es)`);
  console.log(`👥 Sirviendo a ${client.users.cache.size} usuarios`);

  // Establecer actividad del bot
  client.user.setActivity("🎵 Música para todos", {
    type: "LISTENING",
  });

  // Establecer estado como online
  client.user.setStatus("online");
});

// Manejar interacciones de comandos slash
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      const guildId = interaction.guildId;
      const app = interaction.client.app;
      const id = interaction.customId;
      if (id === "np_pause") {
        const info = app.queueService.getQueueInfo(guildId);
        if (info.playing) await app.playbackService.pause(guildId);
        else await app.playbackService.resume(guildId);
        await interaction.reply({ content: info.playing ? "⏸️ Pausado" : "▶️ Reanudado", ephemeral: true });
      } else if (id === "np_skip") {
        await app.playbackService.skip(guildId);
        await interaction.reply({ content: "⏭️ Saltado", ephemeral: true });
      } else if (id === "np_stop") {
        await app.playbackService.stop(guildId);
        await interaction.reply({ content: "⏹️ Detenido", ephemeral: true });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  } catch (error) {
    console.error("Error ejecutando interacción:", error);
    const content = "❌ Hubo un error al procesar la interacción.";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    } catch { }
  }
});

// Manejar errores
client.on("error", (error) => {
  console.error("Error del cliente Discord:", error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);
