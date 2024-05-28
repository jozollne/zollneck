import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class UploadtestService {
  async handleFileUpload(file: Express.Multer.File): Promise<any> {
    // Pfad, wo die Datei gespeichert wird
    const destinationPath = '/media/tempaudio';

    // Stellen Sie sicher, dass dieser Pfad existiert oder erstellen Sie ihn
    // (Hier sollten Sie eine entsprechende Logik implementieren, um den Ordner zu erstellen, falls er nicht existiert.)

    // Dateinamen festlegen
    const filename = `${Date.now()}-${file.originalname}`;

    // Datei im Zielverzeichnis speichern
    const fullPath = `${destinationPath}/${filename}`;
    const fs = require('fs');
    fs.writeFileSync(fullPath, file.buffer);

    return { message: 'Datei erfolgreich hochgeladen', path: fullPath };
  }
}
