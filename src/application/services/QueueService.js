class QueueService {
    constructor(queueRepository) {
        this.queueRepository = queueRepository;
    }

    getOrCreate(guildId) {
        return this.queueRepository.ensure(guildId);
    }

    addSong(guildId, track) {
        const queue = this.getOrCreate(guildId);
        queue.addSong(track);
        this.queueRepository.save(queue);
        return queue;
    }

    getQueueInfo(guildId) {
        const queue = this.queueRepository.get(guildId);
        return queue
            ? queue.getInfo()
            : { current: null, queue: [], playing: false, length: 0 };
    }

    clear(guildId) {
        const queue = this.queueRepository.get(guildId);
        if (queue) {
            queue.clear();
            this.queueRepository.save(queue);
        }
    }

    shuffle(guildId) {
        const queue = this.queueRepository.get(guildId);
        if (queue) {
            queue.shuffle();
            this.queueRepository.save(queue);
        }
    }
}

module.exports = QueueService;


