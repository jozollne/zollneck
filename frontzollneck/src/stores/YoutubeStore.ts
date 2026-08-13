import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';

export const useYoutubeStore = defineStore('upload', {
    state: () => ({
        downloadProgress: ref(0),
    }),
    actions: {
        async downloadFileFromYoutube(url: string, clientId: string, format: boolean, resolution: string = 'best') {
            const response = await axios.post(`https://zollneck.de/api/youtube/downloadFromYoutube`, {
                url: url,
                clientId: clientId,
                format: format,
                resolution: resolution
            });
            return response.data;
        },

        async downloadFileFromServer(fileId: string) {
            const response = await axios.get(`https://zollneck.de/api/youtube/downloadFromServer/${fileId}`, {
                responseType: 'blob',
                onDownloadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const loaded = progressEvent.loaded;
                    // Map download progress (0-100%) to range 50-100%
                    const progress = 50 + Math.round((loaded * 50) / total);
                    this.downloadProgress = Math.min(progress, 100);
                }
            });
            return response;
        },

        async deleteFileFromServer(fileId: string) {
            await axios.delete(`https://zollneck.de/api/youtube/deleteFromServer/${fileId}`);
            return
        }
    }
});