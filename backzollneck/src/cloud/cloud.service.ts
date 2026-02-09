import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { createReadStream } from 'fs';
import { SocketGateway } from 'src/socket.gateway';
import { Response } from 'express';

@Injectable()
export class CloudService {
  async uploadFiles(files: Array<Express.Multer.File>): Promise<Array<{ fileName: string }>> {
    if (files.length === 0) {
      throw new HttpException('Keine Dateien zum Hochladen bereitgestellt.', HttpStatus.BAD_REQUEST);
    }

    const fileNames = files.map(file => ({ fileName: file.filename }));
    return fileNames;
  }


  async getFiles(dir: string): Promise<{ name: string, path: string, size: number, created: Date, isFile: boolean }[]> {
    const directoryPath = dir;
    try {
      const files = fs.readdirSync(directoryPath);
      return files.map(file => {
        const filePath = path.join(directoryPath, file);
        const fileStats = fs.statSync(filePath);
        let size = fileStats.size;
        if (fileStats.isDirectory()) {
          size = this.calculateFolderSize(filePath);
        }

        return {
          name: file,
          path: filePath,
          size: size,
          created: fileStats.birthtime,
          isFile: !fileStats.isDirectory()
        };
      });
    } catch (err) {
      throw new HttpException('Fehler beim Lesen des Verzeichnisses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  async getFilePath(fileName: string, dir: string): Promise<{ filePath: string }> {
    const filePath = path.join(dir, fileName);
    return { filePath };
  }

  async downloadFile(fileName: string, dir: string, res: Response, clientId: string, socketGateway: SocketGateway) {
    const { filePath } = await this.getFilePath(fileName, dir);
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

  async downloadFolder(folderName: string, dir: string, res: Response, clientId: string, socketGateway: SocketGateway) {
    const folderPath = path.join(dir, folderName);
    const tempZipPath = path.join('/media/tempfiles', `${folderName}.zip`);

    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new HttpException('Ordner existiert nicht oder ist kein Verzeichnis.', HttpStatus.BAD_REQUEST);
    }

    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw new HttpException('Fehler beim Erstellen des Archivs: ' + err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    });

    let totalBytes = 0;
    let processedBytes = 0;

    totalBytes = this.calculateFolderSize(folderPath);

    archive.on('data', (chunk) => {
      processedBytes += chunk.length;
      const percentage = (processedBytes / totalBytes) * 50;
      socketGateway.handleDownloadProgress(clientId, { fileName: folderName, progress: percentage });
    });

    archive.pipe(output);
    archive.directory(folderPath, folderName);
    archive.finalize();

    output.on('close', () => {
      console.log(`ZIP-Datei wurde erfolgreich erstellt: ${tempZipPath}`);
      let downloadedBytes = 0;
      const zipFileSize = fs.statSync(tempZipPath).size;

      socketGateway.handleDownloadProgress(clientId, { fileName: folderName, progress: 50 });

      res.setHeader('Content-Disposition', `${folderName}.zip`);

      const readStream = fs.createReadStream(tempZipPath);
      readStream.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const downloadPercentage = 50 + ((downloadedBytes / zipFileSize) * 50);
        socketGateway.handleDownloadProgress(clientId, { fileName: folderName, progress: downloadPercentage });
      });

      readStream.pipe(res);

      readStream.on('end', () => {
        socketGateway.handleDownloadProgress(clientId, { fileName: folderName, progress: 100 });
        fs.unlink(tempZipPath, (err) => {
          if (err) {
            console.error('Fehler beim Löschen der temporären Datei:', err);
          }
        });
      });
    });
  }

  createFolder = async (body: { dir: string; name: string }) => {
    try {
      const newFolderPath = path.join(body.dir, body.name);

      if (!fs.existsSync(newFolderPath)) {
        await fs.promises.mkdir(newFolderPath, { recursive: true });
        return HttpStatus.CREATED
      } else {
        throw new HttpException(`Der Ordner '${newFolderPath}' existiert bereits.`, HttpStatus.CONFLICT);
      }
    } catch (error) {
      throw new HttpException(`Fehler beim erstellen des Ordners: ` + error, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  };

  calculateFolderSize = (dir: string) => {
    const files = fs.readdirSync(dir);
    let size = 0;
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += this.calculateFolderSize(filePath);
      } else {
        size += stats.size;
      }
    });
    return size;
  };

  async deleteFile(filePath: string) {
    try {
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
        return HttpStatus.CREATED
      } else {
        await fs.promises.unlink(filePath);
        return HttpStatus.CREATED
      }
    } catch (error) {
      throw new HttpException(`Datei oder Ordner konnte nicht vom Server gelöscht werden: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

