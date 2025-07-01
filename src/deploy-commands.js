const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno
require("dotenv").config();

const commands = [];

// Obtener todos los archivos de comandos
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

// Cargar cada comando
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Comando cargado: ${command.data.name}`);
  } else {
    console.log(
      `⚠️ El comando en ${filePath} no tiene las propiedades requeridas.`
    );
  }
}

// Construir e instanciar el módulo REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Función para registrar comandos
async function deployCommands() {
  try {
    console.log(
      `🔄 Iniciando registro de ${commands.length} comandos slash...`
    );

    // Registrar comandos globalmente (puede tardar hasta 1 hora en aparecer)
    // Para desarrollo, puedes usar comandos de guild que aparecen inmediatamente
    let data;

    if (process.env.GUILD_ID) {
      // Registro en un servidor específico (instantáneo, para desarrollo)
      data = await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        ),
        { body: commands }
      );
      console.log(
        `✅ ${data.length} comandos registrados exitosamente en el servidor de desarrollo.`
      );
    } else {
      // Registro global (puede tardar hasta 1 hora)
      data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log(
        `✅ ${data.length} comandos registrados exitosamente globalmente.`
      );
    }
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
}

// Ejecutar si este archivo es llamado directamente
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
