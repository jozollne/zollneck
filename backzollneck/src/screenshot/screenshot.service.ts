import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as moment from 'moment';
import * as sharp from 'sharp';
import * as fs from 'fs';

@Injectable()
export class ScreenshotService {
    private screenshotDir = path.join(__dirname, '../../../takenShots'); // Pfad aus der Konfiguration laden

    async captureScreenshot(
        url: string,
        format: 'png' | 'jpeg',
        width: number,
        height: number,
        watermarkText?: string,
        auth?: { username: string, password: string },
    ): Promise<string> {
        // 1. URL-Überprüfung
        const validURL = await this.isValidURL(url);
        if (!validURL) {
            throw new HttpException('Die URL ist ungültig', HttpStatus.BAD_REQUEST);
        }

        // 2. Browser öffnen
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // 3. Authentifizierung (falls notwendig)
        if (auth) {
            const base64Credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            await page.setExtraHTTPHeaders({
                Authorization: `Basic ${base64Credentials}`,
            });
        }

        // 4. Seite laden
        try {
            await page.goto(url, { waitUntil: 'networkidle0' });
        } catch (error) {
            await browser.close();
            throw new HttpException('Seite konnte nicht geladen werden oder Authentifizierung fehlgeschlagen', HttpStatus.BAD_REQUEST);
        }

        await page.setViewport({ width, height });

        // 5. Dateiname und Pfad generieren
        const parsedUrl = new URL(url);  // Die URL-Klasse wird verwendet, um die URL zu parsen
        const domain = parsedUrl.hostname;
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const fileName = `${timestamp}_${domain}.${format}`;
        const filePath = path.join(this.screenshotDir, fileName);

        // 6. Screenshot erstellen und speichern
        await page.screenshot({ path: filePath, type: format });
        await browser.close();

        // 7. Wasserzeichen hinzufügen (falls notwendig)
        if (watermarkText) {
            const watermarkedFileName = `watermarked_${fileName}`;
            const watermarkedFilePath = path.join(this.screenshotDir, watermarkedFileName);

            await sharp(filePath)
                .composite([
                    {
                        input: Buffer.from(
                            `<svg width="${width}" height="${height}">
                                <text x="90%" y="95%" font-size="48" fill="red" text-anchor="middle" opacity="0.7">${watermarkText}</text>
                            </svg>`
                        ),
                    },
                ])
                .toFile(watermarkedFilePath);

            fs.unlinkSync(filePath); // Original löschen, wenn Wasserzeichen hinzugefügt wurde
            return watermarkedFileName; // Rückgabe des Dateinamens mit Wasserzeichen
        }

        // 8. Rückgabe des Dateinamens
        return fileName;
    }

    // URL-Validierung
    private async isValidURL(url: string): Promise<boolean> {
        try {
            new URL(url);
            return true;
        } catch (err) {
            return false;
        }
    }
}
