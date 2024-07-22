import { defineStore } from 'pinia';
import axios from 'axios';

export const useUploadStore = defineStore('upload', {
    state: () => ({

    }),
    actions: {
        async storeAndConvertFile(formData: FormData, progressCallback: (percentCompleted: number) => void) {
            try {
                const response = await axios.post('https://zollneck.de/api/file/storeAndConvertFile', formData, {
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

        async downloadFile(fileId: string) {
            try {
                const response = await axios.get(`https://zollneck.de/api/file/download/${fileId}`, {
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

        async deleteFile(fileId: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/file/delete/${fileId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error) {
                throw error;
            }
        }
    }
});
