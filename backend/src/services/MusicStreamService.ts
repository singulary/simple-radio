import { Response } from "express";
import { v4 as uuid } from "uuid";
import throttle from 'throttle';
import fs from 'fs';
import { parseFile } from 'music-metadata';

export class MusicStreamService {
  public readonly id: string = uuid();
  private clients: any = {};
  public clientsCount: number = 0;
  private stream: fs.ReadStream | undefined;
  private throttle: throttle | undefined;
  public playing: boolean = false;
  public queue: string[] = [];

  constructor(
    public readonly owner: string,
    public readonly connectionsLimit: number
  ) { }

  async start(music: string) {
    const { format: { bitrate } } = await parseFile(music);

    if (!bitrate)
      return false;

    this.throttle?.destroy();
    this.stream?.close();
    this.stream?.destroy();

    this.stream = fs.createReadStream(music);
    this.throttle = new throttle(bitrate / 8);

    this.stream.pipe(this.throttle).on('data', (chunk) => {
      for (const client of Object.values(this.clients))
        (<any>client).write(chunk);
    });
    this.stream.on('end', () => {
      this.playing = false;
      this.throttle?.destroy();
    });

    this.playing = true;

    return true;
  }

  async addCLient(client: Response) {
    if (await this.getClientCount() + 1 > this.connectionsLimit) {
      client.end();
      return false;
    }
    const id = uuid();

    client.setHeader('content-type', 'audio/mp3');
    client.on('close', () => this.removeCLient(id));

    this.clients[id] = client;
    this.clientsCount++;
    return true;
  }

  async removeCLient(id: string) {
    if (!this.clients[id])
      return false;

    this.clients[id].end();
    delete this.clients[id];
    this.clientsCount--;
    return true;
  }

  async getClients() { return Object.keys(this.clients); }

  async getClientCount() { return Object.keys(this.clients).length; }

  async pause() {
    if (this.stream && !this.stream.isPaused) {
      this.stream.pause();
      this.playing = false;

      return true;
    }

    return false;
  }

  async resume() {
    if (this.stream && this.stream.isPaused) {
      this.stream.resume();
      this.playing = true;
      return true;
    }

    return false;
  }
}