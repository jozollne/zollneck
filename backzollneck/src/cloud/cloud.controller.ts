import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Get, Param, Res, Body, HttpException, HttpStatus, Delete } from '@nestjs/common';
import { CloudService } from './cloud.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';
import { SocketGateway } from 'src/socket.gateway';
import { Headers } from '@nestjs/common';
import { diskStorage } from 'multer';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('cloud')
export class CloudController {
  constructor(
    private readonly cloudService: CloudService,
    private readonly socketGateway: SocketGateway
  ) { }

  @Post('uploadFile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  @UseInterceptors(FilesInterceptor('file', 20, {
    limits: { fileSize: 70 * 1024 * 1024 * 1024 }, //70gb max
    storage: diskStorage({
      destination: '/media/filesystem',
      filename: (req, file, cb) => {
        const decodedName = decodeURIComponent(Buffer.from(file.originalname, 'latin1').toString('utf8'));
        cb(null, decodedName);
      }
    })
  }))
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (files.length === 0) {
      throw new HttpException('Keine Dateien zum Hochladen bereitgestellt.', HttpStatus.BAD_REQUEST);
    }
    return files;
  }

  @Post('createFolder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async createFolder(@Body() body: { dir: string; name: string }) {
    return this.cloudService.createFolder(body);
  }


  @Post('getFiles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async getFiles(@Body('dir') dir: string) {
    return this.cloudService.getFiles(dir);
  }

  @Post('download/:fileName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async downloadFile(@Param('fileName') fileName: string, @Res() res: Response, @Body('clientId') clientId: string) {
    try {
      await this.cloudService.downloadFile(fileName, res, clientId, this.socketGateway);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException('Fehler beim Herunterladen der Datei: ' + errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('downloadFolder/:folderName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async downloadFolder(@Param('folderName') folderName: string, @Res() res: Response, @Body('clientId') clientId: string) {
    try {
      await this.cloudService.downloadFolder(folderName, res, clientId, this.socketGateway);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException('Fehler beim Herunterladen des Ordners: ' + errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Post('deleteFromServer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')

  async deleteFile(@Body('dir') dir: string) {
    console.log(dir)
    try {
      const result = await this.cloudService.deleteFile(dir);
      return result;
    } catch (error) {
      console.log(error)
      throw new HttpException('File deletion failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
