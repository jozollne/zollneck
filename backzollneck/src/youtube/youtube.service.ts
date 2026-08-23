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

  // Various user agents to rotate through
  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ];

  private getUserAgent(attempt: number): string {
    return this.USER_AGENTS[attempt % this.USER_AGENTS.length];
  }

  private getProxyList(): string[] {
    return [
      'http://sp6d9d3op9:4ph4g~qDhGpqQD3eg6@isp.decodo.com:10001',
      'http://sp6d9d3op9:4ph4g~qDhGpqQD3eg6@isp.decodo.com:10002',
      'http://sp6d9d3op9:4ph4g~qDhGpqQD3eg6@isp.decodo.com:10003',
    ];
  }

  private getProxy(attempt: number = 1): string {
    // Rotate through proxies on each attempt
    const proxies = this.getProxyList();
    const proxyIndex = (attempt - 1) % proxies.length;
    const selectedProxy = proxies[proxyIndex];
    return process.env.YOUTUBE_PROXY || selectedProxy;
  }

  // Clean URL from query parameters and hash, keep only video ID
  private cleanYoutubeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      return url;
    } catch {
      // If URL parsing fails, try basic regex
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        return `https://youtu.be/${videoIdMatch[1]}`;
      }
      return url;
    }
  }

  async downloadVideoFromYoutube(url: string, clientSocketId: any, format: boolean, resolution: string = 'best'): Promise<{ fileId: string }> {
    const { PREPARE, INFO, DOWNLOAD } = this.PROGRESS_RANGES;
    
    this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, PREPARE.start, 'Download wird vorbereitet...');
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Ungültige URL');
    }
    
    try {
      // Clean URL from query parameters
      const cleanUrl = this.cleanYoutubeUrl(url);
      console.log(`Original URL: ${url}`);
      console.log(`Cleaned URL: ${cleanUrl}`);
      
      const fileId = uuidv4();
      const tempDir = '/media/tempfiles';
      const finalFilePath = path.join(tempDir, `${fileId}.${format ? 'mp4' : 'mp3'}`);

      // Get video title first
      this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, INFO.start, 'Video-Informationen werden abgerufen...');
      const { stdout: titleOutput } = await exec(`python3.11 -m yt_dlp --get-title "${cleanUrl}"`, {
        env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` }
      });
      const title = titleOutput.trim().replace(/[^a-zA-Z0-9]/g, '_');
      
      this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, DOWNLOAD.start, format ? 'Video wird heruntergeladen...' : 'Audio wird heruntergeladen...');

      // Download with yt-dlp using retry logic
      return new Promise((resolve, reject) => {
        let lastUsedProxy = '';
        const attemptDownload = (attempt: number = 1) => {
          let ytDlpOptions: string;
          
          if (format) {
            // Video download mit verschiedenen Format-Fallbacks
            if (attempt === 1) {
              // First attempt: best available format
              if (resolution === '1080p') {
                ytDlpOptions = `-f "bv*[height<=1080]+ba/b[height<=1080]" --merge-output-format mp4`;
              } else {
                ytDlpOptions = `-f "bv*+ba/b" --merge-output-format mp4`;
              }
            } else if (attempt === 2) {
              // Second attempt: try with web client
              ytDlpOptions = `-f "bv+ba" --merge-output-format mp4`;
            } else {
              // Third attempt: fallback to best available video
              ytDlpOptions = `-f "b" --merge-output-format mp4`;
            }
          } else {
            // Audio download
            ytDlpOptions = `-f bestaudio --extract-audio --audio-format mp3`;
          }

          // Simple approach - just use different clients without complex args
          let extractorArgs = '';
          const userAgent = this.getUserAgent(attempt);
          
          if (attempt === 1) {
            // First: Try standard (no special client)
            extractorArgs = ``;
          } else if (attempt === 2) {
            // Second: Android client (simple, widely supported)
            extractorArgs = `--extractor-args youtube:player_client=android`;
          } else if (attempt >= 3) {
            // Third: Web client (fallback)
            extractorArgs = `--extractor-args youtube:player_client=web`;
          }

          // Simplified anti-blocking: geo-bypass, proxy (optional), and longer timeout
          // Rotate proxies on each attempt to avoid blocking
          const proxy = this.getProxy(attempt);
          const proxyArg = proxy ? `--proxy "${proxy}"` : '';
          // Better download stability for proxy connections:
          // - Higher fragment retries for proxy drops
          // - Larger socket timeout
          // - Smaller HTTP chunk size for stability
          // - Throttled rate to avoid detection
          const command = `python3.11 -m yt_dlp ${ytDlpOptions} ${extractorArgs} --geo-bypass ${proxyArg} --no-part --socket-timeout 120 --fragment-retries 5 --http-chunk-size 102400 --throttled-rate 2M --user-agent "${userAgent}" --newline --progress -o "${finalFilePath}" "${cleanUrl}"`;
          
          const child = childProcess.exec(command, {
            env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` }
          }, (error, stdout, stderr) => {
            if (error) {
              console.error(`=== yt-dlp Error (Attempt ${attempt}/3) ===`);
              console.error('stderr:', stderr);
              console.error('stdout:', stdout);
              console.error('====================');
              
              // Check if it's a 403 error and retry
              // Check for recoverable errors that justify retry
            const is403 = stderr.includes('403') || stderr.includes('Forbidden');
            const isJsChallengeFailed = stderr.includes('challenge solving failed');
            const isFormatNotAvailable = stderr.includes('Requested format is not available');
            const isOnlyImages = stderr.includes('Only images are available');
            
            const shouldRetry = (is403 || isJsChallengeFailed || isFormatNotAvailable || isOnlyImages) && attempt < 3;
            
            if (shouldRetry) {
              setTimeout(() => attemptDownload(attempt + 1), 2000 * attempt);
              return;
            }
            
            // Special error messages for protected videos
            if (isOnlyImages) {
              reject(new HttpException('❌ Dieses Video ist durch YouTube geschützt (Geo-Sperre, SABR Experiment oder Altersbeschränkung). Versuche ein anderes Video oder update yt-dlp: pip install --upgrade yt-dlp', HttpStatus.INTERNAL_SERVER_ERROR));
              return;
            }
            
            if (is403) {
              reject(new HttpException('❌ Download von YouTube blockiert (403 Forbidden). Dieses Video hat erweiterten Schutz. Versuche: 1) Ein anderes Video, 2) yt-dlp updaten: pip install --upgrade yt-dlp', HttpStatus.INTERNAL_SERVER_ERROR));
              return;
            }
            
            reject(new HttpException(`Fehler beim Herunterladen: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR));
              return;
            }
            
            this.fileMap.set(fileId, title);
            this.youtubeGateway.handleYoutubeDownloadProgress(clientSocketId, DOWNLOAD.end, 'Download abgeschlossen, Datei wird vorbereitet...');
            resolve({ fileId });
          });

          // Track progress - map yt-dlp progress (0-100%) to DOWNLOAD range
          let lastProgress = DOWNLOAD.start;
          const downloadRange = DOWNLOAD.end - DOWNLOAD.start;
          
          const handleProgressData = (data: string) => {
            const progressMatch = data.match(/(\d+\.?\d*)%/) || data.match(/\[download\]\s+(\d+\.?\d*)%/);
            if (progressMatch) {
              const ytDlpProgress = parseFloat(progressMatch[1]);
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
          
          child.stdout?.on('data', handleProgressData);
          child.stderr?.on('data', handleProgressData);
        };

        // Start first attempt
        attemptDownload(1);
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