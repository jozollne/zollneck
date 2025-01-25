<template>
  <ConfirmPopup group="confirmDelete">
    <template #message="slotProps">
      <div class="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border p-3 mb-3 pb-0">
        <i :class="slotProps.message.icon" class="text-6xl text-primary-500"></i>
        <p>{{ slotProps.message.message }}</p>
      </div>
    </template>
  </ConfirmPopup>
  <div class="p-d-flex p-jc-center p-ai-center pt-2">
    <DataTable :value="files" class="p-col-10" resizableColumns @row-click="onRowClick">
      <template #header>
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <span class="text-xl text-900 font-bold"> Ordner: {{ dir.replace(/^\/media\/filesystem\/?/, 'home/') }}
          </span>
          <Button @click="getFiles(dir)" label="Aktualisieren" :disabled="activeDownloadOrUpload"></Button>
          <div class="flex flex-wrap align-items-center gap-5">
            <FileUpload ref="fileUpload" mode="basic" name="demo[]" :maxFileSize="10000000000" @upload="onUpload"
              :auto="true" chooseLabel="Hochladen" :customUpload="true" @select="onUpload" :multiple="true" />
            <Button label="Ordner erstellen" icon="pi pi-file" @click="addFolder()"></Button>
          </div>
        </div>
      </template>
      <Column>
        <template #body="{ data }">
          <i v-if="!data.isFile" class="pi pi-folder" style="font-size: 1.5em"></i>
          <i v-else class="pi pi-file" style="font-size: 1.5em"></i>
        </template>
        <template #header>
          <div v-if="dir !== '/media/filesystem'" class="flex gap-2">
            <i class="pi pi-arrow-left pr-3" style="cursor: pointer;" @click="goBack"></i>
            <i class="pi pi-home" style="cursor: pointer;" @click="goHome"></i>
          </div>
        </template>
      </Column>
      <Column :style="{ width: '1100px' }" field="name" header="Dateiname"></Column>
      <Column :style="{ width: '110px' }" field="size" header="Größe"></Column>
      <Column :style="{ width: '240px' }" field="created" header="Erstellt"></Column>
      <Column :style="{ width: '170px' }">
        <template #body="{ data }">
          <div class="flex align-items-center justify-content-center" :style="{ height: '50px' }">
            <Button v-if="!data.downloading && !data.uploading" @click="onDownload(data)" label="Download"
              icon="pi pi-download" class="w-full"></Button>
            <ProgressBar v-else :value="data.progress" class="w-full"></ProgressBar>
          </div>
        </template>
      </Column>
      <Column :style="{ width: '85px' }">
        <template #body="{ data }">
          <Button @click="onDelete(data, $event)" icon="pi pi-trash"
            :disabled="data.downloading || data.uploading"></Button>
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
import { AxiosError, HttpStatusCode } from 'axios';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/AuthStore';
import { useConfirm } from "primevue/useconfirm";
import { useRouter, useRoute } from 'vue-router';

let client: Socket;

const router = useRouter();
const route = useRoute();
const confirm = useConfirm();
const authStore = useAuthStore()
const toast = useToast();
const cloudStore = useCloudStore();
const dir = ref(route.params.subPath ? `/media/filesystem/${route.params.subPath}` : '/media/filesystem');
const files = ref<{ name: string, path: string, size: string, created: Date | String, downloading: boolean, uploading: boolean, progress: number }[]>([]);
const fileUpload: Ref = ref(null);
const activeDownloadOrUpload = ref(false)

const test = () => {
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (activeDownloadOrUpload.value) {
    const message = 'Bist du sicher das du neu laden möchtest? Deine Änderungen werden eventuell nicht gespeichert.';
    event.returnValue = message;
    return message;
  }
};

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  client = io('wss://zollneck.de', { path: '/socket.io', transports: ['websocket'] });
  client.on('downloadProgress', (data: { fileName: string, progress: number }) => {
    const file = files.value.find(f => f.name === data.fileName);
    if (file) {
      file.progress = Math.round(data.progress);
    }
  });
  getFiles(dir.value)
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (client) {
    client.disconnect();
  }
});

const onRowClick = async (event: { data: { name: string; path: string; isFile: boolean } }) => {
  if (!event.data.isFile) {
    await navigateToFolder(event.data);
  }
};


const addFolder = () => {
}

const updateDirAndGetFiles = async (newDir: string) => {
  dir.value = newDir;
  await getFiles(newDir);
};

const navigateToFolder = async (file: { name: string; path: string; }) => {
  const routerPath = file.path.replace('/media/filesystem/', '');
  router.push(`/apps/cloud/${routerPath}`);
  dir.value = file.path;
  await updateDirAndGetFiles(file.path);
};


