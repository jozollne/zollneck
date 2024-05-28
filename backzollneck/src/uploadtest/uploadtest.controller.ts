import { Controller, Post, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadtestService } from './uploadtest.service';

@Controller('uploadtest')
export class UploadtestController {
  constructor(private readonly uploadtestService: UploadtestService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadtestService.handleFileUpload(file);
  }
}
