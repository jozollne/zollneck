import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as archiver from 'archiver';
import * as QRCode from 'qrcode';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SharedLink } from './entities/shared-link.entity';
import { SharedLinkAccessLog } from './entities/shared-link-access-log.entity';
import { CreateSharedLinkDto } from './dto/create-shared-link.dto';
import { UpdateSharedLinkDto } from './dto/update-shared-link.dto';
import { CloudService } from './cloud.service';

const ROOT_DIR = '/media/filesystem';
const PUBLIC_BASE_URL = 'https://zollneck.de/apps/cloud';
const MAX_PASSWORD_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const SHARE_TOKEN_TTL_SECONDS = 30 * 60;

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class SharedLinkService {
  private readonly logger = new Logger(SharedLinkService.name);

  constructor(
    @InjectRepository(SharedLink) private readonly sharedLinkRepository: Repository<SharedLink>,
    @InjectRepository(SharedLinkAccessLog) private readonly accessLogRepository: Repository<SharedLinkAccessLog>,
    private readonly cloudService: CloudService,
  ) { }

  // ---------- Helpers ----------

  private getShareSecret(): string {
    return (process.env.JWT_SECRET || 'zollneck-fallback-secret') + ':share-link';
  }

  private resolveAndValidateAbsolutePath(inputPath: string): string {
    const resolved = path.resolve(inputPath);
    const normalizedRoot = path.resolve(ROOT_DIR);
    if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
      throw new HttpException('Ungültiger Pfad.', HttpStatus.BAD_REQUEST);
    }
    if (!fs.existsSync(resolved)) {
      throw new HttpException(`Pfad '${inputPath}' existiert nicht.`, HttpStatus.BAD_REQUEST);
    }
    return resolved;
  }

  private signShareToken(linkId: string): string {
    const exp = Math.floor(Date.now() / 1000) + SHARE_TOKEN_TTL_SECONDS;
    const payload = Buffer.from(JSON.stringify({ linkId, exp })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.getShareSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private verifyShareToken(token: string | undefined, linkId: string): boolean {
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expectedSignature = crypto.createHmac('sha256', this.getShareSecret()).update(payload).digest('base64url');
    const signatureBuffer = Uint8Array.from(Buffer.from(signature));
    const expectedBuffer = Uint8Array.from(Buffer.from(expectedSignature));
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return false;
    }
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decoded.linkId !== linkId) return false;
      if (typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private async logAccess(sharedLinkId: string, action: string, success: boolean, meta?: RequestMeta, detail?: string) {
    try {
      await this.accessLogRepository.save(this.accessLogRepository.create({
        sharedLinkId,
        action,
        success,
        ipAddress: meta?.ip?.substring(0, 64) ?? null,
        userAgent: meta?.userAgent?.substring(0, 255) ?? null,
        detail: detail?.substring(0, 2000) ?? null,
      }));
    } catch (e: any) {
      this.logger.warn(`Konnte Access-Log nicht speichern: ${e?.message || e}`);
    }
  }

  private buildPublicUrl(id: string): string {
    return `${PUBLIC_BASE_URL}/${id}`;
  }

  private computeStatus(link: SharedLink): 'active' | 'expired' | 'used' | 'revoked' {
    if (link.revoked) return 'revoked';
    if (link.oneTime && link.used) return 'used';
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return 'expired';
    return 'active';
  }

  private buildItemDetails(paths: string[]): { path: string; name: string; isFile: boolean; exists: boolean; size: number }[] {
    return paths.map((p) => {
      const exists = fs.existsSync(p);
      let isFile = false;
      let size = 0;
      if (exists) {
        try {
          const stats = fs.statSync(p);
          isFile = stats.isFile();
          size = isFile ? stats.size : this.cloudService.calculateFolderSize(p);
        } catch {
          // Race condition (z.B. gerade gelöscht) - als nicht verfügbar behandeln.
        }
      }
      return { path: p, name: path.basename(p), isFile, exists, size };
    });
  }

  private toManagementDto(link: SharedLink) {
    return {
      id: link.id,
      url: this.buildPublicUrl(link.id),
      paths: link.paths,
      items: this.buildItemDetails(link.paths),
      permission: link.permission,
      oneTime: link.oneTime,
      used: link.used,
      hasPassword: !!link.passwordHash,
      expiresAt: link.expiresAt,
      revoked: link.revoked,
      accessCount: link.accessCount,
      downloadCount: link.downloadCount,
      lastAccessedAt: link.lastAccessedAt,
      createdAt: link.createdAt,
      status: this.computeStatus(link),
    };
  }

  // ---------- Management (authenticated) ----------

  async createSharedLink(username: string, dto: CreateSharedLinkDto) {
    if (!dto.paths || dto.paths.length === 0) {
      throw new HttpException('Es muss mindestens eine Datei oder ein Ordner ausgewählt werden.', HttpStatus.BAD_REQUEST);
    }

    const resolvedPaths = dto.paths.map((p) => this.resolveAndValidateAbsolutePath(p));
    const uniquePaths = Array.from(new Set(resolvedPaths));

    const permission = dto.permission ?? 'read';
    if (permission === 'write') {
      if (uniquePaths.length !== 1 || !fs.statSync(uniquePaths[0]).isDirectory()) {
        throw new HttpException('Schreibzugriff ist nur für exakt einen geteilten Ordner möglich.', HttpStatus.BAD_REQUEST);
      }
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      const salt = await bcrypt.genSalt();
      passwordHash = await bcrypt.hash(dto.password, salt);
    }

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new HttpException('Das Ablaufdatum muss in der Zukunft liegen.', HttpStatus.BAD_REQUEST);
      }
    }

    const link = this.sharedLinkRepository.create({
      id: uuidv4(),
      ownerUsername: username,
      paths: uniquePaths,
      permission,
      oneTime: !!dto.oneTime,
      passwordHash,
      expiresAt,
    });

    const saved = await this.sharedLinkRepository.save(link);
    await this.logAccess(saved.id, 'created', true, undefined, `Ersteller: ${username}, Elemente: ${uniquePaths.length}`);
    return this.toManagementDto(saved);
  }

  async listSharedLinks(username: string) {
    const links = await this.sharedLinkRepository.find({ where: { ownerUsername: username }, order: { createdAt: 'DESC' } });
    return links.map((l) => this.toManagementDto(l));
  }

  async findSharesForPaths(username: string, paths: string[]) {
    if (!paths || paths.length === 0) return {};
    const resolved = paths.map((p) => path.resolve(p));
    const links = await this.sharedLinkRepository.find({ where: { ownerUsername: username } });
    const result: Record<string, ReturnType<SharedLinkService['toManagementDto']>[]> = {};
    for (const link of links) {
      for (const p of link.paths) {
        if (resolved.includes(p)) {
          if (!result[p]) result[p] = [];
          result[p].push(this.toManagementDto(link));
        }
      }
    }
    return result;
  }

  private async getOwnedLinkOrThrow(id: string, username: string): Promise<SharedLink> {
    const link = await this.sharedLinkRepository.findOne({ where: { id } });
    if (!link || link.ownerUsername !== username) {
      throw new HttpException('Freigabe-Link nicht gefunden.', HttpStatus.NOT_FOUND);
    }
    return link;
  }

  async updateSharedLink(id: string, username: string, dto: UpdateSharedLinkDto) {
    const link = await this.getOwnedLinkOrThrow(id, username);
    const detailParts: string[] = [];

    if (dto.addPaths?.length) {
      const resolvedAdd = dto.addPaths.map((p) => this.resolveAndValidateAbsolutePath(p));
      link.paths = Array.from(new Set([...link.paths, ...resolvedAdd]));
      detailParts.push(`+${resolvedAdd.length} Pfad(e)`);
    }
    if (dto.removePaths?.length) {
      const resolvedRemove = new Set(dto.removePaths.map((p) => path.resolve(p)));
      link.paths = link.paths.filter((p) => !resolvedRemove.has(p));
      detailParts.push(`-${dto.removePaths.length} Pfad(e)`);
    }
    if (link.paths.length === 0) {
      throw new HttpException('Ein Freigabe-Link benötigt mindestens ein Element.', HttpStatus.BAD_REQUEST);
    }

    if (dto.permission) {
      if (dto.permission === 'write' && (link.paths.length !== 1 || !fs.statSync(link.paths[0]).isDirectory())) {
        throw new HttpException('Schreibzugriff ist nur für exakt einen geteilten Ordner möglich.', HttpStatus.BAD_REQUEST);
      }
      link.permission = dto.permission;
    }

    if (dto.oneTime !== undefined) {
      link.oneTime = dto.oneTime;
      if (dto.oneTime === false) link.used = false;
    }

    if (dto.password !== undefined) {
      if (dto.password === null) {
        link.passwordHash = null;
      } else {
        const salt = await bcrypt.genSalt();
        link.passwordHash = await bcrypt.hash(dto.password, salt);
      }
      link.passwordFailCount = 0;
      link.lockedUntil = null;
      detailParts.push('Passwort geändert');
    }

    if (dto.expiresAt !== undefined) {
      if (dto.expiresAt === null) {
        link.expiresAt = null;
        detailParts.push('Ablauf entfernt');
      } else {
        const newExpiry = new Date(dto.expiresAt);
        if (isNaN(newExpiry.getTime())) {
          throw new HttpException('Ungültiges Ablaufdatum.', HttpStatus.BAD_REQUEST);
        }
        link.expiresAt = newExpiry;
        detailParts.push(`Ablauf verlängert bis ${newExpiry.toISOString()}`);
      }
    }

    if (dto.revoked !== undefined) {
      link.revoked = dto.revoked;
      detailParts.push(dto.revoked ? 'widerrufen' : 'reaktiviert');
    }

    const saved = await this.sharedLinkRepository.save(link);
    await this.logAccess(saved.id, 'updated', true, undefined, detailParts.join(', '));
    return this.toManagementDto(saved);
  }

  // ---------- Public consumption ----------

  private async loadActiveLinkOrThrow(id: string, meta: RequestMeta, action: string): Promise<SharedLink> {
    const link = await this.sharedLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new HttpException('Dieser Link existiert nicht.', HttpStatus.NOT_FOUND);
    }
    if (link.revoked) {
      await this.logAccess(id, 'revoked_attempt', false, meta);
      throw new HttpException('Dieser Link wurde widerrufen.', HttpStatus.GONE);
    }
    if (link.oneTime && link.used) {
      await this.logAccess(id, 'expired_attempt', false, meta);
      throw new HttpException('Der Link ist bereits abgelaufen.', HttpStatus.GONE);
    }
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      await this.logAccess(id, 'expired_attempt', false, meta);
      throw new HttpException('Der Link ist bereits abgelaufen.', HttpStatus.GONE);
    }
    return link;
  }

  async getPublicMeta(id: string, meta: RequestMeta) {
    const link = await this.loadActiveLinkOrThrow(id, meta, 'meta_view');

    const singleItem = link.paths.length === 1;
    let itemInfo: { name: string; isFile: boolean; size: number } | null = null;
    if (singleItem) {
      const p = link.paths[0];
      if (!fs.existsSync(p)) {
        await this.logAccess(id, 'meta_view', false, meta, 'Element nicht mehr verfügbar');
        throw new HttpException('Diese Datei oder dieser Ordner ist nicht mehr verfügbar.', HttpStatus.GONE);
      }
      const stats = fs.statSync(p);
      itemInfo = {
        name: path.basename(p),
        isFile: stats.isFile(),
        size: stats.isFile() ? stats.size : this.cloudService.calculateFolderSize(p),
      };
    }
    await this.logAccess(id, 'meta_view', true, meta);

    return {
      id: link.id,
      requiresPassword: !!link.passwordHash,
      permission: link.permission,
      oneTime: link.oneTime,
      expiresAt: link.expiresAt,
      itemsCount: link.paths.length,
      singleItem: itemInfo,
    };
  }

  async unlock(id: string, password: string, meta: RequestMeta): Promise<{ token: string; expiresInSeconds: number }> {
    const link = await this.loadActiveLinkOrThrow(id, meta, 'unlock_success');

    if (link.lockedUntil && new Date(link.lockedUntil).getTime() > Date.now()) {
      await this.logAccess(id, 'locked_attempt', false, meta);
      throw new HttpException('Zu viele Fehlversuche. Bitte später erneut versuchen.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!link.passwordHash) {
      return { token: this.signShareToken(id), expiresInSeconds: SHARE_TOKEN_TTL_SECONDS };
    }

    const valid = await bcrypt.compare(password ?? '', link.passwordHash);
    if (!valid) {
      link.passwordFailCount += 1;
      if (link.passwordFailCount >= MAX_PASSWORD_ATTEMPTS) {
        link.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        link.passwordFailCount = 0;
      }
      await this.sharedLinkRepository.save(link);
      await this.logAccess(id, 'unlock_fail', false, meta);
      throw new HttpException('Falsches Passwort.', HttpStatus.UNAUTHORIZED);
    }

    link.passwordFailCount = 0;
    link.lockedUntil = null;
    await this.sharedLinkRepository.save(link);
    await this.logAccess(id, 'unlock_success', true, meta);
    return { token: this.signShareToken(id), expiresInSeconds: SHARE_TOKEN_TTL_SECONDS };
  }

  private ensureUnlocked(link: SharedLink, token: string | undefined) {
    if (link.passwordHash && !this.verifyShareToken(token, link.id)) {
      throw new HttpException('Passwort erforderlich.', HttpStatus.UNAUTHORIZED);
    }
  }

  private resolveWithinRoot(base: string, relative: string): string {
    const abs = relative ? path.resolve(base, relative) : base;
    if (abs !== base && !abs.startsWith(base + path.sep)) {
      throw new HttpException('Ungültiger Pfad.', HttpStatus.BAD_REQUEST);
    }
    if (!fs.existsSync(abs)) {
      throw new HttpException('Pfad nicht gefunden.', HttpStatus.NOT_FOUND);
    }
    return abs;
  }

  private splitVirtualPath(relPath: string): { index: number; remainder: string } {
    const segments = relPath.split('/').filter((s) => s.length > 0);
    const idxStr = segments.shift();
    const index = Number(idxStr);
    if (idxStr === undefined || isNaN(index) || index < 0) {
      throw new HttpException('Ungültiger Pfad.', HttpStatus.BAD_REQUEST);
    }
    return { index, remainder: segments.join('/') };
  }

  async listContents(id: string, relPath: string, token: string | undefined, meta: RequestMeta) {
    const link = await this.loadActiveLinkOrThrow(id, meta, 'browse');
    this.ensureUnlocked(link, token);

    const normalizedRelPath = (relPath || '').trim();

    if (link.paths.length === 1) {
      const base = link.paths[0];
      const target = this.resolveWithinRoot(base, normalizedRelPath);
      const stats = fs.statSync(target);
      if (stats.isFile()) {
        return { type: 'file', file: { name: path.basename(target), size: stats.size } };
      }
      return this.listFolderEntries(target, normalizedRelPath, '');
    }

    if (normalizedRelPath === '') {
      const items = link.paths.map((p, i) => {
        if (!fs.existsSync(p)) {
          return { name: path.basename(p), isFile: false, size: 0, relPath: String(i), available: false };
        }
        const stats = fs.statSync(p);
        return {
          name: path.basename(p),
          isFile: stats.isFile(),
          size: stats.isFile() ? stats.size : this.cloudService.calculateFolderSize(p),
          relPath: String(i),
          available: true,
        };
      });
      return { type: 'folder', items };
    }

    const { index, remainder } = this.splitVirtualPath(normalizedRelPath);
    if (index < 0 || index >= link.paths.length) {
      throw new HttpException('Ungültiger Pfad.', HttpStatus.BAD_REQUEST);
    }
    const base = link.paths[index];
    const target = this.resolveWithinRoot(base, remainder);
    const stats = fs.statSync(target);
    if (stats.isFile()) {
      return { type: 'file', file: { name: path.basename(target), size: stats.size } };
    }
    return this.listFolderEntries(target, remainder, `${index}/`);
  }

  private listFolderEntries(folderAbsPath: string, currentRelPath: string, virtualPrefix: string) {
    const names = fs.readdirSync(folderAbsPath);
    const items = names.map((name) => {
      const childAbs = path.join(folderAbsPath, name);
      const stats = fs.statSync(childAbs);
      const childRel = currentRelPath ? `${currentRelPath}/${name}` : name;
      return {
        name,
        isFile: stats.isFile(),
        size: stats.isFile() ? stats.size : this.cloudService.calculateFolderSize(childAbs),
        relPath: `${virtualPrefix}${childRel}`,
        available: true,
      };
    });
    return { type: 'folder', items };
  }

  private resolveDownloadTarget(link: SharedLink, relPath: string): { abs: string; name: string } | null {
    const normalizedRelPath = (relPath || '').trim();

    if (link.paths.length === 1) {
      const base = link.paths[0];
      const target = this.resolveWithinRoot(base, normalizedRelPath);
      return { abs: target, name: path.basename(target) };
    }

    if (normalizedRelPath === '') {
      return null; // zip everything
    }

    const { index, remainder } = this.splitVirtualPath(normalizedRelPath);
    if (index < 0 || index >= link.paths.length) {
      throw new HttpException('Ungültiger Pfad.', HttpStatus.BAD_REQUEST);
    }
    const base = link.paths[index];
    const target = this.resolveWithinRoot(base, remainder);
    return { abs: target, name: path.basename(target) };
  }

  async download(id: string, relPath: string, token: string | undefined, res: Response, meta: RequestMeta) {
    const link = await this.loadActiveLinkOrThrow(id, meta, 'download');
    this.ensureUnlocked(link, token);

    let target: { abs: string; name: string } | null;
    try {
      target = this.resolveDownloadTarget(link, relPath);
    } catch (e) {
      await this.logAccess(id, 'download', false, meta, e?.message);
      throw e;
    }

    const finalizeUsage = async () => {
      link.accessCount += 1;
      link.downloadCount += 1;
      link.lastAccessedAt = new Date();
      if (link.oneTime) link.used = true;
      await this.sharedLinkRepository.save(link);
      await this.logAccess(id, 'download', true, meta, target?.name ?? 'zip-all');
    };

    if (target && fs.statSync(target.abs).isFile()) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(target.name)}"`);
      const stream = fs.createReadStream(target.abs);
      stream.pipe(res);
      stream.on('end', () => { finalizeUsage().catch(() => undefined); });
      return;
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipName = target ? `${target.name}.zip` : `share-${id}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipName)}"`);
    res.setHeader('Content-Type', 'application/zip');

    archive.on('error', (err) => {
      this.logger.warn(`Zip-Fehler bei Freigabe ${id}: ${err.message}`);
      res.end();
    });

    archive.pipe(res);

    if (target) {
      archive.directory(target.abs, target.name);
    } else {
      for (const p of link.paths) {
        if (!fs.existsSync(p)) {
          this.logger.warn(`Zip-Erstellung für Freigabe ${id}: Pfad nicht mehr vorhanden, wird übersprungen: ${p}`);
          continue;
        }
        const stats = fs.statSync(p);
        if (stats.isFile()) {
          archive.file(p, { name: path.basename(p) });
        } else {
          archive.directory(p, path.basename(p));
        }
      }
    }

    await archive.finalize();
    finalizeUsage().catch(() => undefined);
  }

  async completeUpload(id: string, token: string | undefined, tempFiles: Array<{ path: string; originalname: string }>, meta: RequestMeta) {
    const link = await this.loadActiveLinkOrThrow(id, meta, 'upload');
    this.ensureUnlocked(link, token);

    if (link.permission !== 'write') {
      for (const f of tempFiles) fs.unlink(f.path, () => undefined);
      await this.logAccess(id, 'upload', false, meta, 'Kein Schreibzugriff');
      throw new HttpException('Dieser Link erlaubt keinen Upload.', HttpStatus.FORBIDDEN);
    }
    if (link.paths.length !== 1 || !fs.statSync(link.paths[0]).isDirectory()) {
      for (const f of tempFiles) fs.unlink(f.path, () => undefined);
      throw new HttpException('Upload ist nur für Ordner-Freigaben möglich.', HttpStatus.BAD_REQUEST);
    }

    const targetDir = link.paths[0];
    const savedNames: string[] = [];
    for (const f of tempFiles) {
      const destination = path.join(targetDir, path.basename(f.originalname));
      await fs.promises.rename(f.path, destination);
      savedNames.push(path.basename(destination));
    }

    link.accessCount += 1;
    link.lastAccessedAt = new Date();
    await this.sharedLinkRepository.save(link);
    await this.logAccess(id, 'upload', true, meta, savedNames.join(', '));
    return { uploaded: savedNames };
  }

  async getQrCodePng(id: string): Promise<Buffer> {
    const link = await this.sharedLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new HttpException('Dieser Link existiert nicht.', HttpStatus.NOT_FOUND);
    }
    const url = `${this.buildPublicUrl(id)}?dl=1`;
    return QRCode.toBuffer(url, { type: 'png', width: 320, margin: 1 });
  }
}
