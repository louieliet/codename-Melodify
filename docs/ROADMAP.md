## Roadmap — Melodify (Calidad Pro + Clean Architecture)

### Objetivos
- Ofrecer audio de máxima calidad real en Discord: passthrough Opus nativo, buffers generosos, reconexión estable, y transcodificación solo cuando sea necesario.
- Mantener arquitectura limpia (Domain/Application/Infrastructure), testable y extensible.
- UX fluida: controles interactivos, autocomplete y gestión avanzada de cola.

### KPI de éxito
- ≥90% de reproducciones en passthrough Opus (YT itag 251).
- Latencia de inicio < 1.5 s; transición entre temas < 500 ms.
- Ratio de fallos de stream < 1% por día/guild.
- 0 fugas de listeners/procesos al desconectar.

---

## Fase 1 — Calidad de audio (finalización)

- [x] Passthrough WebM/Opus con `StreamType.WebmOpus` (play-dl).
- [x] Fallback `yt-dlp` con heurística Opus.
- [x] Transcodificación a Opus (48 kHz, 2ch, VBR 96–128 kbps) si la fuente no es Opus.
- [x] Buffers: `highWaterMark` 32 MB configurables.
- [x] Reconexión input (`-reconnect`) y colas de thread (`-thread_queue_size`).
- [x] Normalización opcional (FFmpeg `loudnorm`) vía config.
- [x] Metadata de calidad en `resource.metadata` + logs de estrategia.
- [ ] Prefetch del siguiente track (recurso adelantado) para reducir gaps.
- [ ] Ajuste dinámico de bitrate (128 → 96 kbps) al detectar jitter (opcional).

Crit. aceptación:
- Logs muestran “passthrough” en casos típicos YT; transcode solo cuando procede.
- Sin pops/cortes; sin clipping con normalización activada.

---

## Fase 2 — Reproducción y estabilidad

- [x] Auto-advance por guild: `idle` → `playNext`.
- [ ] Limpieza de listeners: borrar `wired` en `disconnect(guildId)` y al destruir conexión.
- [ ] Retries con backoff en `PlaybackService` si `createResource` falla (2–3 intentos).
- [ ] Cancelación limpia: matar FFmpeg/streams al `stop/skip/disconnect`.

Crit. aceptación:
- No quedan listeners ni procesos tras `disconnect`.
- Fallos transitorios recuperados sin colgar la cola.

---

## Fase 3 — UX y comandos

- [ ] Autocomplete en `/play`: sugerir top 5 (SearchPort).
- [ ] Botones en `nowplaying`/`queue`: Play/Pause/Skip/Stop/Shuffle/Loop.
- [ ] Comandos cola: `remove <index>`, `move <from> <to>`, `clear`, `shuffle`, `loop [queue|track]`, `seek <mm:ss>`.
- [ ] Modo radio/autoplay: relacionados cuando la cola termine.

Crit. aceptación:
- Menos slash repetitivo; acciones inline confiables.
- `seek` y `loop` consistentes con UI.

---

## Fase 4 — Observabilidad

- [x] Logger en `PlaybackService` para start/pause/resume/skip/stop.
- [ ] Log de métrica simple: reproducciones por guild, ratio passthrough/transcode, latencia de inicio, reintentos por estrategia.
- [ ] Nivel `debug` habilitable por env.
- [ ] (Opcional) Exportar métricas a Prometheus.

---

## Fase 5 — Configuración y despliegue

- [x] Flags de audio en `src/config.js` y leyendo `.env`:
  - `AUDIO_HIGH_WATER_MARK` (recomendado: 33554432)
  - `AUDIO_TARGET_BITRATE` (96/128)
  - `AUDIO_FORCE_TRANSCODE` (false)
  - `AUDIO_ENABLE_NORMALIZE` (false)
  - `AUDIO_INPUT_RECONNECT` (true)
- [ ] Documentación en `README` con guía de tuning y troubleshooting.
- [ ] PM2/systemd/Docker: auto-restart; límites de CPU/RAM.

---

## Fase 6 — Dominio y persistencia

- [ ] `QueueService`: `remove/move/seek/loop` + límites por guild.
- [ ] Repo persistente (opcional) para sobrevivir reinicios (Redis/archivo).
- [ ] Config por guild (bitrate preferido, idioma, roles DJ).

---

## Matriz de pruebas

- [ ] YT Opus (itag 251): passthrough, inicio < 1.5 s, transición < 500 ms.
- [ ] YT AAC/M4A: transcode correcto; CPU estable; sin clipping.
- [ ] Live stream: continuidad y reconexión.
- [ ] Red inestable: retries y degradación controlada (bitrate auto 128→96).
- [ ] Cola larga (≥1 h): sin leaks ni degradación.

---

## Riesgos y mitigaciones

- CPU por transcode: mantener VBR 96–128 kbps; filtros solo con flag.
- RAM por `highWaterMark`: 16–32 MB según host; monitorizar y ajustar.
- Cambios en YT: fallback robusto a `yt-dlp`; logs de causa de fallo.

---

## Plan de ejecución (semanal)

Semana 1:
- [ ] F2 limpieza listeners; F2 cancelación limpia.
- [ ] F1 prefetch siguiente track.
- [ ] Pruebas manuales matriz base.

Semana 2:
- [ ] F3 autocomplete + botones.
- [ ] F4 métricas básicas y nivel debug.
- [ ] README tuning + troubleshooting.

Semana 3:
- [ ] F3 comandos avanzados de cola.
- [ ] F6 persistencia opcional y config por guild.
- [ ] Ajustes finos de calidad/latencia.

---

## Rollback

- Flags de config para desactivar normalización o forzar passthrough.
- Fallback a solo play-dl o solo yt-dlp si una estrategia falla (toggle).
- Revertir a bitrate 96 kbps si hay jitter prolongado.