const goBack = async () => {
  const pathSegments = dir.value.replace('/media/filesystem/', '').split('/');
  pathSegments.pop();
  const newSubPath = pathSegments.join('/');
  const newDir = newSubPath ? `/media/filesystem/${newSubPath}` : '/media/filesystem';
  router.push(`/apps/cloud/${newSubPath}`);
  await updateDirAndGetFiles(newDir);
};



const goHome = async () => {
  router.push({ name: 'cloud' });
  await updateDirAndGetFiles('/media/filesystem');
};


const onUpload = () => {
  authStore.checkUserToken()
  if (authStore.isAuthenticated == false) {
    toast.add({ severity: 'error', summary: 'Session abgelaufen!', detail: 'Aktion nicht durchgeführt, bitte lade die Seite neu.', group: 'sessionExpired' });
    return;
  }
  if (fileUpload.value) {
    const uploadedFiles = fileUpload.value.files;
    uploadedFiles.forEach(async (file: any) => {
      if (file.size > 70000000000) {
        toast.add({ severity: 'error', summary: 'Datei zu groß!', detail: 'Maximal können 70Gb hochgeladen werden.' });
      } else {
        const newFile = {
          name: file.name,
          path: "null",
          size: formatBytes(file.size),
          created: "Gearde eben",
          downloading: false,
          uploading: true,
          progress: 0,
          isFile: true
        };
        files.value.push(newFile);
      }
      const fileInProgress = files.value.find(f => f.name === file.name && f.uploading);

      const formData = new FormData();
      //encodeURIComponent(file.name) = umlaute im dateinamen korigieren
      formData.append('file', file, encodeURIComponent(file.name));
      formData.append('dir', '/media/filesystem');
      try {
        const response = await cloudStore.uploadFiles(formData, (percentCompleted) => {
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
        checkError(error);
      }
    });
  } else {
    console.error('FileUpload-Instanz ist nicht verfügbar');
  }
};

const onDownload = async (file: { downloading: boolean; name: string; isFile: boolean; }) => {
  if (!client || !client.id) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Socket-Verbindung nicht hergestellt', life: 3000 });
    return;
  }
  try {
    file.downloading = true;
    activeDownloadOrUpload.value = true;
    let response;
    if (file.isFile) {
      response = await cloudStore.downloadFile(file.name, client.id);
    } else {
      response = await cloudStore.downloadFolder(file.name, client.id);
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', response.headers['content-disposition']);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    checkError(error);
  } finally {
    file.downloading = false;
    activeDownloadOrUpload.value = false;
  }
};


const onDelete = async (file: { name: string; path: string; }, event: any) => {
  confirm.require({
    target: event.currentTarget,
    group: 'confirmDelete',
    message: "Willst du die Datei wirklich löschen?",
    icon: 'pi pi-exclamation-circle',
    acceptIcon: 'pi pi-check',
    rejectIcon: 'pi pi-times',
    acceptLabel: 'Confirm',
    rejectLabel: 'Cancel',
    rejectClass: 'p-button-outlined p-button-sm',
    acceptClass: 'p-button-sm',
    accept: async () => {
      try {
        const response = await cloudStore.deleteFile(file.path)
        //Löscht die File auch aus dem lokalen array falls gerade erst hochgeladen :)
        files.value = files.value.filter(f => f.name !== file.name);
        if (response == HttpStatusCode.Created) {
          toast.add({ severity: 'success', summary: file.name + ' gelöscht', detail: 'Die Datei ' + file.name + ' wurde erfolgreich gelöscht!', life: 3000 });
        } else {
          toast.add({ severity: 'error', summary: 'Löschen fehlgeschlagen', detail: 'Das Löschen der Datei ' + file.name + ' ist fehlgeschlagen!', life: 3000 });
        }
      } catch (error: any) {
        checkError(error);
      } finally {
      }
    },

    reject: () => {
      console.log("rejected")
    }
  });


}


const getFiles = async (dir: string) => {
  try {
    const fileList = await cloudStore.getFiles(dir);
    files.value = fileList.map((file: { size: any; created: string; isFile: boolean; }) => ({
      ...file,
      size: formatBytes(Number(file.size)),
      created: formatDate(file.created),
      downloading: false,
      isFile: file.isFile
    }));
    if (files.value.length === 0) {
      toast.add({ severity: 'info', summary: 'Ordner ist leer', detail: 'Keine Dateien in diesem Ordner!', life: 5000 });
    }
  } catch (error: any) {
    checkError(error);
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

const checkError = (error: any) => {
  if (error.response) {
    if (error.response.status === HttpStatusCode.Unauthorized) {
      toast.add({ severity: 'error', summary: 'Session abgelaufen!', detail: 'Aktion nicht durchgeführt, bitte lade die Seite neu.', group: 'sessionExpired' });
    } else {
      toast.add({ severity: 'error', summary: 'Unbehandelter Fehler!', detail: error.response.data.message, life: 3000 });
    }
  } else {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Ein unbekannter Fehler ist aufgetreten: ' + error.response.data.message, life: 3000 });
  }
};
</script>
