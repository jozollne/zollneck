import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const exec = promisify(childProcess.exec);

@Injectable()
export class FormatFileService {
  private fileMap = new Map<string, string>();

  async storeAndConvertFile(files: Array<Express.Multer.File>, format: string): Promise<{ fileId: string }> {
    if (files.length === 0) {
      throw new HttpException('Keine Dateien zum Konvertieren bereitgestellt.', HttpStatus.BAD_REQUEST);
    }

    for (const file of files) {
      const tempDir = '/media/tempfiles';
      const fileId = uuidv4();
      const originalPath = path.join(tempDir, `${fileId}${path.extname(file.originalname)}`);
      const convertedPath = path.join(tempDir, `${fileId}${format}`);
      const newFileName = file.originalname.replace(/\.\w+$/, '') + format;

      if (file.originalname.endsWith(format)) {
        throw new HttpException(`Es ist nicht erlaubt, eine ${format}-Datei in eine ${format}-Datei umzuwandeln.`, HttpStatus.BAD_REQUEST);
      }

      fs.writeFileSync(originalPath, file.buffer);

      try {
        await exec(`ffmpeg -i "${originalPath}" "${convertedPath}"`);
        await fs.promises.chmod(convertedPath, 0o666);
      } catch (error) {
        throw new HttpException(`Fehler bei der Konvertierung: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
      } finally {
        await fs.promises.unlink(originalPath);
        console.log("------------------------------")
        console.log(`Datei erfolgreich formatiert: ${file.originalname} (Größe: ${file.size} Bytes)`);
        console.log("------------------------------")
      }

      this.fileMap.set(fileId, newFileName);
      return { fileId };
    }
  }

async getFilePath(fileId: string): Promise<{ filePath: string, filename: string }> {
  if (this.fileMap.get(fileId)) {
    const filename = this.fileMap.get(fileId);
    const tempDir = '/media/tempfiles';
    const files = fs.readdirSync(tempDir);
    const file = files.find(f => f.startsWith(fileId));
    const filePath = file ? path.join(tempDir, file) : null;
    return { filePath, filename };
  } else {
    const filesDirPath = "/home/jozollne/files/";

    try {
      const files = await fs.promises.readdir(filesDirPath);
      const file = files.find(f => f === fileId);
      if (file) {
        const filePath = path.join(filesDirPath, file);
        console.log(`File ${filePath} found!`);
        return { filePath, filename: fileId };
      } else {
        throw new HttpException('Datei wurde nicht gefunden.', HttpStatus.NOT_FOUND);
      }
    } catch (err) {
      console.error('Error getting directory information.', err);
      throw new HttpException('Fehler beim Zugriff auf das Verzeichnis.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

  async deleteFile(fileId: string): Promise < { result: boolean } > {
  const tempDir = '/media/tempfiles';
  const files = fs.readdirSync(tempDir);
  if(files.find(f => f.startsWith(fileId))) {
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

  async downloadFile(fileId: string) {

}
}
