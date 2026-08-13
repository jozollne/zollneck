<script setup lang="ts">
import axios, { HttpStatusCode } from 'axios';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { useYoutubeStore } from '@/stores/YoutubeStore';
import { useToast } from 'primevue/usetoast';
import { useRouterStore } from '@/stores/RouterStore';

const functionStore = useRouterStore();
const toast = useToast();
const youtubeStore = useYoutubeStore();
const url = ref('');
const format = ref(true);
const resolution = ref('1080p'); // 'best' oder '1080p'
const downloading = ref(false);
const progressInfo = ref('');

// Progress ranges - must match backend
const PROGRESS_RANGES = {
    SERVER_COMPLETE: 50,  // Server (YouTube) Download endet bei 50%
    CLIENT_DOWNLOAD: 75,  // Client Download Mitte
    COMPLETE: 100         // Abgeschlossen
};

let client: Socket;

// Format-Wechsel ohne Toast

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (downloading.value) {
    const message = 'Bist du sicher das du neu laden möchtest? Deine Änderungen werden eventuell nicht gespeichert.';
    event.returnValue = message;
    return message;
  }
};

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    client = io('wss://zollneck.de', { path: '/socket.io', transports: ['websocket'] });
    client.on('downloadProgress', (data: { progress: number; infoText?: string }) => {
        // Stelle sicher dass nur Zahlen gesetzt werden
        const progress = typeof data.progress === 'number' ? data.progress : 0;
        youtubeStore.downloadProgress = progress;
        if (data.infoText) {
            progressInfo.value = data.infoText;
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (client) {
        client.disconnect();
    }
});

const downloadFromYoutube = async () => {
    downloading.value = true;
    youtubeStore.downloadProgress = 0;
    progressInfo.value = 'Download wird gestartet...';
    
    if (!client || !client.id) {
        toast.add({ severity: 'error', summary: 'Fehler', detail: 'Socket-Verbindung nicht hergestellt', life: 3000 });
        return;
    }

    try {
        const response = await youtubeStore.downloadFileFromYoutube(url.value, client.id, format.value, resolution.value)
        if (response.fileId) {
            downloadFromSevrer(response.fileId);
        }
    } catch (error: any) {
        downloading.value = false;
        progressInfo.value = '';
        youtubeStore.downloadProgress = 0;
        if (error.response.data.statusCode == HttpStatusCode.Unauthorized) {
            toast.add({ severity: 'error', summary: 'Session ungültig!', detail: 'Die Sitzung ist abgelaufen. Melde dich erneut an.', life: 3000 });
            functionStore.goToAuth();
        } else {
            toast.add({ severity: 'error', summary: 'Download fehlgeschlagen!', detail: error.response.data.message, life: 3000 });
        }
    }
}

const downloadFromSevrer = async (fileId: string) => {
    try {
        progressInfo.value = 'Datei wird auf deinen PC geladen...';
        
        // Store-Funktion übernimmt Progress-Updates von 50-100%
        const response = await youtubeStore.downloadFileFromServer(fileId);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        youtubeStore.downloadProgress = PROGRESS_RANGES.COMPLETE;
        progressInfo.value = 'Download abgeschlossen!';
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.add({ severity: 'success', summary: 'Download erfolgreich!', detail: response.headers['content-disposition'] + " wurde erfolgreich heruntergeladen!", life: 3000 });
        
        progressInfo.value = '';
        // Progress bleibt bei 100%, wird erst beim nächsten Download-Start zurückgesetzt
        await deleteFile(fileId);
    } catch (error) {
        downloading.value = false;
        progressInfo.value = '';
        youtubeStore.downloadProgress = 0;
        toast.add({ severity: 'error', summary: 'Fehler beim Runterladen!', detail: 'Das Video konnte nicht herruntergeladen werden! ' + error, life: 3000 });
    }
};

const deleteFile = async (fileId: string) => {
    try {
        downloading.value = false;
        await youtubeStore.deleteFileFromServer(fileId);
    } catch (error) {
        // Silently handle deletion errors
    }
};

const testProgress = async () => {
    try {
        await axios.post('https://zollneck.de/api/youtube/testProgress', {
            clientId: client.id
        }, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        });
        toast.add({ severity: 'info', summary: 'Test', detail: 'Testnachricht gesendet', life: 3000 });
    } catch (error) {
        console.error('Fehler beim Senden der Testnachricht', error);
    }
};
</script>

<template>
    <div class="flex align-items-center justify-content-center" style="height: 84vh;">
        <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-6">
            <div class="text-center mb-4">
                <h1>Videos oder Musik von Youtube runterladen</h1>
                <ProgressBar :value="youtubeStore.downloadProgress" :showValue="true" class="mb-2" />
                <p v-if="progressInfo" class="text-sm text-500 mt-2">{{ progressInfo }}</p>
            </div>
            <form @submit.prevent="downloadFromYoutube" class="p-fluid">
                <div class="field">
                    <span class="p-float-label">
                        <InputText v-model="url" id="url" required />
                        <label for="url">Youtube URL</label>
                    </span>
                </div>
                <div class="field flex align-items-center justify-content-center gap-4">
                    <div class="flex align-items-center">
                        <label for="formatSwitch" class="mr-2">MP3</label>
                        <InputSwitch v-model="format" id="formatSwitch" :disabled="downloading"/>
                        <label for="formatSwitch" class="ml-2">MP4</label>
                    </div>
                    <div v-if="format" class="flex align-items-center">
                        <label for="resolutionSwitch" class="mr-2">Full HD</label>
                        <InputSwitch v-model="resolution" :disabled="downloading" id="resolutionSwitch" true-value="best" false-value="1080p" />
                        <label for="resolutionSwitch" class="ml-2">Beste Qualität</label>
                    </div>
                </div>
                <Button type="submit" label="Herunterladen" icon="pi pi-download" class="mt-3 w-full"></Button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.card {
    background-color: var(--surface-b); 
}
</style>