class Track {
    constructor({ title, url, duration, thumbnail, author, views }) {
        this.title = title;
        this.url = url;
        this.duration = duration;
        this.thumbnail = thumbnail ?? null;
        this.author = author ?? "Desconocido";
        this.views = views ?? "0";
    }
}

module.exports = Track;


