# 🎵 Melodify - Bot de Música para Discord

Un bot de Discord moderno y completo para reproducir música desde YouTube con una interfaz elegante y comandos fáciles de usar.

## ✨ Características

- 🎵 Reproducción de música desde YouTube
- 🔍 Búsqueda automática por nombre o URL
- 📋 Sistema de cola con paginación
- ⏯️ Controles completos (play, pause, resume, skip, stop)
- 🎛️ Comandos slash modernos
- 🚀 Respuestas rápidas y embeds elegantes
- 🔒 Verificaciones de permisos y canales de voz

## 🎮 Comandos

| Comando           | Descripción                                     |
| ----------------- | ----------------------------------------------- |
| `/play <canción>` | Reproduce música desde YouTube (URL o búsqueda) |
| `/pause`          | Pausa la reproducción actual                    |
| `/resume`         | Reanuda la reproducción                         |
| `/skip`           | Salta la canción actual                         |
| `/stop`           | Detiene la música y limpia la cola              |
| `/queue [página]` | Muestra la cola de reproducción                 |
| `/nowplaying`     | Muestra la canción actual                       |
| `/disconnect`     | Desconecta el bot del canal de voz              |
| `/help`           | Muestra todos los comandos disponibles          |

## 🚀 Instalación

### Prerrequisitos

- Node.js 16.9.0 o superior
- npm o yarn
- Una aplicación de Discord Bot

### 1. Crear una aplicación de Discord

1. Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a la sección "Bot" y crea un bot
4. Copia el token del bot
5. Ve a la sección "OAuth2" > "URL Generator"
6. Selecciona los scopes: `bot` y `applications.commands`
7. Selecciona los permisos: `Connect`, `Speak`, `Use Voice Activity`, `Send Messages`, `Use Slash Commands`

### 2. Configurar el proyecto

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd codename-Melodify

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env
```

### 3. Configurar variables de entorno

Edita el archivo `.env` con tus datos:

```env
DISCORD_TOKEN=tu_token_del_bot_aqui
CLIENT_ID=tu_client_id_aqui
GUILD_ID=tu_guild_id_aqui_opcional
```

- `DISCORD_TOKEN`: Token de tu bot de Discord
- `CLIENT_ID`: ID de tu aplicación de Discord
- `GUILD_ID`: (Opcional) ID de tu servidor para comandos de desarrollo

### 4. Registrar comandos slash

```bash
# Registrar comandos
node src/deploy-commands.js
```

### 5. Iniciar el bot

```bash
# Modo producción
npm start

# Modo desarrollo (con auto-restart)
npm run dev
```

## 🛠️ Desarrollo

### Estructura del proyecto

```
src/
├── index.js              # Archivo principal del bot
├── deploy-commands.js    # Script para registrar comandos
├── commands/             # Comandos slash
│   ├── play.js
│   ├── pause.js
│   ├── resume.js
│   ├── skip.js
│   ├── stop.js
│   ├── queue.js
│   ├── nowplaying.js
│   ├── disconnect.js
│   └── help.js
└── utils/                # Utilidades
    ├── Queue.js          # Manejo de cola de música
    └── MusicUtils.js     # Utilidades para música
```

### Añadir nuevos comandos

1. Crea un nuevo archivo en `src/commands/`
2. Sigue la estructura de los comandos existentes
3. Ejecuta `node src/deploy-commands.js` para registrar el comando
4. Reinicia el bot

## 📦 Dependencias principales

- **discord.js**: Librería principal para Discord
- **@discordjs/voice**: Manejo de audio y voz
- **ytdl-core**: Descarga de audio de YouTube
- **play-dl**: Búsqueda y streaming de música
- **ffmpeg-static**: Procesamiento de audio

## ⚠️ Notas importantes

- El bot requiere FFmpeg para funcionar correctamente
- Asegúrate de que el bot tenga permisos para unirse y hablar en canales de voz
- Los comandos slash pueden tardar hasta 1 hora en aparecer globalmente
- Para desarrollo, usa `GUILD_ID` para comandos instantáneos en tu servidor

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🎵 ¡Disfruta la música!

¿Tienes preguntas o sugerencias? ¡Abre un issue o contribuye al proyecto!
