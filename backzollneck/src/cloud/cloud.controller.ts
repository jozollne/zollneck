import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Get, Param, Res, Body, HttpException, HttpStatus, Delete } from '@nestjs/common';
import { CloudService } from './cloud.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';
import { SocketGateway } from 'src/socket.gateway';
import { Headers } from '@nestjs/common';

@Controller('cloud')
export class CloudController {
  constructor(
    private readonly cloudService: CloudService,
    private readonly socketGateway: SocketGateway
  ) { }

  @Post('uploadFile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('file', 20, {
    limits: { fileSize: 5000 * 1024 * 1024 }
  }))
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    //umlaute im dateinamen korigieren
    files.forEach(file => {
      file.originalname = decodeURIComponent(Buffer.from(file.originalname, 'latin1').toString('utf8'));
    });

    console.log(files)
    const result = await this.cloudService.uploadFile(files)
    return result.fileName;
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  async getFiles() {
    return this.cloudService.getFiles();
  }

  @Post('download/:fileName')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Param('fileName') fileName: string, @Res() res: Response, @Body('clientId') clientId: string) {
    try {
      await this.cloudService.downloadFile(fileName, res, clientId, this.socketGateway);
    } catch (error) {
      throw new HttpException('Fehler beim Herunterladen der Datei: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('deleteFromServer/:fileId')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Param('fileId') fileId: string) {
      try {
          const result = await this.cloudService.deleteFile(fileId);
          return result;
      } catch (error) {
          console.log(error)
          throw new HttpException('File deletion failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }
  }
}
