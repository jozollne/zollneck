import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import * as childProcess from 'child_process';
import { SocketGateway } from '../socket.gateway';

const exec = promisify(childProcess.exec);

@Injectable()
export class YoutubeService {
  constructor(private youtubeGateway: SocketGateway) { }

  private fileMap = new Map<string, string>();

  async downloadVideoFromYoutube(url: string, clientSocketId: any, format: boolean): Promise<{ fileId: string }> {
    this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, 0);
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Ungültige URL');
    }
    try {
      const fileId = uuidv4();
      const tempDir = '/media/tempfiles';
      const finalFilePath = path.join(tempDir, `${fileId}.${format ? 'mp4' : 'mp3'}`);

      // Get video title first
      const { stdout: titleOutput } = await exec(`yt-dlp --get-title "${url}"`);
      const title = titleOutput.trim().replace(/[^a-zA-Z0-9]/g, '_');
      
      this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, 10);

      // Download with yt-dlp
      return new Promise((resolve, reject) => {
        const ytDlpOptions = format 
          ? `-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4`
          : `-f bestaudio --extract-audio --audio-format mp3`;

        const command = `yt-dlp ${ytDlpOptions} -o "${finalFilePath}" "${url}"`;
        
        const child = childProcess.exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error('yt-dlp error:', stderr);
            reject(new HttpException(`Fehler beim Herunterladen: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR));
            return;
          }
          this.fileMap.set(fileId, title);
          this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, 100);
          resolve({ fileId });
        });

        // Track progress
        let lastProgress = 10;
        child.stderr?.on('data', (data: string) => {
          const progressMatch = data.match(/(\d+\.?\d*)%/);
          if (progressMatch) {
            const progress = Math.min(95, Math.floor(parseFloat(progressMatch[1])));
            if (progress > lastProgress) {
              lastProgress = progress;
              this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, progress);
            }
          }
        });
      });
    } catch (error) {
      console.error(error);
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
    this.youtubeGateway.handleYoutubeDownloadProgress(clientId, 50);
  }

}