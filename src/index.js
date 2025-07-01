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

// Mapa para almacenar las colas de música por servidor
client.queues = new Map();

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
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No se encontró el comando ${interaction.commandName}.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error ejecutando comando:", error);
    const content = "❌ Hubo un error al ejecutar este comando.";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});

// Manejar errores
client.on("error", (error) => {
  console.error("Error del cliente Discord:", error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);
