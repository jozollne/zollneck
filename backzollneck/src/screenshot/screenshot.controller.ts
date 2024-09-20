import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ScreenshotService } from './screenshot.service';

@Controller('screenshot')
export class ScreenshotController {
  constructor(private readonly screenshotService: ScreenshotService) {}

  @Post('makeScreenshot')
  async getScreenshot(
    @Body('url') url: string,
    @Body('format') format: 'png' | 'jpeg',
    @Body('width') width: number,
    @Body('height') height: number,
    @Body('watermarkText') watermarkText?: string,    
    @Body('auth') auth?: { username: string, password: string },
  ) {
    const fileName = await this.screenshotService.captureScreenshot(url, format, width, height, watermarkText, auth);
    
    // Rückgabe der URL als JSON
    return { screenshotUrl: `https://zollneck.de/screenshots/${fileName}` };
  }
}
