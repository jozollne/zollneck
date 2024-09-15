<script setup lang="ts">
import axios, { HttpStatusCode } from 'axios';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { useYoutubeStore } from '@/stores/YoutubeStore';
import { useToast } from 'primevue/usetoast';
import { useFunctionsStore } from '@/stores/RouterStore';

const functionStore = useFunctionsStore();
const toast = useToast();
const youtubeStore = useYoutubeStore();
const url = ref('');
const format = ref(false)
const downloading = ref(false);

let client: Socket;

watch(format, (newFormatValue) => {
    const formatLabel = newFormatValue ? 'MP4' : 'MP3';

    toast.add({severity: 'info', summary: 'Format geändert', detail: `Das Format wurde zu ${formatLabel} geändert.`, life: 3000});
});

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
    client.on('downloadProgress', (progress: number) => {
        youtubeStore.downloadProgress = progress;
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
    if (!client || !client.id) {
        toast.add({ severity: 'error', summary: 'Fehler', detail: 'Socket-Verbindung nicht hergestellt', life: 3000 });
        return;
    }

    try {
        const formatText = format.value ? 'Video' : 'Musik';
        toast.add({ severity: 'info', summary: 'Download startet', detail: `${formatText} wird von Youtube runtergeladen`, life: 7000 });
        const response = await youtubeStore.downloadFileFromYoutube(url.value, client.id, format.value)
        if (response.fileId) {
            downloadFromSevrer(response.fileId);
        }
    } catch (error: any) {
        downloading.value = false;
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
        const formatText = format.value ? 'Video' : 'Musik';
        toast.add({ severity: 'info', summary: 'Downalod start', detail: `${formatText} wird nun auf dein PC geladen`, life: 7000 });
        const response = await youtubeStore.downloadFileFromServer(fileId);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.add({ severity: 'success', summary: 'Download erfolgreich!', detail: response.headers['content-disposition'] + " wurde erfolgreich konvertiert und runtergeladen!", life: 3000 });

        await deleteFile(fileId);
    } catch (error) {
        downloading.value = false;
        toast.add({ severity: 'error', summary: 'Fehler beim Runterladen!', detail: 'Das Video konnte nicht herruntergeladen werden! ' + error, life: 3000 });
    }
};

const deleteFile = async (fileId: string) => {
    try {
        downloading.value = false;
        await youtubeStore.deleteFileFromServer(fileId);
    } catch (error) {
        console.log("Datei konnte auf dem Server nicht gelöscht werden! " + error)
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
                <ProgressBar :value="youtubeStore.downloadProgress" class="mb-3"></ProgressBar>
            </div>
            <form @submit.prevent="downloadFromYoutube" class="p-fluid">
                <div class="field">
                    <span class="p-float-label">
                        <InputText v-model="url" id="url" required />
                        <label for="url">Youtube URL</label>
                    </span>
                </div>
                <div class="field flex align-items-center justify-content-center">
                    <div class="flex align-items-center justify-content-center">
                        <label for="formatSwitch" class="mr-2">MP3</label>
                        <InputSwitch v-model="format" id="formatSwitch" :disabled="downloading"/>
                        <label for="formatSwitch" class="ml-2">MP4</label>
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