import { defineStore } from 'pinia';
import axios from 'axios';

export const useArkStore = defineStore('ark', {
    state: () => ({
    }),
    actions: {
        async getStatus() {
            try {
                const response = await axios.get('https://zollneck.de/api/ark/status', {
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
                const response = await axios.post(`https://zollneck.de/api/ark/start`, {}, {
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
                const response = await axios.post('https://zollneck.de/api/ark/stop', {}, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async sendCommand(username: string | null, command: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/ark/command`, {
                    username: username,
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

        async getCommandLog() {
            try {
                const response = await axios.get('https://zollneck.de/api/ark/getCommand', {
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
