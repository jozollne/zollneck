<template>
  <div class="flex align-items-center justify-content-center" style="min-height: 84vh">
    <div v-if="loading" class="flex flex-column align-items-center gap-3">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <span>Lädt...</span>
    </div>

    <div v-else-if="fatalError" class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-5 text-center">
      <i class="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
      <h2>{{ fatalError }}</h2>
    </div>

    <div v-else-if="needsPassword" class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-4">
      <div class="text-center mb-4">
        <i class="pi pi-lock text-4xl mb-2"></i>
        <h2>Passwortgeschützter Link</h2>
      </div>
      <div class="p-inputgroup mb-3">
        <InputText v-model="passwordInput" type="password" placeholder="Passwort eingeben" @keyup.enter="unlock" />
        <Button icon="pi pi-check" @click="unlock" :loading="unlocking" />
      </div>
    </div>

    <div v-else class="card p-4 shadow-4 border-round col-12 col-md-10 col-lg-7">
      <div class="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div class="flex align-items-center gap-2">
          <i v-if="currentPath !== ''" class="pi pi-arrow-left cursor-pointer" @click="goBack"></i>
          <span class="text-xl font-bold">{{ breadcrumbLabel }}</span>
        </div>
        <div class="flex gap-2">
          <Button label="Alles als ZIP" icon="pi pi-download" @click="downloadCurrent(true)" />
        </div>
      </div>

      <div v-if="meta?.oneTime" class="p-2 mb-3 border-round surface-100 text-sm">
        <i class="pi pi-info-circle mr-1"></i>
        Achtung: Dieser Link wird nach dem Download ungültig.
      </div>

      <div v-if="viewingSingleFile" class="flex flex-column align-items-center gap-3 p-4">
        <i class="pi pi-file text-6xl"></i>
        <span class="font-bold">{{ singleFileName }}</span>
        <Button label="Herunterladen" icon="pi pi-download" @click="downloadCurrent(false)" />
      </div>

      <DataTable v-else :value="items" @row-click="onRowClick" class="cursor-pointer">
        <Column>
          <template #body="{ data }">
            <i :class="data.isFile ? 'pi pi-file' : 'pi pi-folder'" style="font-size: 1.3em"></i>
          </template>
        </Column>
        <Column field="name" header="Name">
          <template #body="{ data }">
            <span :class="{ 'text-color-secondary': data.available === false }">{{ data.name }}</span>
            <span v-if="data.available === false" class="text-orange-500 text-sm ml-2">
              <i class="pi pi-exclamation-triangle mr-1"></i>nicht mehr verfügbar
            </span>
          </template>
        </Column>
        <Column header="Größe">
          <template #body="{ data }">{{ data.available === false ? '-' : formatBytes(data.size) }}</template>
        </Column>
        <Column header="">
          <template #body="{ data }">
            <Button v-if="data.isFile && data.available !== false" icon="pi pi-download" text
              @click.stop="downloadEntry(data)" />
          </template>
        </Column>
      </DataTable>

      <div v-if="canUpload" class="mt-4 pt-3 border-top-1 surface-border flex flex-column gap-2">
        <FileUpload ref="fileUpload" mode="basic" name="file[]" :maxFileSize="10000000000" chooseLabel="Datei hochladen"
          :customUpload="true" :auto="true" @select="onUpload" :multiple="true" />
        <div v-for="upload in uploadingFiles" :key="upload.name" class="flex align-items-center gap-2">
          <span class="text-sm">{{ upload.name }}</span>
          <ProgressBar :value="upload.progress" class="flex-grow-1"></ProgressBar>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { useCloudStore } from '@/stores/CloudStore';

interface Entry {
  name: string;
  isFile: boolean;
  size: number;
  relPath: string;
  available?: boolean;
}

const route = useRoute();
const toast = useToast();
const cloudStore = useCloudStore();
const id = route.params.id as string;

const loading = ref(true);
const fatalError = ref<string | null>(null);
const needsPassword = ref(false);
const passwordInput = ref('');
const unlocking = ref(false);
const shareToken = ref<string | undefined>(undefined);
const meta = ref<any>(null);
const currentPath = ref('');
const items = ref<Entry[]>([]);
const viewingSingleFile = ref(false);
const singleFileName = ref('');
const fileUpload = ref<any>(null);
const uploadingFiles = ref<{ name: string; progress: number }[]>([]);

