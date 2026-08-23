<template>
  <Dialog :visible="visible" @update:visible="onVisibleChange" modal
    :style="{ width: '38rem' }" :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
    header="Freigaben verwalten">
    <div v-if="loading" class="flex justify-content-center p-4">
      <i class="pi pi-spin pi-spinner text-3xl"></i>
    </div>
    <div v-else-if="links.length === 0" class="text-center text-color-secondary p-4">
      Keine aktiven Freigaben für dieses Element.
    </div>
    <div v-else class="flex flex-column gap-3">
      <div v-for="link in links" :key="link.id" class="border-1 surface-border border-round p-3 flex flex-column gap-2">
        <div class="flex align-items-center justify-content-between">
          <Tag :value="statusLabel(link.status)" :severity="statusSeverity(link.status)" />
          <span class="text-sm text-color-secondary">{{ link.paths.length }} Element(e)</span>
        </div>

        <div class="p-inputgroup">
          <InputText :model-value="link.url" readonly />
          <Button icon="pi pi-copy" severity="secondary" v-tooltip.top="'Link kopieren'" @click="copyLink(link)" />
        </div>

        <div class="flex flex-wrap gap-3 text-sm text-color-secondary">
          <span><i class="pi pi-eye mr-1"></i>{{ link.accessCount }} Aufrufe</span>
          <span><i class="pi pi-download mr-1"></i>{{ link.downloadCount }} Downloads</span>
          <span v-if="link.hasPassword"><i class="pi pi-lock mr-1"></i>Passwortgeschützt</span>
          <span><i class="pi pi-pencil mr-1"></i>{{ link.permission === 'write' ? 'Lesen & Schreiben' : 'Nur lesen' }}</span>
          <span v-if="link.expiresAt"><i class="pi pi-clock mr-1"></i>Läuft ab: {{ formatDate(link.expiresAt) }}</span>
          <span v-else><i class="pi pi-infinity mr-1"></i>Läuft nie ab</span>
        </div>

        <div class="flex flex-column gap-1">
          <span class="text-sm font-bold">Freigegebene Elemente ({{ link.items.length }})</span>
          <div v-for="item in link.items" :key="item.path"
            class="flex align-items-center gap-2 text-sm border-1 surface-border border-round p-2"
            :class="{ 'text-color-secondary': !item.exists }">
            <i :class="item.isFile ? 'pi pi-file' : 'pi pi-folder'"></i>
            <span class="font-medium">{{ item.name }}</span>
            <span v-if="!item.exists" class="text-orange-500">
              <i class="pi pi-exclamation-triangle mr-1"></i>nicht mehr verfügbar
            </span>
            <span class="text-color-secondary ml-auto" style="font-size: 0.8em; word-break: break-all;">{{ item.path.replace(/^\/media\/filesystem\/?/, 'home/') }}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 justify-content-end">
          <Button label="+7 Tage" icon="pi pi-calendar-plus" severity="secondary" size="small"
            :disabled="link.status === 'revoked'" @click="extend(link, 7)" />
          <Button label="+30 Tage" icon="pi pi-calendar-plus" severity="secondary" size="small"
            :disabled="link.status === 'revoked'" @click="extend(link, 30)" />
          <Button v-if="!link.revoked" label="Widerrufen" icon="pi pi-ban" severity="warning" size="small"
            @click="revoke(link)" />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Schließen" @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { useCloudStore, type SharedLinkDto } from '@/stores/CloudStore';

const props = defineProps<{
  visible: boolean;
  path: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'changed'): void;
}>();

const toast = useToast();
const cloudStore = useCloudStore();
const links = ref<SharedLinkDto[]>([]);
const loading = ref(false);

const onVisibleChange = (v: boolean) => emit('update:visible', v);

watch(() => props.visible, async (val) => {
  if (val) await loadLinks();
});

const loadLinks = async () => {
  loading.value = true;
  try {
    const result = await cloudStore.lookupSharedLinks([props.path]);
    // Nur aktive Links anzeigen
    links.value = (result[props.path] ?? []).filter(link => link.status === 'active');
  } catch (error: any) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Freigaben konnten nicht geladen werden.', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'expired': return 'Abgelaufen';
    case 'used': return 'Verwendet';
    case 'revoked': return 'Widerrufen';
    default: return status;
  }
};

const statusSeverity = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'expired': return 'warning';
    case 'used': return 'warning';
    case 'revoked': return 'danger';
    default: return 'info';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('de-DE');
};

const copyLink = async (link: SharedLinkDto) => {
  try {
    await navigator.clipboard.writeText(link.url);
    toast.add({ severity: 'success', summary: 'Kopiert!', detail: 'Link wurde kopiert.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Link konnte nicht kopiert werden.', life: 3000 });
  }
};

const extend = async (link: SharedLinkDto, days: number) => {
  const base = link.expiresAt && new Date(link.expiresAt).getTime() > Date.now() ? new Date(link.expiresAt) : new Date();
  const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  try {
    await cloudStore.updateSharedLink(link.id, { expiresAt: newExpiry.toISOString() });
    toast.add({ severity: 'success', summary: 'Verlängert', detail: `Link wurde um ${days} Tage verlängert.`, life: 3000 });
    await loadLinks();
    emit('changed');
  } catch (error: any) {
    const message = error?.response?.status === 404 ? 'Link existiert nicht mehr.' : 'Link konnte nicht verlängert werden.';
    toast.add({ severity: 'error', summary: 'Fehler', detail: message, life: 3000 });
  }
};

const revoke = async (link: SharedLinkDto) => {
  try {
    await cloudStore.updateSharedLink(link.id, { revoked: true });
    toast.add({ severity: 'success', summary: 'Widerrufen', detail: 'Der Link wurde widerrufen.', life: 3000 });
    await loadLinks();
    emit('changed');
  } catch (error: any) {
    const message = error?.response?.status === 404 ? 'Link existiert nicht mehr.' : 'Link konnte nicht widerrufen werden.';
    toast.add({ severity: 'error', summary: 'Fehler', detail: message, life: 3000 });
  }
};
</script>
