import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Get, Param, Res, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CloudService } from './cloud.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('cloud')
export class CloudController {
  constructor(private readonly cloudService: CloudService) {}

  @Post('uploadFile')
/*   @UseGuards(JwtAuthGuard)
 */  @UseInterceptors(FilesInterceptor('file', 20, {
    limits: { fileSize: 5000 * 1024 * 1024 }
  }))
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    const result = await this.cloudService.uploadFile(files)
    return result;
  }

  @Get('files')
/*   @UseGuards(JwtAuthGuard)
 */  async getFiles() {
    return this.cloudService.getFiles();
  }

  @Get('download/:fileName')
  async downloadFile(@Param('fileName') fileName: string, @Res() res: Response) {
    console.log(fileName)
    try {
      const { filePath } = await this.cloudService.getFilePath(fileName);
      res.setHeader('Content-Disposition', fileName);
      res.sendFile(filePath);
    } catch (error) {
      throw new HttpException('Fehler beim Herunterladen der Datei: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
