import { defineStore } from 'pinia';
import axios from 'axios';

export const useMinecraftStore = defineStore('minecraft', {
    state: () => ({
    }),
    actions: {
        async getStatus() {
            try {
                const response = await axios.get('https://zollneck.de/api/minecraft/status', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async startServer() {
            try {
                const response = await axios.post(`https://zollneck.de/api/minecraft/start`, {}, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async stopServer() {
            try {
                const response = await axios.post('https://zollneck.de/api/minecraft/stop', {}, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async sendCommand(command: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/minecraft/command`, {
                    command: command
                }, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },
    },
});
