const GuildQueue = require("../../domain/entities/GuildQueue");

class InMemoryQueueRepository {
    constructor() {
        this.guildIdToQueue = new Map();
    }

    get(guildId) {
        return this.guildIdToQueue.get(guildId) || null;
    }

    save(queue) {
        this.guildIdToQueue.set(queue.guildId, queue);
    }

    ensure(guildId) {
        let q = this.get(guildId);
        if (!q) {
            q = new GuildQueue(guildId);
            this.save(q);
        }
        return q;
    }

    clear(guildId) {
        this.guildIdToQueue.delete(guildId);
    }
}

module.exports = InMemoryQueueRepository;


