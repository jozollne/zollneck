<template>
  <Dialog :visible="visible" @update:visible="onVisibleChange" modal :style="{ width: '32rem' }"
    :breakpoints="{ '960px': '90vw', '640px': '95vw' }" header="Link teilen" :closable="!creating">
    <div v-if="!createdLink" class="flex flex-column gap-4">
      <!-- Ausgewählte Elemente -->
      <div class="flex flex-column gap-2">
        <label class="font-bold">Ausgewählte Elemente ({{ selectedItems.length }})</label>
        <div class="flex flex-wrap gap-2">
          <Chip v-for="item in selectedItems" :key="item.path" :label="item.name"
            :icon="item.isFile ? 'pi pi-file' : 'pi pi-folder'" removable @remove="removeItem(item)" />
        </div>
        <Button label="Weitere Datei/Ordner hinzufügen..." icon="pi pi-plus" severity="secondary" outlined
          @click="filePickerVisible = true" />
      </div>

      <FilePickerDialog v-model:visible="filePickerVisible" :excludePaths="selectedItems.map(i => i.path)"
        @select="onPickerSelect" />

      <Divider class="m-0" />

      <!-- Einmaliger Aufruf -->
      <div class="flex align-items-center justify-content-between">
        <div>
          <label class="font-bold">Einmaliger Aufruf</label>
          <p class="text-sm text-color-secondary m-0">Link wird nach dem ersten Download ungültig.</p>
        </div>
        <InputSwitch v-model="oneTime" />
      </div>

      <Divider class="m-0" />

      <!-- Passwortschutz -->
      <div class="flex flex-column gap-2">
        <div class="flex align-items-center justify-content-between">
          <div>
            <label class="font-bold">Passwortschutz</label>
            <p class="text-sm text-color-secondary m-0">Empfänger muss ein Passwort eingeben.</p>
          </div>
          <InputSwitch v-model="passwordProtected" />
        </div>
        <div v-if="passwordProtected" class="p-inputgroup">
          <InputText v-model="password" placeholder="Passwort" />
          <Button icon="pi pi-refresh" v-tooltip.top="'Zufälliges Passwort generieren'"
            severity="secondary" @click="generatePassword" />
          <Button icon="pi pi-copy" v-tooltip.top="'Passwort kopieren'" severity="secondary"
            :disabled="!password" @click="copyPassword" />
        </div>
      </div>

      <Divider class="m-0" />

      <!-- Gültigkeitsdauer -->
      <div class="flex flex-column gap-2">
        <label class="font-bold">Gültigkeitsdauer</label>
        <Dropdown v-model="expiryPreset" :options="expiryOptions" optionLabel="label" optionValue="value"
          class="w-full" />
        <Calendar v-if="expiryPreset === 'custom'" v-model="customExpiry" showTime dateFormat="dd.mm.yy"
          :minDate="new Date()" placeholder="Datum & Uhrzeit wählen" class="w-full" />
      </div>

      <Divider class="m-0" />

      <!-- Berechtigungen -->
      <div class="flex flex-column gap-2">
        <label class="font-bold">Berechtigung</label>
        <div class="flex gap-4">
          <div class="flex align-items-center gap-2">
            <RadioButton v-model="permission" inputId="perm-read" value="read" />
            <label for="perm-read">Nur lesen</label>
          </div>
          <div class="flex align-items-center gap-2">
            <RadioButton v-model="permission" inputId="perm-write" value="write" :disabled="!canWrite" />
            <label for="perm-write">Lesen &amp; schreiben</label>
          </div>
        </div>
        <p v-if="!canWrite" class="text-sm text-color-secondary m-0">
          Schreibzugriff ist nur möglich, wenn genau ein Ordner geteilt wird.
        </p>
      </div>
    </div>

    <!-- Erfolgs-Ansicht -->
    <div v-else class="flex flex-column align-items-center gap-4">
      <i class="pi pi-check-circle text-6xl text-green-500"></i>
      <span class="font-bold text-lg">Link wurde erstellt!</span>

      <div class="p-inputgroup w-full">
        <InputText :model-value="createdLink.url" readonly />
        <Button :icon="copied ? 'pi pi-check' : 'pi pi-copy'" :label="copied ? 'Kopiert!' : 'Kopieren'"
          @click="copyLink" />
      </div>

      <div class="flex flex-column align-items-center gap-2">
        <span class="font-bold">Quick Download</span>
        <img :src="qrCodeUrl" alt="QR Code" width="200" height="200" class="border-round shadow-2" />
        <span class="text-sm text-color-secondary">QR-Code scannen für Direkt-Download als ZIP</span>
      </div>
    </div>

    <template #footer>
      <div v-if="!createdLink" class="flex justify-content-end gap-2">
        <Button label="Abbrechen" severity="secondary" @click="close" :disabled="creating" />
        <Button label="Link erstellen" icon="pi pi-link" @click="submit" :loading="creating"
          :disabled="selectedItems.length === 0" />
      </div>
      <div v-else class="flex justify-content-end">
        <Button label="Fertig" @click="close" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Chip from 'primevue/chip';
