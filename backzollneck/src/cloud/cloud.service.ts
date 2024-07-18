import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import { SocketGateway } from 'src/socket.gateway';
import { Response } from 'express';

@Injectable()
export class CloudService {
  async uploadFile(files: Array<Express.Multer.File>): Promise<{ fileName: string }> {
    if (files.length === 0) {
      throw new HttpException('Keine Dateien zum Hochladen bereitgestellt.', HttpStatus.BAD_REQUEST);
    }

    for (const file of files) {
      const tempDir = '/media/filesystem';
      const fileName = file.originalname;
      const originalPath = path.join(tempDir, fileName);

      fs.writeFileSync(originalPath, file.buffer);
      return { fileName };
    }
  }

  async getFiles(): Promise<{ name: string, path: string, size: number, created: Date }[]> {
    const directoryPath = '/media/filesystem/';
    try {
      const files = fs.readdirSync(directoryPath);
      return files.map(file => {
        const filePath = path.join(directoryPath, file);
        const fileStats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: fileStats.size,
          created: fileStats.birthtime,
        };
      });
    } catch (err) {
      throw new HttpException('Fehler beim Lesen des Verzeichnisses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  

  async getFilePath(fileName: string): Promise<{ filePath: string }> {
      const tempDir = '/media/filesystem';
      const filePath = path.join(tempDir, fileName);
      return { filePath };
  }

  async downloadFile(fileName: string, res: Response, clientId: string, socketGateway: SocketGateway) {
    const { filePath } = await this.getFilePath(fileName);
    const fileSize = fs.statSync(filePath).size;
    let downloaded = 0;

    res.setHeader('Content-Disposition', `${fileName}`);

    const readStream = createReadStream(filePath);
    readStream.on('data', (chunk) => {
      downloaded += chunk.length;
      const progress = (downloaded / fileSize) * 100;
      socketGateway.handleDownloadProgress(clientId, { fileName, progress });
    });

    readStream.pipe(res);
    readStream.on('end', () => {
      socketGateway.handleDownloadProgress(clientId, { fileName, progress: 100 });
    });
  }

  async deleteFile(fileId: string) {
    const tempDir = '/media/filesystem';
    const files = fs.readdirSync(tempDir);
    console.log(fileId)
    if (files.find(f => f.startsWith(fileId))) {
      const file = files.find(f => f.startsWith(fileId));
      const filePath = file ? path.join(tempDir, file) : null;
      try {
        fs.promises.unlink(filePath);
        return true
      } catch (error) {
        throw new HttpException(`Datei konnte nicht vom Server gelöscht werden: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      throw new HttpException(`Datei konnte nicht vom Server gelöscht werden`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

