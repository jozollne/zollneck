<template>
  <div class="p-d-flex p-jc-center p-ai-center pt-2">
    <DataTable :value="files" class="p-col-10">
      <Column field="name" header="Dateiname"></Column>
      <Column field="size" header="Größe"></Column>
      <Column header="Download">
        <template #body="slotProps">
          <Button @click="downloadFile(slotProps.data.path, slotProps.data.name)" label="Download"
            icon="pi pi-download"></Button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

const files = ref([
  { name: 'Nordschleife BeamNG', path: '/files/ks_nord_v20231124_v2.zip', size: '494,37 MB' },
  { name: 'Brücke Viedos', path: '/files/DJI_0170.zip', size: '5,05 GB' },
]);

const downloadFile = (filePath: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = filePath;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>