const canUpload = computed(() => meta.value?.permission === 'write' && !viewingSingleFile.value);
const breadcrumbLabel = computed(() => (currentPath.value === '' ? 'Geteilte Inhalte' : currentPath.value.split('/').pop()));

onMounted(async () => {
  await loadMeta();
});

const loadMeta = async () => {
  loading.value = true;
  try {
    meta.value = await cloudStore.getSharedMeta(id);
    if (meta.value.requiresPassword) {
      needsPassword.value = true;
    } else {
      await loadCurrent();
    }
  } catch (error: any) {
    handleFatal(error);
  } finally {
    loading.value = false;
  }
};

const handleFatal = (error: any) => {
  if (error?.response?.status === 410) {
    fatalError.value = 'Der Link ist bereits abgelaufen.';
  } else if (error?.response?.status === 404) {
    fatalError.value = 'Dieser Link existiert nicht.';
  } else {
    fatalError.value = error?.response?.data?.message ?? 'Ein Fehler ist aufgetreten.';
  }
};

const unlock = async () => {
  unlocking.value = true;
  try {
    const result = await cloudStore.unlockSharedLink(id, passwordInput.value);
    shareToken.value = result.token;
    needsPassword.value = false;
    await loadCurrent();
  } catch (error: any) {
    if (error?.response?.status === 401) {
      toast.add({ severity: 'error', summary: 'Falsches Passwort', detail: 'Bitte erneut versuchen.', life: 3000 });
    } else {
      handleFatal(error);
    }
  } finally {
    unlocking.value = false;
  }
};

const loadCurrent = async () => {
  loading.value = true;
  try {
    const result = await cloudStore.browseSharedLink(id, currentPath.value, shareToken.value);
    if (result.type === 'file') {
      viewingSingleFile.value = true;
      singleFileName.value = result.file.name;
    } else {
      viewingSingleFile.value = false;
      items.value = result.items;
    }
  } catch (error: any) {
    handleFatal(error);
  } finally {
    loading.value = false;
  }
};

const onRowClick = async (event: { data: Entry }) => {
  if (!event.data.isFile) {
    currentPath.value = event.data.relPath;
    await loadCurrent();
  }
};

const goBack = async () => {
  const segments = currentPath.value.split('/');
  segments.pop();
  currentPath.value = segments.join('/');
  await loadCurrent();
};

const downloadEntry = (entry: Entry) => {
  const url = cloudStore.getSharedDownloadUrl(id, entry.relPath, shareToken.value);
  window.location.href = url;
};

const downloadCurrent = (asZip: boolean) => {
  const relPath = asZip ? '' : currentPath.value;
  const url = cloudStore.getSharedDownloadUrl(id, relPath, shareToken.value);
  window.location.href = url;
};

const onUpload = async () => {
  if (!fileUpload.value) return;
  const uploadedFiles = fileUpload.value.files;
  
  // Use for...of instead of forEach for proper async handling
  for (const file of uploadedFiles) {
    const progressEntry = { name: file.name, progress: 0 };
    const progressIndex = uploadingFiles.value.push(progressEntry) - 1;

    const formData = new FormData();
    formData.append('file', file, encodeURIComponent(file.name));
    try {
      await cloudStore.uploadToSharedLink(id, shareToken.value, formData, (percentCompleted) => {
        if (uploadingFiles.value[progressIndex]) {
          uploadingFiles.value[progressIndex].progress = percentCompleted;
        }
      });
      toast.add({ severity: 'success', summary: 'Hochgeladen', detail: `${file.name} wurde hochgeladen.`, life: 3000 });
      await loadCurrent();
    } catch (error: any) {
      toast.add({ severity: 'error', summary: 'Fehler', detail: 'Datei konnte nicht hochgeladen werden.', life: 3000 });
    } finally {
      uploadingFiles.value = uploadingFiles.value.filter((u) => u !== progressEntry);
    }
  }
  fileUpload.value.clear();
};

const formatBytes = (bytes: number) => {
  const TB = 1000000000000, GB = 1000000000, MB = 1000000, KB = 1000;
  if (bytes >= TB) return (bytes / TB).toFixed(2) + ' TB';
  if (bytes >= GB) return (bytes / GB).toFixed(2) + ' GB';
  if (bytes >= MB) return (bytes / MB).toFixed(2) + ' MB';
  if (bytes >= KB) return (bytes / KB).toFixed(2) + ' KB';
  return bytes + ' Bytes';
};
</script>

<style scoped>
.card {
  background-color: var(--surface-b);
}
</style>
