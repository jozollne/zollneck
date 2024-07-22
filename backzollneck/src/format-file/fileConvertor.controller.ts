import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Get, Param, Res, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FormatFileService } from './fileConvertor.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('file')
export class FormatFileController {
  constructor(private formatFileService: FormatFileService) { }

  @Post('storeAndConvertFile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('file', 20, {
    limits: { fileSize: 5000 * 1024 * 1024 }
  }))
  async storeAndConvertFile(@UploadedFiles() files: Array<Express.Multer.File>, @Body('format') format: string) {
    const result = await this.formatFileService.storeAndConvertFile(files, format)
    return result;
  }

  @Get('download/:fileId')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const { filePath, filename } = await this.formatFileService.getFilePath(fileId);
      res.setHeader('Content-Disposition', filename);
      res.sendFile(filePath);
    } catch (error) {
      throw new HttpException('Fehler beim Herunterladen der Datei: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('delete/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    const result = await this.formatFileService.deleteFile(fileId);
    return result;
  }
}