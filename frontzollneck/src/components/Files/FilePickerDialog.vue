<template>
  <Dialog :visible="visible" @update:visible="onVisibleChange" modal :style="{ width: '36rem' }"
    :breakpoints="{ '960px': '90vw', '640px': '95vw' }" header="Datei oder Ordner hinzufügen">
    <div class="flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <i v-if="currentDir !== rootDir" class="pi pi-arrow-left cursor-pointer" @click="goBack"></i>
        <i class="pi pi-home cursor-pointer" @click="goHome"></i>
        <span class="font-bold">{{ currentDir.replace(rootDir, 'home') }}</span>
      </div>

      <div v-if="loading" class="flex justify-content-center p-4">
        <i class="pi pi-spin pi-spinner text-3xl"></i>
      </div>
      <div v-else class="flex flex-column gap-1" style="max-height: 50vh; overflow-y: auto;">
        <div v-for="entry in entries" :key="entry.path"
          class="flex align-items-center gap-2 p-2 border-round hover:surface-hover"
          :class="{ 'surface-hover': isAlreadyAdded(entry.path) }">
          <Checkbox :model-value="isAlreadyAdded(entry.path) || isSelected(entry.path)"
            :disabled="isAlreadyAdded(entry.path)" binary @update:model-value="toggleSelect(entry)" />
          <i :class="entry.isFile ? 'pi pi-file' : 'pi pi-folder'"></i>
          <span class="flex-grow-1 cursor-pointer" @click="!entry.isFile && enterFolder(entry)">{{ entry.name }}</span>
          <span v-if="isAlreadyAdded(entry.path)" class="text-xs text-color-secondary">bereits hinzugefügt</span>
          <i v-if="!entry.isFile" class="pi pi-chevron-right cursor-pointer" @click="enterFolder(entry)"></i>
        </div>
        <div v-if="entries.length === 0" class="text-center text-color-secondary p-3">Ordner ist leer.</div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button label="Abbrechen" severity="secondary" @click="close" />
        <Button label="Hinzufügen" icon="pi pi-plus" :disabled="selection.length === 0" @click="confirm" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import { useToast } from 'primevue/usetoast';
import { useCloudStore } from '@/stores/CloudStore';

interface FileItem {
  name: string;
  path: string;
  isFile: boolean;
}

const props = defineProps<{
  visible: boolean;
  excludePaths: string[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', items: FileItem[]): void;
}>();

const toast = useToast();
const cloudStore = useCloudStore();
const rootDir = '/media/filesystem';
const currentDir = ref(rootDir);
const entries = ref<FileItem[]>([]);
const loading = ref(false);
const selection = ref<FileItem[]>([]);

watch(() => props.visible, async (val) => {
  if (val) {
    currentDir.value = rootDir;
    selection.value = [];
    await loadEntries();
  }
});

const loadEntries = async () => {
  loading.value = true;
  try {
    const fileList = await cloudStore.getFiles(currentDir.value);
    entries.value = fileList.map((f: { name: string; path: string; isFile: boolean }) => ({
      name: f.name,
      path: f.path,
      isFile: f.isFile,
    }));
  } catch (error: any) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Ordner konnte nicht geladen werden.', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const enterFolder = async (entry: FileItem) => {
  if (entry.isFile) return;
  currentDir.value = entry.path;
  await loadEntries();
};

const goBack = async () => {
  const segments = currentDir.value.replace(rootDir, '').split('/').filter(Boolean);
  segments.pop();
  currentDir.value = segments.length ? `${rootDir}/${segments.join('/')}` : rootDir;
  await loadEntries();
};

const goHome = async () => {
  currentDir.value = rootDir;
  await loadEntries();
};

const isAlreadyAdded = (path: string) => props.excludePaths.includes(path);
const isSelected = (path: string) => selection.value.some((s) => s.path === path);

const toggleSelect = (entry: FileItem) => {
  if (isAlreadyAdded(entry.path)) return;
  if (isSelected(entry.path)) {
    selection.value = selection.value.filter((s) => s.path !== entry.path);
  } else {
    selection.value.push(entry);
  }
};

const confirm = () => {
  emit('select', selection.value);
  close();
};

const onVisibleChange = (val: boolean) => emit('update:visible', val);

const close = () => emit('update:visible', false);
</script>
