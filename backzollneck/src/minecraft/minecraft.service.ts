import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { exec } from 'child_process';
import { Rcon } from 'rcon-client';
import { CommandLog } from './entities/commandLog.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MinecraftService {
    constructor(
        @InjectRepository(CommandLog) private CommandLogRepository: Repository<CommandLog>,
    ) { }

    async isServerRunning(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            exec('systemctl is-active minecraft.service', (error, stdout, stderr) => {
                if (error) {
                    return resolve(false);
                }

                const status = stdout.trim();
                if (status === 'active') {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }


    async startServer(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (await this.isServerRunning()) {
                resolve(false)
            } else {
                exec('sudo systemctl start minecraft.service', (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error starting Minecraft server: ${error}`);
                        return reject(`Failed to start server: ${error.message}`);
                    }
                    resolve(true);
                });
            }
        });
    }

    async stopServer(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (await this.isServerRunning()) {
                exec('sudo systemctl stop minecraft.service', (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error stopping Minecraft server: ${error}`);
                        return reject(`Failed to stop server: ${error.message}`);
                    }
                    resolve(true);
                });
            } else {
                resolve(false)
            }
        });
    }

    async sendRconCommand(command: string): Promise<string> {
        const rcon = await Rcon.connect({
            host: 'zollneck.de',
            port: 34567,
            password: 'A1Ae6iUks6',
        });

        try {
            const response = await rcon.send(command);

            if (!response || response.trim() === '') {
                return `Command '${command}' executed successfully. No output returned.`;
            }

            const commandLog = this.CommandLogRepository.create({
                command,
                response,
            });
            this.CommandLogRepository.save(commandLog)

            return response;
        } catch (error) {
            throw new Error(`Error sending command: ${error.message}`);
        } finally {
            rcon.end();
        }
    }
}
