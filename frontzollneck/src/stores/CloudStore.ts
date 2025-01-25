import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';

export const useCloudStore = defineStore('cloud', {
    state: () => ({
    }),
    actions: {
        async getFiles(dir: string) {
            try {
                const response = await axios.post('https://zollneck.de/api/cloud/getFiles', {
                    dir: dir
                }, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error: any) {
                throw error;
            }
        },

        async downloadFile(fileName: string, clientId: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/cloud/download/${fileName}`, {
                    clientId: clientId
                }, {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response;
            } catch (error: any) {
                throw error;
            }
        },

        async downloadFolder(folderName: string, clientId: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/cloud/downloadFolder/${folderName}`, {
                    clientId: clientId
                }, {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response;
            } catch (error: any) {
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
            } catch (error: any) {
                throw error;
            }
        },

        async deleteFile(dir: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/cloud/deleteFromServer`, {
                    dir: dir
                }, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                return response.data;
            } catch (error: any) {
                throw error;
            }
        }
    },
});
