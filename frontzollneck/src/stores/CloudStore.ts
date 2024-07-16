import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';

export const useCloudStore = defineStore('cloud', {
    state: () => ({

    }),
    actions: {
        async getFiles() {
            try {
                const response = await axios.get('https://zollneck.de/api/cloud/files', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error) {
                console.error('Fehler beim Laden der Dateien:', error);
            }
        },

        async downloadFile(fileName: string) {
            try {
                const response = await axios.get(`https://zollneck.de/api/cloud/download/${fileName}`, {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response;
            } catch (error) {
                throw error;
            }
        },

        async uploadFiles(formData: FormData, progressCallback: (percentCompleted: number) => void) {
            try {
                const response = await axios.post('https://zollneck.de/api/cloud/uploadFile', formData, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    onUploadProgress: (progressEvent) => {
                        const total = progressEvent.total ?? 1;
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                        progressCallback(percentCompleted);
                    }
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        },
    },
});
