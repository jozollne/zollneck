import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { exec } from 'child_process';
import { Rcon } from 'rcon-client';
import { Repository } from 'typeorm';
import { ArkCommandLog } from './entities/arkCommandLog.entity';

@Injectable()
export class ArkService {
    constructor(
        @InjectRepository(ArkCommandLog) private arkCommandLogRepository: Repository<ArkCommandLog>,
    ) { }

    private readonly arkUser = 'arkserver';
    private readonly arkScript = '/opt/arkserver/arkserver';

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

    async startServer(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (await this.isServerRunning()) {
                return resolve(false);
            }
            exec(`sudo -u ${this.arkUser} ${this.arkScript} start`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error starting ARK server: ${error}`);
                    return reject(`Failed to start server: ${error.message}`);
                }
                resolve(true);
            });
        });
    }

    async stopServer(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.isServerRunning())) {
                return resolve(false);
            }
            exec(`sudo -u ${this.arkUser} ${this.arkScript} stop`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error stopping ARK server: ${error}`);
                    return reject(`Failed to stop server: ${error.message}`);
                }
                resolve(true);
            });
        });
    }

    async sendRconCommand(username: string, command: string): Promise<string> {
        const rcon = await Rcon.connect({
            host: process.env.ARK_RCON_HOST || 'localhost',
            port: parseInt(process.env.ARK_RCON_PORT || '32330', 10),
            password: process.env.ARK_RCON_PASSWORD || 'Pa22w0rt',
        });

        try {
            const response = await rcon.send(command);

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

            return finalResponse;
        } catch (error) {
            throw new Error(`Error sending command: ${error.message}`);
        } finally {
            rcon.end();
        }
    }

    async getCommandLog(): Promise<ArkCommandLog[]> {
        return this.arkCommandLogRepository.find({
            order: {
                command_id: 'DESC',
            },
            take: 5,
        });
    }
}
