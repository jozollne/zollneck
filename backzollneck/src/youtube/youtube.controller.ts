import { Controller, Post, Body, Res, UseGuards, HttpStatus, HttpException, Get, Param, Delete } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { Response } from 'express';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) { }

  @Post('downloadFromYoutube')
  async download(@Body('url') url: string, @Body('clientId') clientId: string, @Body('format') format: boolean) {
    try {
      const result = await this.youtubeService.downloadVideoFromYoutube(url, clientId, format);
      return result
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('downloadFromServer/:fileId')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const { filePath, filename } = await this.youtubeService.getFilePath(fileId);
      res.setHeader('Content-Disposition', filename);
      res.sendFile(filePath);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('deleteFromServer/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    const result = await this.youtubeService.deleteFile(fileId);
    return result;
  }

  @Post('testProgress')
  testProgress(@Body('clientId') clientId: string) {
    this.youtubeService.testProgressUpdate(clientId);
    return { message: 'Test progress sent' };
  }
}