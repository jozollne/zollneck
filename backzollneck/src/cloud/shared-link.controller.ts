import {
  Controller, Get, Post, Patch, Body, Param, Query, Req, Res,
  UseGuards, UseInterceptors, UploadedFiles, HttpException, HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { SharedLinkService, RequestMeta } from './shared-link.service';
import { CreateSharedLinkDto } from './dto/create-shared-link.dto';
import { UpdateSharedLinkDto } from './dto/update-shared-link.dto';

function getRequestMeta(req: Request): RequestMeta {
  let ip = req.ip || null;
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return { ip, userAgent: req.get('User-Agent') ?? null };
}

@Controller('cloud/shared')
export class SharedLinkController {
  constructor(private readonly sharedLinkService: SharedLinkService) { }

  // ---------- Management (authenticated) ----------

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async create(@Req() req: any, @Body() dto: CreateSharedLinkDto) {
    return this.sharedLinkService.createSharedLink(req.user.username, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async list(@Req() req: any) {
    return this.sharedLinkService.listSharedLinks(req.user.username);
  }

  @Post('lookup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async lookup(@Req() req: any, @Body('paths') paths: string[]) {
    return this.sharedLinkService.findSharesForPaths(req.user.username, paths ?? []);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cloud')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSharedLinkDto) {
    return this.sharedLinkService.updateSharedLink(id, req.user.username, dto);
  }

  // ---------- Public consumption (no auth) ----------

  @Get(':id/meta')
  async meta(@Param('id') id: string, @Req() req: Request) {
    try {
      return await this.sharedLinkService.getPublicMeta(id, getRequestMeta(req));
    } catch (error) {
      throw error instanceof HttpException ? error : new HttpException('Fehler beim Laden des Links.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':id/unlock')
  async unlock(@Param('id') id: string, @Body('password') password: string, @Req() req: Request) {
    try {
      return await this.sharedLinkService.unlock(id, password, getRequestMeta(req));
    } catch (error) {
      throw error instanceof HttpException ? error : new HttpException('Fehler beim Entsperren des Links.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/browse')
  async browse(
    @Param('id') id: string,
    @Query('path') relPath: string,
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    try {
      return await this.sharedLinkService.listContents(id, relPath ?? '', token, getRequestMeta(req));
    } catch (error) {
      throw error instanceof HttpException ? error : new HttpException('Fehler beim Laden der Inhalte.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Query('path') relPath: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      await this.sharedLinkService.download(id, relPath ?? '', token, res, getRequestMeta(req));
    } catch (error) {
      if (!res.headersSent) {
        const httpError = error instanceof HttpException ? error : new HttpException('Fehler beim Download.', HttpStatus.INTERNAL_SERVER_ERROR);
        res.status(httpError.getStatus()).json({ message: httpError.message });
      }
    }
  }

  @Get(':id/qrcode.png')
  async qrcode(@Param('id') id: string, @Res() res: Response) {
    try {
      const buffer = await this.sharedLinkService.getQrCodePng(id);
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      const httpError = error instanceof HttpException ? error : new HttpException('Fehler beim Erstellen des QR-Codes.', HttpStatus.INTERNAL_SERVER_ERROR);
      res.status(httpError.getStatus()).json({ message: httpError.message });
    }
  }

  @Post(':id/upload')
  @UseInterceptors(FilesInterceptor('file', 20, {
    limits: { fileSize: 100 * 1024 * 1024 * 1024 },
    storage: diskStorage({
      destination: '/media/tempfiles',
      filename: (req, file, cb) => {
        const decodedName = decodeURIComponent(Buffer.from(file.originalname, 'latin1').toString('utf8'));
        cb(null, `${Date.now()}-${decodedName}`);
      },
    }),
  }))
  async upload(
    @Param('id') id: string,
    @Query('token') token: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: Request,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new HttpException('Keine Dateien zum Hochladen bereitgestellt.', HttpStatus.BAD_REQUEST);
      }
      return await this.sharedLinkService.completeUpload(
        id,
        token,
        files.map((f) => ({ path: f.path, originalname: f.originalname })),
        getRequestMeta(req),
      );
    } catch (error) {
      throw error instanceof HttpException ? error : new HttpException('Fehler beim Hochladen.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
