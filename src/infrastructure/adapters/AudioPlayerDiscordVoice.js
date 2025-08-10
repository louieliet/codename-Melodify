const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior } = require("@discordjs/voice");

class AudioPlayerDiscordVoice {
    constructor(client) {
        this.client = client;
        this.players = new Map(); // guildId -> { player, connection }
        this.wired = new Set();
    }

    ensurePlayer(guildId) {
        let entry = this.players.get(guildId);
        if (!entry) {
            const player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
            });
            entry = { player, connection: null };
            this.players.set(guildId, entry);
        }
        return entry;
    }

    async connect(guildId, voiceChannel) {
        const entry = this.ensurePlayer(guildId);
        if (!entry.connection) {
            entry.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            entry.connection.subscribe(entry.player);
        }
    }

    async subscribe(guildId, resource) {
        const entry = this.ensurePlayer(guildId);
        entry.player.play(resource);
    }

    async pause(guildId) {
        const entry = this.players.get(guildId);
        if (!entry) return false;
        return entry.player.pause();
    }

    async resume(guildId) {
        const entry = this.players.get(guildId);
        if (!entry) return false;
        return entry.player.unpause();
    }

    async stop(guildId) {
        const entry = this.players.get(guildId);
        if (!entry) return;
        entry.player.stop();
    }

    async disconnect(guildId) {
        const entry = this.players.get(guildId);
        if (!entry) return;
        try {
            entry.player.stop();
            entry.connection?.destroy();
        } finally {
            this.players.delete(guildId);
        }
    }

    onStatus(guildId, cb) {
        if (this.wired.has(guildId)) return;
        const entry = this.ensurePlayer(guildId);
        entry.player.on("stateChange", (oldState, newState) => cb(newState.status));
        entry.player.on(AudioPlayerStatus.Idle, () => cb("idle"));
        this.wired.add(guildId);
    }
}

module.exports = AudioPlayerDiscordVoice;


