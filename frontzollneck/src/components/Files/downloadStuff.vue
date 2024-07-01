<template>
  <div class="p-d-flex p-jc-center p-ai-center pt-2">
    <DataTable :value="files" class="p-col-10">
      <template #header>
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <span class="text-xl text-900 font-bold"> Ordner: {{ dir }} </span>
          <Button icon="pi pi-upload" rounded raised label="Hochladen" />
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
import { onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useCloudStore } from '@/stores/CloudStore';

const cloudStore = useCloudStore();
const dir = ref("/")
const files = ref<{ name: string, path: string }[]>([]);

onMounted(async () => {
  try {
    const fileList = await cloudStore.getFiles();
    files.value = fileList;
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error);
  }
});

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
</script>
