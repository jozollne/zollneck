import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

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

  async getFiles(): Promise<{ name: string, path: string }[]> {
    const directoryPath = '/media/filesystem/';
    try {
      const files = fs.readdirSync(directoryPath);
      return files.map(file => ({
        name: file,
        path: path.join(directoryPath, file)
      }));
    } catch (err) {
      throw new HttpException('Fehler beim Lesen des Verzeichnisses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFilePath(fileName: string): Promise<{ filePath: string }> {
      const tempDir = '/media/filesystem';
      const filePath = path.join(tempDir, fileName);
      return { filePath };
  }
}
