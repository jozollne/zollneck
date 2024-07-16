<template>
  <div class="p-d-flex p-jc-center p-ai-center pt-2">
    <Toast position="top-center" group="headless" @close="visible = false">
      <template #container="{ closeCallback }">
        <section class="flex p-3 gap-3 w-full bg-black-alpha-90" style="border-radius: 10px">
          <i class="pi pi-cloud-upload text-primary-500 text-2xl"></i>
          <div class="flex flex-column gap-3 w-full">
            <p class="m-0 font-semibold text-base text-white">{{ toastMessage }}</p>
            <div class="flex flex-column gap-2">
              <ProgressBar :value="uploadProgress" :showValue="false" :style="{ height: '4px' }"></ProgressBar>
              <label class="text-right text-xs text-white">{{ uploadProgress }}% uploaded...</label>
            </div>
            <div class="flex gap-3 mb-3">
              <Button label="Schließen" text class="text-white py-1 px-2" @click="closeCallback"></Button>
            </div>
          </div>
        </section>
      </template>
    </Toast>
    <DataTable :value="files" class="p-col-10">
      <template #header>
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <span class="text-xl text-900 font-bold"> Ordner: {{ dir }} </span>
          <FileUpload ref="fileUpload" mode="basic" name="demo[]" :maxFileSize="10000000000" @upload="onUpload"
            :auto="true" chooseLabel="Hochladen" :customUpload="true" @select="onUpload" />
        </div>
      </template>
      <Column field="name" header="Filename"></Column>
      <Column header="Download">
        <template #body="{ data }">
          <Button @click="downloadFile(data.name)" label="Download" icon="pi pi-download"></Button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useCloudStore } from '@/stores/CloudStore';
import { useToast } from "primevue/usetoast";
import { HttpStatusCode } from 'axios';

const toast = useToast();
const toastMessage = ref("");
const cloudStore = useCloudStore();
const dir = ref("/")
const files = ref<{ name: string, path: string }[]>([]);
const fileUpload: Ref = ref(null);
const uploadProgress = ref();
const visible = ref(false);

onMounted(async () => {
  getFiles()
});

const onUpload = () => {
  if (fileUpload.value) {
    const files = fileUpload.value.files;
    files.forEach(async (file: any) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await cloudStore.uploadFiles(formData, (percentCompleted) => {
          uploadProgress.value = percentCompleted;
          if (!visible.value) {
            toast.add({ group: 'headless' });
            toastMessage.value = `${file.name} wird hochgeladen!`;
            visible.value = true;
          }
        });

        if (response) {
          toastMessage.value = `${file.name} hochgeladen!`;
          getFiles()
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

const downloadFile = async (fileName: string) => {
  try {
    const response = await cloudStore.downloadFile(fileName);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', response.headers['content-disposition']);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {

  }
};

const getFiles = async () => {
  try {
    const fileList = await cloudStore.getFiles();
    files.value = fileList;
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error);
  }
}
</script>
