import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as ytdl from 'ytdl-core';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import * as childProcess from 'child_process';
import { SocketGateway } from '../socket.gateway';

const exec = promisify(childProcess.exec);

@Injectable()
export class YoutubeService {
  constructor(private socketGateway: SocketGateway) { }

  private fileMap = new Map<string, string>();

  async downloadVideoFromYoutube(url: string, clientSocketId: any, format: boolean): Promise<{ fileId: string }> {
    this.socketGateway.handleDownloadProgress(clientSocketId, 0);
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Ungültige URL');
    }
    try {
      const videoId = ytdl.getURLVideoID(url);
      const info = await ytdl.getInfo(videoId);

      const fileId = uuidv4();
      const videoFilePath = path.join('/media/tempfiles/', `${fileId}_video.mp4`);
      const audioFilePath = path.join('/media/tempfiles/', `${fileId}_audio.mp4`);
      const finalFilePath = path.join('/media/tempfiles/', `${fileId}.${format ? 'mp4' : 'mp3'}`);
      const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_'); // Ersetzt Sonderzeichen im Titel

      const videoStream = ytdl(url, { quality: 'highestvideo' });
      const audioStream = ytdl(url, { quality: 'highestaudio' });

      videoStream.pipe(fs.createWriteStream(videoFilePath));
      audioStream.pipe(fs.createWriteStream(audioFilePath));

      let videoDownloaded = 0;
      let audioDownloaded = 0;

      videoStream.on('progress', (_, downloaded, total) => {
        videoDownloaded = downloaded;
        const progress = Math.round((videoDownloaded + audioDownloaded) * 50 / (total));
        this.socketGateway.handleDownloadProgress(clientSocketId, progress);
      });

      audioStream.on('progress', (_, downloaded, total) => {
        audioDownloaded = downloaded;
        const progress = Math.round((videoDownloaded + audioDownloaded) * 50 / (total));
        this.socketGateway.handleDownloadProgress(clientSocketId, progress);
      });

      await Promise.all([
        new Promise((resolve, reject) => {
          videoStream.on('finish', () => resolve(videoFilePath));
          videoStream.on('error', error => reject(new HttpException(`Fehler beim Herunterladen des Videos: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)));
        }),
        new Promise((resolve, reject) => {
          audioStream.on('finish', () => resolve(audioFilePath));
          audioStream.on('error', error => reject(new HttpException(`Fehler beim Herunterladen des Audios: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)));
        }),
      ]);

      if (format) {
        await exec(`ffmpeg -i "${videoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac "${finalFilePath}"`);
      } else {
        await exec(`ffmpeg -i "${audioFilePath}" "${finalFilePath}"`);
      }

      await fs.promises.unlink(videoFilePath);
      await fs.promises.unlink(audioFilePath);
      this.fileMap.set(fileId, title);
      return { fileId };
    } catch (error) {
      throw new HttpException(`Fehler beim Herunterladen des Videos: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFilePath(fileId: string): Promise<{ filePath: string, filename: string }> {
    try {
      const tempDir = '/media/tempfiles';
      const files = fs.readdirSync(tempDir);
      const file = files.find(f => f.startsWith(fileId));
      const filePath = file ? path.join(tempDir, file) : null;
      if (!filePath || !fs.existsSync(filePath)) {
        throw new HttpException('Datei wurde nicht gefunden.', HttpStatus.NOT_FOUND);
      }
      const filename = this.fileMap.get(fileId) + path.extname(filePath);
      return { filePath, filename };
    } catch (error) {
      throw new HttpException('Fehler beim Herunterladen der Datei: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFile(fileId: string): Promise<{ result: boolean }> {
    const tempDir = '/media/tempfiles';
    const files = fs.readdirSync(tempDir);
    if (files.find(f => f.startsWith(fileId))) {
      const file = files.find(f => f.startsWith(fileId));
      const filePath = file ? path.join(tempDir, file) : null;
      try {
        fs.promises.unlink(filePath);
        const result = true;
        return { result }
      } catch (error) {
        throw new HttpException(`Datei konnte nicht vom Server gelöscht werden: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      throw new HttpException(`Datei konnte nicht vom Server gelöscht werden`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  testProgressUpdate(clientId: string) {
    this.socketGateway.handleDownloadProgress(clientId, 50);
  }

}
