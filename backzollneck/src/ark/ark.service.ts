import { Injectable, BadRequestException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs, createWriteStream } from 'fs';

const execAsync = promisify(exec);

type IniEncoding = 'utf16le' | 'utf16be' | 'utf8' | 'utf8-with-utf16-bom';

function detectIniEncoding(buf: Buffer): IniEncoding {
    // Real UTF-16 LE: FF FE then a NUL byte (low ASCII char)
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xfe && buf[3] === 0x00) {
        return 'utf16le';
    }
    // Stray UTF-16 LE BOM but UTF-8 content (ARK on Linux sometimes does this)
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xfe && buf[2] !== 0x00) {
        return 'utf8-with-utf16-bom';
    }
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        return 'utf16be';
    }
    return 'utf8';
}

function decodeIni(buf: Buffer, enc: IniEncoding): string {
    if (enc === 'utf16le') return buf.slice(2).toString('utf16le');
    if (enc === 'utf8-with-utf16-bom') return buf.slice(2).toString('utf8');
    if (enc === 'utf16be') {
        const swapped = Buffer.alloc(buf.length - 2);
        for (let i = 2; i < buf.length; i += 2) {
            swapped[i - 2] = buf[i + 1];
            swapped[i - 1] = buf[i];
        }
        return swapped.toString('utf16le');
    }
    return buf.toString('utf8');
}

function encodeIni(content: string, enc: IniEncoding): Buffer {
    if (enc === 'utf16le' || enc === 'utf16be') {
        const body = Buffer.from(content, 'utf16le');
        const out = Buffer.alloc(body.length + 2);
        out[0] = 0xff;
        out[1] = 0xfe;
        for (let i = 0; i < body.length; i++) out[i + 2] = body[i];
        return out;
    }
    // utf8 and utf8-with-utf16-bom: write plain UTF-8 (no BOM) — ARK reads it fine
    return Buffer.from(content, 'utf8');
}
import { Rcon } from 'rcon-client';
import { Repository } from 'typeorm';
import { ArkCommandLog } from './entities/arkCommandLog.entity';
import { ArkAuditLog } from './entities/arkAuditLog.entity';
import { ArkAdminLog } from './entities/arkAdminLog.entity';

type ConfigFileKey = 'game' | 'gameusersettings';

const CONFIG_FILES: Record<ConfigFileKey, string> = {
    game: '/opt/arkserver/serverfiles/ShooterGame/Saved/Config/LinuxServer/Game.ini',
    gameusersettings: '/opt/arkserver/serverfiles/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini',
};

