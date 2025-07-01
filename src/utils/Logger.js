const winston = require("winston");
const path = require("path");

class Logger {
  static instance = null;

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: "info",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: "melodify-bot" },
        transports: [
          // Escribir logs de error a archivo
          new winston.transports.File({
            filename: "bot-error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 3,
          }),
          // Escribir todos los logs a archivo
          new winston.transports.File({
            filename: "bot.log",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          // Mostrar en consola en desarrollo
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            ),
          }),
        ],
      });
    }
    return Logger.instance;
  }

  static info(message, meta = {}) {
    Logger.getInstance().info(message, meta);
  }

  static error(message, error = null, meta = {}) {
    const errorMeta = error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
          ...meta,
        }
      : meta;

    Logger.getInstance().error(message, errorMeta);
  }

  static warn(message, meta = {}) {
    Logger.getInstance().warn(message, meta);
  }

  static debug(message, meta = {}) {
    Logger.getInstance().debug(message, meta);
  }

  static logPlaybackError(song, error, retryCount = 0) {
    Logger.error("Playback error occurred", error, {
      song: {
        title: song.title,
        url: song.url,
        author: song.author,
      },
      retryCount,
      timestamp: new Date().toISOString(),
    });
  }

  static logSuccessfulPlayback(song) {
    Logger.info("Song started playing successfully", {
      song: {
        title: song.title,
        url: song.url,
        author: song.author,
        duration: song.duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = Logger;
