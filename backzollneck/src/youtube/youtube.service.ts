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

  // Progress ranges
  private readonly PROGRESS_RANGES = {
    PREPARE: { start: 0, end: 1 },
    INFO: { start: 1, end: 2 },
    DOWNLOAD: { start: 2, end: 50 },
    CLIENT_DOWNLOAD: { start: 50, end: 100 }
  };

  async downloadVideoFromYoutube(url: string, clientSocketId: any, format: boolean, resolution: string = 'best'): Promise<{ fileId: string }> {
    const { PREPARE, INFO, DOWNLOAD } = this.PROGRESS_RANGES;
    
    this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, PREPARE.start, 'Download wird vorbereitet...');
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Ungültige URL');
    }
    try {
      const fileId = uuidv4();
      const tempDir = '/media/tempfiles';
      const finalFilePath = path.join(tempDir, `${fileId}.${format ? 'mp4' : 'mp3'}`);

      // Get video title first
      this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, INFO.start, 'Video-Informationen werden abgerufen...');
      const { stdout: titleOutput } = await exec(`python3.11 -m yt_dlp --get-title "${url}"`, {
        env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` }
      });
      const title = titleOutput.trim().replace(/[^a-zA-Z0-9]/g, '_');
      
      this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, DOWNLOAD.start, format ? 'Video wird heruntergeladen...' : 'Audio wird heruntergeladen...');

      // Download with yt-dlp
      return new Promise((resolve, reject) => {
        let ytDlpOptions: string;
        if (format) {
          // Video download mit Auflösungs-Option
          if (resolution === '1080p') {
            // Max 1080p - bv* erlaubt alle Codecs (VP9, AV1, H.264)
            ytDlpOptions = `-f "bv*[height<=1080]+ba/b[height<=1080]" --merge-output-format mp4`;
          } else {
            // Beste verfügbare Auflösung - bv* wählt beste Qualität unabhängig vom Codec
            ytDlpOptions = `-f "bv*+ba/b" --merge-output-format mp4`;
          }
        } else {
          // Audio download
          ytDlpOptions = `-f bestaudio --extract-audio --audio-format mp3`;
        }

        // Use default client with user-agent and cookies for best format selection
        const command = `python3.11 -m yt_dlp ${ytDlpOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --newline --progress -o "${finalFilePath}" "${url}"`;
        
        console.log('=== yt-dlp Command ===');
        console.log(command);
        console.log('======================');
        
        const child = childProcess.exec(command, {
          env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` }
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('=== yt-dlp Error ===');
            console.error('stderr:', stderr);
            console.error('stdout:', stdout);
            console.error('====================');
            reject(new HttpException(`Fehler beim Herunterladen: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR));
            return;
          }
          console.log('=== yt-dlp Success ===');
          console.log('stdout:', stdout);
          console.log('======================');
          this.fileMap.set(fileId, title);
          this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, DOWNLOAD.end, 'Download abgeschlossen, Datei wird vorbereitet...');
          resolve({ fileId });
        });

        // Track progress - map yt-dlp progress (0-100%) to DOWNLOAD range
        let lastProgress = DOWNLOAD.start;
        const downloadRange = DOWNLOAD.end - DOWNLOAD.start;
        
        const handleProgressData = (data: string) => {
          // Match different progress formats from yt-dlp
          const progressMatch = data.match(/(\d+\.?\d*)%/) || data.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (progressMatch) {
            const ytDlpProgress = parseFloat(progressMatch[1]);
            // Map yt-dlp progress (0-100) to DOWNLOAD range (start-end)
            const progress = Math.floor(DOWNLOAD.start + (ytDlpProgress * downloadRange / 100));
            if (progress > lastProgress && progress <= DOWNLOAD.end) {
              lastProgress = progress;
              const infoText = format 
                ? `Video wird heruntergeladen... ${Math.floor(ytDlpProgress)}%`
                : `Audio wird heruntergeladen... ${Math.floor(ytDlpProgress)}%`;
              this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, progress, infoText);
            }
          }
        };
        
        // Listen to both stdout and stderr for progress
        child.stdout?.on('data', handleProgressData);
        child.stderr?.on('data', handleProgressData);
      });
    } catch (error: any) {
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
    } catch (error: any) {
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
      } catch (error: any) {
        throw new HttpException(`Datei konnte nicht vom Server gelöscht werden: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      throw new HttpException(`Datei konnte nicht vom Server gelöscht werden`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  testProgressUpdate(clientId: string) {
    this.youtubeGateway.handleYoutubeDownloadProgress(clientId, 50, 'Test: 50% erreicht');
  }

}