@Injectable()
export class ArkService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ArkService.name);

    constructor(
        @InjectRepository(ArkCommandLog) private arkCommandLogRepository: Repository<ArkCommandLog>,
        @InjectRepository(ArkAuditLog) private arkAuditLogRepository: Repository<ArkAuditLog>,
        @InjectRepository(ArkAdminLog) private arkAdminLogRepository: Repository<ArkAdminLog>,
    ) { }

    private readonly arkUser = 'arkserver';
    private readonly arkScript = '/opt/arkserver/arkserver';
    private readonly arkSaveDir = '/opt/arkserver/serverfiles/ShooterGame/Saved/TheIsland';
    private readonly backupDir = '/opt/arkserver/backup';
    private adminLogPollTimer: NodeJS.Timeout | null = null;
    private readonly ADMIN_POLL_INTERVAL_MS = 30_000;

    onModuleInit() {
        // Poll Admin-Cheats periodisch via RCON `GetGameLog`
        this.adminLogPollTimer = setInterval(
            () => { this.pollAdminLog().catch((e) => this.logger.warn(`Admin-Log Poll fehlgeschlagen: ${e?.message || e}`)); },
            this.ADMIN_POLL_INTERVAL_MS,
        );
    }

    onModuleDestroy() {
        if (this.adminLogPollTimer) {
            clearInterval(this.adminLogPollTimer);
            this.adminLogPollTimer = null;
        }
    }

    private async rconExec(command: string): Promise<string> {
        const rcon = await Rcon.connect({
            host: process.env.ARK_RCON_HOST || 'localhost',
            port: parseInt(process.env.ARK_RCON_PORT || '32330', 10),
            password: process.env.ARK_RCON_PASSWORD || 'Irina020604',
        });
        try {
            return await rcon.send(command);
        } finally {
            rcon.end();
        }
    }

    async isServerRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            // ARK läuft als Prozess "ShooterGameServer"
            // -x = exakter Name-Match (verhindert dass pgrep sich selbst findet)
            exec('pgrep -x ShooterGameServ', (error, stdout) => {
                if (error || !stdout.trim()) {
                    return resolve(false);
                }
                resolve(true);
            });
        });
    }

    /**
     * Prüft ob der ARK-Server tatsächlich joinbar ist (RCON erreichbar).
     * Prozess läuft → true bedeutet noch nicht, dass man joinen kann.
     * Erst wenn RCON antwortet ist die Welt vollständig geladen.
     */
    async isServerJoinable(): Promise<boolean> {
        const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
        const check = this.rconExec('listplayers').then(() => true).catch(() => false);
        return Promise.race([check, timeout]);
    }

    async startServer(username?: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (await this.isServerRunning()) {
                return resolve(false);
            }
            exec(`sudo -u ${this.arkUser} ${this.arkScript} start`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error starting ARK server: ${error}`);
                    this.logAudit(username, 'start', null, `FEHLER: ${error.message}`);
                    return reject(`Failed to start server: ${error.message}`);
                }
                this.logAudit(username, 'start', null, 'Server gestartet');
                resolve(true);
            });
        });
    }

    /**
     * Macht ein saveworld per RCON (nur falls Server läuft), wartet bis
     * TheIsland.ark vollständig geschrieben ist (size + mtime stabil) und
     * kopiert die Datei dann atomar nach /opt/arkserver/backup/ mit Zeitstempel.
     * Wirft nicht — Fehler werden geloggt aber blockieren den Aufrufer nicht.
     *
     * Wichtig: Die Wartephase verhindert die Race-Condition zwischen
     * saveworld und LGSM-Stop, die früher zu halbgeschriebenen .ark-Dateien
     * geführt hat. Erst wenn die Welt sauber auf Platte liegt, geben wir
     * den Aufrufer (z.B. stopServer) frei.
     *
     * Deduplizierung: Parallele Aufrufe (z.B. Simple-Editor schreibt beide INIs
     * gleichzeitig) und Aufrufe innerhalb von BACKUP_COALESCE_MS teilen sich
     * denselben Backup-Vorgang — sonst gäbe es pro Klick zwei .ark-Kopien.
     */
    private static readonly BACKUP_COALESCE_MS = 10_000;
    private static readonly SAVE_STABLE_TIMEOUT_MS = 60_000;
    private static readonly SAVE_STABLE_HOLD_MS = 2_000;
    private backupInFlight: Promise<string> | null = null;
    private lastBackupAt = 0;
    private lastBackupResult = '';

    private async saveAndBackup(username: string | undefined, reason: string): Promise<string> {
        // Wenn aktuell schon ein Backup läuft, warten wir auf dessen Ergebnis.
        if (this.backupInFlight) {
            const shared = await this.backupInFlight;
            this.logAudit(username, 'backup', reason, `[${reason}] coalesced -> ${shared}`);
            return shared;
        }
        // Wenn das letzte Backup ganz frisch ist, überspringen wir.
        const sinceLast = Date.now() - this.lastBackupAt;
        if (sinceLast < ArkService.BACKUP_COALESCE_MS && this.lastBackupResult) {
            const skipped = `[${reason}] coalesced (vor ${sinceLast}ms) -> ${this.lastBackupResult}`;
            this.logAudit(username, 'backup', reason, skipped);
            return skipped;
        }

        this.backupInFlight = this.runBackup(username, reason);
        try {
            const res = await this.backupInFlight;
            this.lastBackupAt = Date.now();
            this.lastBackupResult = res;
            return res;
        } finally {
            this.backupInFlight = null;
        }
    }

    private async runBackup(username: string | undefined, reason: string): Promise<string> {
        const parts: string[] = [];
        const arkFile = `${this.arkSaveDir}/TheIsland.ark`;
        let serverRunning = false;

        // 1) saveworld (best effort, nur wenn Server läuft)
        try {
            serverRunning = await this.isServerRunning();
            if (serverRunning) {
                const resp = await this.rconExec('saveworld');
                parts.push(`saveworld: ${(resp || '').trim().substring(0, 200) || 'ok'}`);
            } else {
                parts.push('saveworld: übersprungen (Server aus)');
            }
        } catch (e: any) {
            parts.push(`saveworld FEHLER: ${e?.message || e}`);
        }

        // 2) Warten bis TheIsland.ark vollständig geschrieben ist (mtime+size stabil)
        if (serverRunning) {
            try {
                const waited = await this.waitForFileStable(
                    arkFile,
                    ArkService.SAVE_STABLE_TIMEOUT_MS,
                    ArkService.SAVE_STABLE_HOLD_MS,
                );
                parts.push(`stable nach ${waited}ms`);
            } catch (e: any) {
                parts.push(`wait stable FEHLER: ${e?.message || e}`);
            }
        }

        // 3) Aktuelle TheIsland.ark sichern (via sudo cat, weil mode 600)
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
            const dst = `${this.backupDir}/TheIsland_${ts}.ark`;
            const size = await this.sudoCopyAsArkserver(arkFile, dst);
            parts.push(`backup: ${dst} (${size} B)`);
        } catch (e: any) {
            parts.push(`backup FEHLER: ${e?.message || e}`);
        }

        const details = `[${reason}] ${parts.join(' | ')}`;
        this.logAudit(username, 'backup', reason, details);
        return details;
    }

    /**
     * Pollt size + mtime von `path` und kehrt zurück sobald beide für
     * mindestens `stableMs` unverändert sind. Wirft bei Timeout.
     */
    private async waitForFileStable(path: string, timeoutMs: number, stableMs: number): Promise<number> {
        const start = Date.now();
        let lastSize = -1;
        let lastMtime = -1;
        let stableSince = 0;
        while (Date.now() - start < timeoutMs) {
            try {
                const s = await fs.stat(path);
                const size = s.size;
                const mtime = s.mtimeMs;
                if (size > 0 && size === lastSize && mtime === lastMtime) {
                    if (!stableSince) stableSince = Date.now();
                    if (Date.now() - stableSince >= stableMs) {
                        return Date.now() - start;
                    }
                } else {
                    stableSince = 0;
                    lastSize = size;
                    lastMtime = mtime;
                }
            } catch {
                // Datei kurz weg (ARK rotiert via temp+rename) — weiter pollen
                stableSince = 0;
            }
            await new Promise((r) => setTimeout(r, 300));
        }
        throw new Error(`Datei nicht stabil nach ${timeoutMs}ms: ${path}`);
    }

    /**
     * Liest `src` als arkserver-User per `sudo cat` und schreibt das Ergebnis
     * nach `dst` (im backupDir, von node-User schreibbar). Liefert die Anzahl
     * der kopierten Bytes. Wirft bei Fehler.
     */
    private async sudoCopyAsArkserver(src: string, dst: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const out = createWriteStream(dst);
            const child = spawn('sudo', ['-n', '-u', this.arkUser, '/bin/cat', src], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let stderr = '';
            let bytes = 0;
            let settled = false;
            const fail = (err: Error) => {
                if (settled) return;
                settled = true;
                try { child.kill(); } catch { /* ignore */ }
                out.destroy();
                fs.unlink(dst).catch(() => { /* ignore */ });
                reject(err);
            };
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.stdout.on('data', (d: Buffer) => { bytes += d.length; });
            child.stdout.pipe(out);
            child.on('error', fail);
            out.on('error', fail);
            child.on('close', (code) => {
                if (settled) return;
                if (code === 0) {
                    out.end(() => {
                        if (settled) return;
                        settled = true;
                        resolve(bytes);
                    });
                } else {
                    fail(new Error(`sudo cat exit ${code}: ${stderr.trim() || 'unknown'}`));
                }
            });
        });
    }

    async stopServer(username?: string): Promise<boolean> {
        if (!(await this.isServerRunning())) {
            return false;
        }
        // Vor dem Stoppen: saveworld + wait stable + Welt-Backup. Erst danach
        // weitermachen — sonst riskieren wir eine halbgeschriebene TheIsland.ark.
        await this.saveAndBackup(username, 'pre-stop');

        // Sauberer Shutdown via RCON DoExit (statt LGSM-SIGINT-Kill, der die
        // Engine bisher mitten im Shutdown-Save erwischt hat). Wir warten
        // bis der Prozess wirklich weg ist, dann ruft LGSM-Stop nur noch
        // seine Statusdateien auf.
        try {
            await this.rconExec('DoExit');
        } catch (e: any) {
            this.logAudit(username, 'stop', 'doexit', `DoExit FEHLER: ${e?.message || e}`);
        }

        // Bis zu 60s auf Prozess-Exit warten
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline && (await this.isServerRunning())) {
            await new Promise((r) => setTimeout(r, 1000));
        }
        const stillRunning = await this.isServerRunning();
        if (stillRunning) {
            this.logAudit(username, 'stop', 'doexit', 'Prozess nach 60s noch da — überlasse LGSM den Kill');
        }

        return new Promise<boolean>((resolve, reject) => {
            exec(`sudo -u ${this.arkUser} ${this.arkScript} stop`, (error) => {
                if (error) {
                    console.error(`Error stopping ARK server: ${error}`);
                    this.logAudit(username, 'stop', null, `FEHLER: ${error.message}`);
                    return reject(`Failed to stop server: ${error.message}`);
                }
                this.logAudit(username, 'stop', null, stillRunning ? 'Server gestoppt (via LGSM Kill)' : 'Server gestoppt (graceful)');
                resolve(true);
            });
        });
    }

    async sendRconCommand(username: string, command: string): Promise<string> {
        try {
            const response = await this.rconExec(command);

            const finalResponse =
                !response || response.trim() === ''
                    ? `Command '${command}' executed successfully. No output returned.`
                    : response;

            const commandLog = this.arkCommandLogRepository.create({
                username,
                command,
                response: finalResponse.substring(0, 1000),
            });
            this.arkCommandLogRepository.save(commandLog);

            this.logAudit(username, 'rcon', command, finalResponse.substring(0, 500));

            return finalResponse;
        } catch (error: any) {
            this.logAudit(username, 'rcon', command, `FEHLER: ${error?.message || error}`);
            throw new Error(`Error sending command: ${error?.message || error}`);
        }
    }

    // --- Admin-Cheat-Log via RCON GetChat ---
    // ARK liefert Admin-Cheats im Chat-Buffer (GetChat), nicht in GetGameLog.
    // Format pro Cheat (zwei Zeilen):
    //   AdminCmd: <command> (PlayerName: <name>, ARKID: <id>, SteamID: <steam>)
    //   SERVER: Admin '<name>' Command: <command>
    private async pollAdminLog(): Promise<void> {
        if (!(await this.isServerRunning())) return;
        let raw: string;
        try {
            raw = await this.rconExec('GetChat');
        } catch (e: any) {
            // Connection errors (server starting up / shutting down) are expected — log at debug only
            const isConnErr = e instanceof AggregateError || e?.code === 'ECONNREFUSED' || /ECONNREFUSED|ECONNRESET|ETIMEDOUT|AggregateError/i.test(e?.message || String(e));
            if (isConnErr) {
                this.logger.debug(`Admin-Log Poll: RCON nicht erreichbar (${e?.constructor?.name ?? e?.code ?? 'unknown'})`);
            } else {
                this.logger.warn(`Admin-Log Poll: RCON-Fehler: ${e?.message || e}`);
            }
            return;
        }
        if (!raw || raw.trim() === '' || /server received, but no response/i.test(raw)) {
            return;
        }

        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        let saved = 0;
        for (const line of lines) {
            const parsed = this.parseAdminCheatLine(line);
            if (!parsed) continue;
            try {
                await this.arkAdminLogRepository.save(this.arkAdminLogRepository.create({
                    player_name: parsed.name,
                    player_id: parsed.id,
                    command: parsed.command.substring(0, 500),
                    raw_line: line.substring(0, 2000),
                }));
                saved++;
            } catch (e: any) {
                this.logger.warn(`Konnte Admin-Log nicht speichern: ${e?.message || e}`);
            }
        }
        if (saved > 0) {
            this.logger.log(`Admin-Log Poll: ${saved} neue Cheat(s) gespeichert.`);
        }
    }

    private parseAdminCheatLine(line: string): { name: string | null; id: string | null; command: string } | null {
        // Primär-Format aus GetChat:
        //   AdminCmd: <command> (PlayerName: <name>, ARKID: <ark>, SteamID: <steam>)
        const m1 = line.match(/^AdminCmd:\s*(?<cmd>.+?)\s*\(PlayerName:\s*(?<name>[^,]+?)\s*,\s*ARKID:\s*(?<arkid>[^,]+?)\s*,\s*SteamID:\s*(?<steam>[^)]+?)\s*\)\s*$/i);
        if (m1 && m1.groups) {
            return {
                name: m1.groups.name.trim(),
                id: m1.groups.steam.trim(),
                command: m1.groups.cmd.trim(),
            };
        }
        // Sekundär-Format ("SERVER: Admin '<name>' Command: <cmd>") überspringen
        // → Doppel-Eintrag verhindern (wir nehmen nur AdminCmd:-Zeilen)
        return null;
    }

    async getAdminLog(limit = 200): Promise<ArkAdminLog[]> {
        const safe = Math.min(Math.max(1, limit | 0), 1000);
        return this.arkAdminLogRepository.find({
            order: { admin_id: 'DESC' },
            take: safe,
        });
    }

    async triggerAdminLogPoll(): Promise<{ polled: boolean }> {
        await this.pollAdminLog();
        return { polled: true };
    }

    async getCommandLog(): Promise<ArkCommandLog[]> {
        return this.arkCommandLogRepository.find({
            order: {
                command_id: 'DESC',
            },
            take: 5,
        });
    }

    private async logAudit(
        username: string | undefined,
        action: string,
        target: string | null,
        details: string | null,
    ): Promise<void> {
        try {
            const entry = this.arkAuditLogRepository.create({
                username: (username || 'unbekannt').substring(0, 100),
                action: action.substring(0, 50),
                target: target ? target.substring(0, 200) : null,
                details: details ? details.substring(0, 4000) : null,
            });
            await this.arkAuditLogRepository.save(entry);
        } catch (e: any) {
            console.error('Failed to write audit log:', e?.message || e);
        }
    }

    async getAuditLog(limit = 100): Promise<ArkAuditLog[]> {
        const safeLimit = Math.min(Math.max(1, limit | 0), 500);
        return this.arkAuditLogRepository.find({
            order: { audit_id: 'DESC' },
            take: safeLimit,
        });
    }

    // Parst einen INI-Text in eine Map<section, Map<key, value>>
    private parseIni(text: string): Map<string, Map<string, string>> {
        const result = new Map<string, Map<string, string>>();
        let current = '<root>';
        result.set(current, new Map());
        const lines = text.split(/\r?\n/);
        for (const raw of lines) {
            const line = raw.trim();
            if (!line || line.startsWith(';') || line.startsWith('#')) continue;
            const sec = line.match(/^\[(.+)\]$/);
            if (sec) {
                current = sec[1];
                if (!result.has(current)) result.set(current, new Map());
                continue;
            }
            const eq = line.indexOf('=');
            if (eq <= 0) continue;
            const key = line.substring(0, eq).trim();
            const value = line.substring(eq + 1).trim();
            // Mehrfach-Keys (z.B. OverrideNamedEngramEntries) zu Listen aggregieren
            const sectionMap = result.get(current)!;
            if (sectionMap.has(key)) {
                sectionMap.set(key, sectionMap.get(key)! + '\n' + value);
            } else {
                sectionMap.set(key, value);
            }
        }
        return result;
    }

    private diffIni(oldText: string, newText: string): string {
        const oldIni = this.parseIni(oldText);
        const newIni = this.parseIni(newText);
        const changes: string[] = [];
        const sections = new Set<string>([...oldIni.keys(), ...newIni.keys()]);
        for (const section of sections) {
            const o = oldIni.get(section) || new Map();
            const n = newIni.get(section) || new Map();
            const keys = new Set<string>([...o.keys(), ...n.keys()]);
            for (const k of keys) {
                const ov = o.get(k);
                const nv = n.get(k);
                if (ov === nv) continue;
                const prefix = section === '<root>' ? k : `[${section}] ${k}`;
                if (ov === undefined) {
                    changes.push(`+ ${prefix} = ${nv}`);
                } else if (nv === undefined) {
                    changes.push(`- ${prefix} (war: ${ov})`);
                } else {
                    changes.push(`~ ${prefix}: ${ov} -> ${nv}`);
                }
            }
        }
        if (changes.length === 0) return 'Keine Änderungen erkannt.';
        return changes.join('\n');
    }

    private resolveConfigPath(file: string): string {
        const key = (file || '').toLowerCase() as ConfigFileKey;
        const path = CONFIG_FILES[key];
        if (!path) {
            throw new BadRequestException(`Unknown config file: ${file}`);
        }
        return path;
    }

    async readConfigFile(file: string): Promise<{ file: string; content: string }> {
        const path = this.resolveConfigPath(file);
        let buf: Buffer;
        try {
            buf = await fs.readFile(path);
        } catch (e: any) {
            // ARK rewrites config files with mode 600 on startup — fall back to sudo cat as arkserver user
            if (e?.code === 'EACCES' || e?.code === 'EPERM') {
                const { stdout } = await execAsync(`sudo -n -u arkserver /bin/cat "${path}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
                buf = stdout as unknown as Buffer;
            } else {
                throw e;
            }
        }
        const enc = detectIniEncoding(buf);
        const content = decodeIni(buf, enc);
        return { file, content };
    }

    async writeConfigFile(file: string, content: string, username?: string): Promise<{ success: boolean; bytes: number }> {
        if (typeof content !== 'string') {
            throw new BadRequestException('content must be a string');
        }
        const path = this.resolveConfigPath(file);
        // Vor jedem Config-Write: saveworld + Welt-Backup als Sicherheitsnetz, falls
        // die neue Config beim nächsten Start die Welt zerschießt.
        await this.saveAndBackup(username, `pre-config-write:${file}`);
        // Vorher altes File für Diff + Encoding-Erkennung einlesen (best effort)
        let oldContent = '';
        let enc: IniEncoding = 'utf16le';
        try {
            let existingBuf: Buffer;
            try {
                existingBuf = await fs.readFile(path);
            } catch (e: any) {
                if (e?.code === 'EACCES' || e?.code === 'EPERM') {
                    const { stdout } = await execAsync(`sudo -n -u arkserver /bin/cat "${path}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
                    existingBuf = stdout as unknown as Buffer;
                } else {
                    throw e;
                }
            }
            enc = detectIniEncoding(existingBuf);
            oldContent = decodeIni(existingBuf, enc);
        } catch {
            // no existing file or unreadable — default to utf16le with BOM
        }

        const out = encodeIni(content, enc);

        // Write via `sudo -u arkserver tee` so the file always ends up owned by arkserver,
        // regardless of current permissions (ARK rewrites files with mode 600 on startup).
        await new Promise<void>((resolve, reject) => {
            const child = spawn('sudo', ['-n', '-u', 'arkserver', '/usr/bin/tee', path], {
                stdio: ['pipe', 'ignore', 'pipe'],
            });
            let stderr = '';
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.on('error', reject);
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`tee exited with ${code}: ${stderr}`));
            });
            child.stdin.end(out);
        });

        const diff = this.diffIni(oldContent, content);
        this.logAudit(username, 'config_write', file, diff);

        return { success: true, bytes: out.length };
    }
}
