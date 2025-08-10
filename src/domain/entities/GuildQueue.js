class GuildQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.currentSong = null;
        this.playing = false;
    }

    addSong(track) {
        this.songs.push(track);
    }

    nextSong() {
        this.currentSong = this.songs.shift() || null;
        return this.currentSong;
    }

    clear() {
        this.songs = [];
        this.currentSong = null;
        this.playing = false;
    }

    shuffle() {
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
        }
    }

    getInfo() {
        return {
            current: this.currentSong,
            queue: this.songs,
            playing: this.playing,
            length: this.songs.length,
        };
    }
}

module.exports = GuildQueue;


