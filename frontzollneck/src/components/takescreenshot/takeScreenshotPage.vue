<script setup lang="ts">
import { ref, watch } from "vue";
import { useScreenshotStore } from "@/stores/ScreenshotStroe";
import { useToast } from 'primevue/usetoast';
import { HttpStatusCode } from "axios";

const toast = useToast();
const screenshotStore = useScreenshotStore();
const url = ref("");
const availableFormats = ref([
  { format: "PNG", code: "png" },
  { format: "JPEG", code: "jpeg" },
]);
const selectedFormat = ref("");
const availableResolutions = ref([
  { label: "720p", width: 1280, height: 720 },
  { label: "Full-HD", width: 1920, height: 1080 },
  { label: "QHD", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
]);
interface SelectedResolutionType {
  label: string;
  width: number;
  height: number;
}
const selectedResolution = ref<SelectedResolutionType>();
const toogleWatermark = ref(false);
const watermarkText = ref("");
const toggleAuth = ref(false);
const auth = ref({
  username: "",
  password: "",
});
const screenshot = ref("");
const showScreenshot = ref(false);
const loading = ref(false)


watch(toggleAuth, (newVal) => {
  if (!newVal) {
    auth.value.username = "";
    auth.value.password = "";
  }
});

watch(toogleWatermark, (newVal) => {
  if (!newVal) {
    watermarkText.value = "";
  }
});

const takeScreenshot = async () => {
  try {
    loading.value = true
    screenshot.value = await screenshotStore.takeAndSaveScreenshot(
      url.value,
      selectedFormat.value,
      selectedResolution.value?.width,
      selectedResolution.value?.height,
      watermarkText.value,
      auth.value.username,
      auth.value.password
    );
    showScreenshot.value = true
  } catch (error: any) {
    if (error.response.status == 401) {
      toast.add({ severity: 'error', summary: 'Session ungültig!', detail: 'Die Sitzung ist abgelaufen. Melde dich erneut an.', life: 7000 });
    } else {
      toast.add({ severity: 'error', summary: "Fehler:", detail: error.response.data.message, life: 7000 });
    }
  } finally {
    loading.value = false
  }
};

const downloadScreenshot = async (screenshotURL: string) => {
  try {
    // Hole das Bild als Blob
    const response = await fetch(screenshotURL);
    
    if (!response.ok) {
      throw new Error('Screenshot konnte nicht heruntergeladen werden.');
    }

    const blob = await response.blob();
    
    // Erstelle einen temporären Download-Link
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Setze den Dateinamen (du kannst diesen dynamisch anpassen)
    const fileName = screenshotURL.split('/').pop(); // Name aus der URL extrahieren
    link.download = fileName || 'screenshot.png'; // Fallback auf 'screenshot.png' falls der Dateiname fehlt
    
    // Simuliere den Klick auf den Link
    document.body.appendChild(link);
    link.click();
    
    // Entferne den Link und hebe das URL-Object auf
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Fehler beim Herunterladen des Screenshots:', error);
  }
};
</script>

<template>
  <Dialog v-model:visible="showScreenshot" modal :header="url" class="w-8">
    <img v-if="screenshot" :src="screenshot" alt="Screenshot" class="w-full">
    <!-- <div class="flex align-items-center justify-content-center pt-2">
      <Button label="Herrunterladen" @click="downloadScreenshot(screenshot)"></Button>
    </div> -->
  </Dialog>

  <div class="flex align-items-center justify-content-center" style="height: 84vh">
    <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-6">
      <div class="text-center mb-4">
        <h1>Mach screenshots von anderen Seiten</h1>
      </div>

      <form @submit.prevent="takeScreenshot">
        <div class="field">
          <span class="p-float-label">
            <InputText v-model="url" id="url" class="w-full"></InputText>
            <label for="url">Link z.B. https://zollneck.de</label>
          </span>
        </div>

        <div class="md:flex align-items-center justify-content-center gap-2">
          <Dropdown v-model="selectedFormat" :options="availableFormats" optionLabel="format" optionValue="code"
            placeholder="Format auswählen" class="w-full mb-2"></Dropdown>
          <Dropdown v-model="selectedResolution" :options="availableResolutions" optionLabel="label"
            placeholder="Auflösung auswählen" class="w-full mb-2"></Dropdown>
          <InputText v-if="toogleWatermark" v-model="watermarkText" placeholder="Wasserzeichen" class="w-full mb-2"></InputText>

          <InputText v-if="toggleAuth" v-model="auth.username" placeholder="Nutzername" class="w-full mb-2"></InputText>
          <InputText v-if="toggleAuth" v-model="auth.password" placeholder="Passwort" class="w-full mb-2"></InputText>
        </div>

        <div class="field flex flex-column align-items-center justify-content-center gap-2">
          <div class="flex flex-row align-items-center gap-2">
            <label>Wasserzeichen:</label>
            <InputSwitch v-model="toogleWatermark"></InputSwitch>
            <label>Zugangsdaten zur Seite:</label>
            <InputSwitch v-model="toggleAuth"></InputSwitch>
          </div>
        </div>


        <Button type="submit" :disabled="!selectedResolution || !selectedFormat || !url" label="Screenshot"
          icon="pi pi-camera" class="w-full" :loading="loading"></Button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: var(--surface-b);
}
</style>
