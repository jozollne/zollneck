import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';

const API_BASE = 'https://zollneck.de/api';

export interface SharedLinkItemDto {
    path: string;
    name: string;
    isFile: boolean;
    exists: boolean;
    size: number;
}

export interface SharedLinkDto {
    id: string;
    url: string;
    paths: string[];
    items: SharedLinkItemDto[];
    permission: 'read' | 'write';
    oneTime: boolean;
    used: boolean;
    hasPassword: boolean;
    expiresAt: string | null;
    revoked: boolean;
    accessCount: number;
    downloadCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
    status: 'active' | 'expired' | 'used' | 'revoked';
}

export interface CreateSharedLinkPayload {
    paths: string[];
    permission?: 'read' | 'write';
    oneTime?: boolean;
    password?: string;
    expiresAt?: string;
}

export interface UpdateSharedLinkPayload {
    permission?: 'read' | 'write';
    oneTime?: boolean;
    password?: string | null;
    expiresAt?: string | null;
    addPaths?: string[];
    removePaths?: string[];
    revoked?: boolean;
}

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

        async downloadFile(fileName: string, clientId: string, dir: string) {
        try {
            const response = await axios.post(`https://zollneck.de/api/cloud/download/${fileName}`, {
            clientId: clientId,
            dir: dir // <-- NEU
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

        async downloadFolder(folderName: string, clientId: string, dir: string) {
        try {
            const response = await axios.post(`https://zollneck.de/api/cloud/downloadFolder/${folderName}`, {
            clientId: clientId,
            dir: dir // <-- NEU
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

        async uploadFiles(formData: FormData, dir: string, progressCallback: (percentCompleted: number) => void) {
            try {
                const response = await axios.post('https://zollneck.de/api/cloud/uploadFile', formData, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'dir': dir
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
        },

        async createFolder(folderName: string, dir: string) {
            try {
                const response = await axios.post(`https://zollneck.de/api/cloud/createFolder`, {
                    name: folderName,
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

        // ---------- Freigabe-Links (authentifiziert) ----------

        async createSharedLink(payload: CreateSharedLinkPayload): Promise<SharedLinkDto> {
            const response = await axios.post(`${API_BASE}/cloud/shared`, payload, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
            });
            return response.data;
        },

        async listSharedLinks(): Promise<SharedLinkDto[]> {
            const response = await axios.get(`${API_BASE}/cloud/shared`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
            });
            return response.data;
        },

        async lookupSharedLinks(paths: string[]): Promise<Record<string, SharedLinkDto[]>> {
            const response = await axios.post(`${API_BASE}/cloud/shared/lookup`, { paths }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
            });
            return response.data;
        },

        async updateSharedLink(id: string, payload: UpdateSharedLinkPayload): Promise<SharedLinkDto> {
            const response = await axios.patch(`${API_BASE}/cloud/shared/${id}`, payload, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
            });
            return response.data;
        },

        // ---------- Öffentlicher Zugriff (kein Auth) ----------

        async getSharedMeta(id: string) {
            const response = await axios.get(`${API_BASE}/cloud/shared/${id}/meta`);
            return response.data;
        },

        async unlockSharedLink(id: string, password: string): Promise<{ token: string; expiresInSeconds: number }> {
            const response = await axios.post(`${API_BASE}/cloud/shared/${id}/unlock`, { password });
            return response.data;
        },

        async browseSharedLink(id: string, relPath: string, token?: string) {
            const response = await axios.get(`${API_BASE}/cloud/shared/${id}/browse`, {
                params: { path: relPath, token }
            });
            return response.data;
        },

        async uploadToSharedLink(id: string, token: string | undefined, formData: FormData, progressCallback?: (percentCompleted: number) => void) {
            const response = await axios.post(`${API_BASE}/cloud/shared/${id}/upload`, formData, {
                params: { token },
                onUploadProgress: (progressEvent) => {
                    if (!progressCallback) return;
                    const total = progressEvent.total ?? 1;
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                    progressCallback(percentCompleted);
                }
            });
            return response.data;
        },

        getSharedDownloadUrl(id: string, relPath: string, token?: string): string {
            const params = new URLSearchParams();
            if (relPath) params.set('path', relPath);
            if (token) params.set('token', token);
            const query = params.toString();
            return `${API_BASE}/cloud/shared/${id}/download${query ? `?${query}` : ''}`;
        },

        getSharedQrCodeUrl(id: string): string {
            return `${API_BASE}/cloud/shared/${id}/qrcode.png`;
        }
    },
});