import Dropdown from 'primevue/dropdown';
import Divider from 'primevue/divider';
import Calendar from 'primevue/calendar';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { useCloudStore, type SharedLinkDto } from '@/stores/CloudStore';
import FilePickerDialog from './FilePickerDialog.vue';

interface FileItem {
  name: string;
  path: string;
  isFile: boolean;
}

const props = defineProps<{
  visible: boolean;
  items: FileItem[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'created', link: SharedLinkDto): void;
}>();

const toast = useToast();
const cloudStore = useCloudStore();

const selectedItems = ref<FileItem[]>([]);
const filePickerVisible = ref(false);
const oneTime = ref(false);
const passwordProtected = ref(false);
const password = ref('');
const permission = ref<'read' | 'write'>('read');
const creating = ref(false);
const copied = ref(false);
const createdLink = ref<SharedLinkDto | null>(null);

const expiryOptions = [
  { label: '1 Stunde', value: '1h' },
  { label: '1 Tag', value: '1d' },
  { label: '7 Tage', value: '7d' },
  { label: '30 Tage', value: '30d' },
  { label: 'Benutzerdefiniert', value: 'custom' },
  { label: 'Läuft nie ab', value: 'never' },
];
const expiryPreset = ref('7d');
const customExpiry = ref<Date | null>(null);

const canWrite = computed(() => selectedItems.value.length === 1 && !selectedItems.value[0].isFile);

const qrCodeUrl = computed(() => (createdLink.value ? cloudStore.getSharedQrCodeUrl(createdLink.value.id) : ''));

watch(() => props.visible, (val) => {
  if (val) {
    selectedItems.value = [...props.items];
    oneTime.value = false;
    passwordProtected.value = false;
    password.value = '';
    permission.value = 'read';
    expiryPreset.value = '7d';
    customExpiry.value = null;
    createdLink.value = null;
    copied.value = false;
  }
});

watch(canWrite, (val) => {
  if (!val) permission.value = 'read';
});

const removeItem = (item: FileItem) => {
  selectedItems.value = selectedItems.value.filter((i) => i.path !== item.path);
};

const onPickerSelect = (items: FileItem[]) => {
  const newItems = items.filter((i) => !selectedItems.value.some((s) => s.path === i.path));
  selectedItems.value.push(...newItems);
};

const generatePassword = () => {
  // Bewusst einfache, gut lesbare Zeichen ohne Verwechslungsgefahr (kein 0/O, 1/l/I).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let generated = '';
  for (let i = 0; i < 12; i++) {
    generated += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password.value = generated;
};

const copyPassword = () => {
  navigator.clipboard.writeText(password.value);
  toast.add({ severity: 'success', summary: 'Kopiert!', detail: 'Passwort wurde kopiert.', life: 3000 });
};

const copyLink = () => {
  if (!createdLink.value) return;
  navigator.clipboard.writeText(createdLink.value.url);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const computeExpiresAt = (): string | undefined => {
  const now = Date.now();
  switch (expiryPreset.value) {
    case '1h': return new Date(now + 60 * 60 * 1000).toISOString();
    case '1d': return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'custom': return customExpiry.value ? customExpiry.value.toISOString() : undefined;
    case 'never': return undefined;
    default: return undefined;
  }
};

const submit = async () => {
  if (selectedItems.value.length === 0) return;
  if (passwordProtected.value && !password.value) {
    toast.add({ severity: 'warn', summary: 'Passwort fehlt', detail: 'Bitte ein Passwort eingeben oder generieren.', life: 3000 });
    return;
  }
  if (expiryPreset.value === 'custom' && !customExpiry.value) {
    toast.add({ severity: 'warn', summary: 'Datum fehlt', detail: 'Bitte ein Ablaufdatum wählen.', life: 3000 });
    return;
  }

  creating.value = true;
  try {
    const link = await cloudStore.createSharedLink({
      paths: selectedItems.value.map((i) => i.path),
      permission: permission.value,
      oneTime: oneTime.value,
      password: passwordProtected.value ? password.value : undefined,
      expiresAt: computeExpiresAt(),
    });
    createdLink.value = link;
    emit('created', link);
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Fehler',
      detail: error?.response?.data?.message ?? 'Der Link konnte nicht erstellt werden.',
      life: 4000,
    });
  } finally {
    creating.value = false;
  }
};

const onVisibleChange = (val: boolean) => {
  if (!creating.value) emit('update:visible', val);
};

const close = () => {
  emit('update:visible', false);
};
</script>
