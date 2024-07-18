<template>
  <div class="p-d-flex p-jc-center p-ai-center pt-2">
    <DataTable :value="files" class="p-col-10" showGridlines resizableColumns>
      <template #header>
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <span class="text-xl text-900 font-bold"> Ordner: {{ dir }} </span>
          <Button @click="getFiles()" label="Aktualisieren" :disabled="activeDownloadOrUpload"></Button>
          <FileUpload ref="fileUpload" mode="basic" name="demo[]" :maxFileSize="10000000000" @upload="onUpload"
            :auto="true" chooseLabel="Hochladen" :customUpload="true" @select="onUpload" :multiple="true" />
        </div>
      </template>
      <Column field="name" header="Dateiname"></Column>
      <Column field="size" header="Größe"></Column>
      <Column field="created" header="Erstellt"></Column>
      <Column header="Download" :style="{ width: '300px' }">
        <template #body="{ data }">
          <div class="flex align-items-center justify-content-center" :style="{ height: '50px' }">
            <Button v-if="!data.downloading && !data.uploading" @click="downloadFile(data)" label="Download"
              icon="pi pi-download" class="w-full"></Button>
            <ProgressBar v-else :value="data.progress" class="w-full"></ProgressBar>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useCloudStore } from '@/stores/CloudStore';
import { useToast } from "primevue/usetoast";
import { HttpStatusCode } from 'axios';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client';

let client: Socket;

const toast = useToast();
const cloudStore = useCloudStore();
const dir = ref("/")
const files = ref<{ name: string, path: string, size: string, created: Date | String, downloading: boolean, uploading: boolean, progress: number }[]>([]);
const fileUpload: Ref = ref(null);
const activeDownloadOrUpload = ref(false)

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  const message = 'Are you sure you want to leave? Changes you made may not be saved.';
  event.returnValue = message;
  return message;
};

onMounted(async () => {
  if (activeDownloadOrUpload) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
  client = io('wss://zollneck.de', { path: '/socket.io', transports: ['websocket'] });
  client.on('downloadProgress', (data: { fileName: string, progress: number }) => {
    const file = files.value.find(f => f.name === data.fileName);
    if (file) {
      file.progress = Math.round(data.progress);
    }
  });
  getFiles()
});

onUnmounted(() => {
  if (activeDownloadOrUpload) {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
  if (client) {
    client.disconnect();
  }
});

const onUpload = () => {
  if (fileUpload.value) {
    const uploadedFiles = fileUpload.value.files;
    uploadedFiles.forEach(async (file: any) => {
      const newFile = {
        name: file.name,
        path: "null",
        size: formatBytes(file.size),
        created: "Gearde eben",
        downloading: false,
        uploading: true,
        progress: 0
      };
      files.value.push(newFile);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await cloudStore.uploadFiles(formData, (percentCompleted) => {
          const fileInProgress = files.value.find(f => f.name === file.name && f.uploading);
          if (fileInProgress) {
            fileInProgress.progress = Math.round(percentCompleted);
            activeDownloadOrUpload.value = true;
            if (percentCompleted === 100) {
              fileInProgress.uploading = false;
              activeDownloadOrUpload.value = false;
            }
          }
        });

        if (response) {
          toast.add({ severity: 'success', summary: file.name + ' hochgeladen!', detail: 'Die Datei ' + file.name + ' wurde hochgeladen!', life: 3000 });
        }
      } catch (error: any) {
        if (error.response.data.statusCode == HttpStatusCode.Unauthorized) {
          toast.add({ severity: 'error', summary: 'Session ungültig!', detail: 'Die Sitzung ist abgelaufen. Melde dich erneut an.', life: 3000 });
        }
      }
    });
  } else {
    console.error('FileUpload-Instanz ist nicht verfügbar');
  }
};

const downloadFile = async (file: { downloading: boolean; name: string; }) => {
  if (!client || !client.id) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Socket-Verbindung nicht hergestellt', life: 3000 });
    return;
  }
  try {
    file.downloading = true;
    activeDownloadOrUpload.value = true;
    const response = await cloudStore.downloadFile(file.name, client.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', response.headers['content-disposition']);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Fehler beim Herunterladen der Datei:', error);
  } finally {
    file.downloading = false;
    activeDownloadOrUpload.value = false;
  }
};

const getFiles = async () => {
  try {
    const fileList = await cloudStore.getFiles();
    files.value = fileList.map((file: { size: any; created: string; }) => ({
      ...file,
      size: formatBytes(Number(file.size)),
      created: formatDate(file.created),  // Konvertiere das Datum in ein lesbares Format
      downloading: false
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error);
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  return date.toLocaleDateString('de-DE', options);
};




const formatBytes = (bytes: number) => {
  const TB = BigInt(1000000000000);
  const GB = BigInt(1000000000);
  const MB = BigInt(1000000);
  const KB = BigInt(1000);

  if (bytes >= TB) {
    return (Number(bytes) / Number(TB)).toFixed(2) + ' TB';
  } else if (bytes >= GB) {
    return (Number(bytes) / Number(GB)).toFixed(2) + ' GB';
  } else if (bytes >= MB) {
    return (Number(bytes) / Number(MB)).toFixed(2) + ' MB';
  } else if (bytes >= KB) {
    return (Number(bytes) / Number(KB)).toFixed(2) + ' KB';
  } else {
    return bytes + ' Bytes';
  }
};
</script>
