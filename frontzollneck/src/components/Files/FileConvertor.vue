<template>
    <div class="card">
        <div class="flex align-items-center justify-content-center" style="min-height: 82vh;">
            <div class="flex flex-column align-items-center">
                <FileUpload ref="fileUpload" :auto="false" :customUpload="true" :multiple="true"
                    :accept="getAcceptedFormats" :maxFileSize="1000000000" :name="'files'" @select="onSelectedFiles">

                    <template #header>
                        <div class="flex align-items-center justify-content-between w-full">
                            <div>
                                <Button rounded outlined icon="pi pi-plus" class="p-button-outlined m-2"
                                    :disabled="!selectedType" @click="chooseFiles" />
                                <Button icon="pi pi-cloud-upload" rounded outlined class="p-button-success m-2"
                                    @click="storeAndConvertFile" :disabled="!filesSelected" />
                                <Button outlined rounded icon="pi pi-times" class="p-button-danger m-2" @click="clearFiles"
                                    :disabled="!filesSelected" />
                            </div>
                            <Dropdown v-model="selectedFormat" :options="formats" optionLabel="name" placeholder="Format"
                                :disabled="!selectedType" filter />
                        </div>

                        <div class="flex flex-wrap justify-content-center gap-3">
                            <div class="flex align-items-center">
                                <RadioButton v-model="selectedType" value="Audio" inputId="typeAudio" name="fileType" />
                                <label for="typeAudio" class="ml-2">Audio</label>
                            </div>
                            <div class="flex align-items-center">
                                <RadioButton v-model="selectedType" value="Video" inputId="typeVideo" name="fileType" />
                                <label for="typeVideo" class="ml-2">Video</label>
                            </div>
                            <div class="flex align-items-center">
                                <RadioButton v-model="selectedType" value="Bild" inputId="typeImage" name="fileType" />
                                <label for="typeImage" class="ml-2">Bild</label>
                            </div>
                        </div>
                    </template>

                    <template #content="{ files, removeFileCallback }">
                        <div v-if="files.length > 0">
                            <div class="flex flex-wrap p-0 sm:p-5 gap-5 align-items-center justify-content-center">
                                <div v-for="(file, index) in files" :key="file.name"
                                    class="card flex flex-column align-items-center gap-3 border-top-2 border-primary">
                                    <span class="font-semibold mt-2">{{ file.name }}</span>
                                    <div>{{ formatSize(file.size) }}</div>
                                    <Badge :value="uploadStatus.get(file.name) || 'Ausstehend'"
                                        :severity="uploadStatus.get(file.name) === 'Erfolgreich' ? 'success' : (uploadStatus.get(file.name) === 'Fehlgeschlagen' ? 'danger' : 'warning')" />
                                    <ProgressBar :value="uploadProgress.get(file.name)" :showValue="false"></ProgressBar>
                                    <Button icon="pi pi-times" @click="() => removeFileCallback(index)" outlined rounded
                                        severity="danger" />
                                </div>
                            </div>
                        </div>
                    </template>
                    <template #empty>
                        <div class="flex align-items-center justify-content-center flex-column">
                            <i class="pi pi-cloud-upload border-2 border-circle p-2 text-3xl text-400 border-400" />
                            <p class="mt-4 mb-0">Datein zum hochladen hier rein ziehen.</p>
                        </div>
                    </template>
                </FileUpload>
            </div>
        </div>
    </div>
</template>


<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import axios, { HttpStatusCode } from 'axios';
import { useFunctionsStore } from '@/stores/funtionsStore';
import { useUploadStore } from '@/stores/UploadStore';

const uploadStore = useUploadStore();
const functionStore = useFunctionsStore();
const toast = useToast();
const selectedType = ref('');
const uploadProgress = ref(new Map());
const uploadStatus = ref(new Map());
const fileUpload: Ref = ref(null);
const filesSelected = ref(false);
const selectedFormat = ref({ name: '', code: '' }); // Initialisiert mit einem leeren Objekt

const updateProgress = (file: { name: any; }, progress: number) => {
    uploadProgress.value.set(file.name, progress);
};

const updateStatus = (file: { name: any; }, status: string) => {
    uploadStatus.value.set(file.name, status);
};

const formats = computed(() => {
    switch (selectedType.value) {
        case 'Audio':
            return audioFormats;
        case 'Video':
            return videoFormats;
        case 'Bild':
            return imageFormats;
        default:
            return [];
    }
});

watch(selectedType, (newType) => {
    switch (newType) {
        case 'Audio':
            selectedFormat.value = audioFormats[0];
            break;
        case 'Video':
            selectedFormat.value = videoFormats[0];
            break;
        case 'Bild':
            selectedFormat.value = imageFormats[0];
            break;
        default:
            selectedFormat.value = { name: '', code: '' };
    }
});

const getAcceptedFormats = computed(() => {
    switch (selectedType.value) {
        case 'Audio':
            return 'audio/*,.unknown';
        case 'Video':
            return 'video/*';
        case 'Bild':
            return 'image/*';
        default:
            return '';
    }
});

const audioFormats = [
    { name: '.mp3', code: '.mp3' },
    { name: '.wav', code: '.wav' },
    { name: '.flac', code: '.flac' },
    { name: '.m4a', code: '.m4a' },
    { name: '.aac', code: '.aac' },
    { name: '.ogg', code: '.ogg' },
    { name: '.webm', code: '.webm' },
];

const videoFormats = [
    { name: '.mp4', code: '.mp4' },
    { name: '.webm', code: '.webm' },
    { name: '.avi', code: '.avi' },
    { name: '.mov', code: '.mov' },
    { name: '.wmv', code: '.wmv' },
    { name: '.flv', code: '.flv' },
    { name: '.mkv', code: '.mkv' }
];

const imageFormats = [
    { name: '.jpg', code: '.jpg' },
    { name: '.jpeg', code: '.jpeg' },
    { name: '.png', code: '.png' },
/*     { name: '.pdf', code: '.pdf' }, */
    { name: '.gif', code: '.gif' },
    { name: '.bmp', code: '.bmp' },
    { name: '.tiff', code: '.tiff' },
    { name: '.svg', code: '.svg' }
];

const storeAndConvertFile = () => {
    if (fileUpload.value) {
        const files = fileUpload.value.files;
        files.forEach(async (file: any) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('format', selectedFormat.value.name);

            try {
                const response = await uploadStore.storeAndConvertFile(formData, (percentCompleted) => {
                    updateProgress(file, percentCompleted);
                });

                if (response.fileId) {
                    downloadFile(response.fileId);
                    updateStatus(file, 'Erfolgreich');
                    removeFileAfterSuccess(file.name);
                }
            } catch (error: any) {
                updateStatus(file, 'Fehlgeschlagen');
                if (error.response.data.statusCode == HttpStatusCode.Unauthorized) {
                    toast.add({ severity: 'error', summary: 'Session ungültig!', detail: 'Die Sitzung ist abgelaufen. Melde dich erneut an.', life: 3000 });
                    functionStore.goToAuth();
                } else {
                    toast.add({ severity: 'error', summary: 'Konvertierung fehlgeschlagen', detail: error.response.data.message, life: 3000 });
                }
            }
        });
    } else {
        console.error('FileUpload-Instanz ist nicht verfügbar');
    }
};
const removeFileAfterSuccess = (file: any) => {
    setTimeout(() => {
        if (fileUpload.value) {
            const index = fileUpload.value.files.findIndex((f: { name: any; }) => f.name === file);
            if (index !== -1) {
                fileUpload.value.files.splice(index, 1);
                filesSelected.value = false;
            }
        }
    }, 2000);
};

const downloadFile = async (fileId: string) => {
    try {
        const response = await uploadStore.downloadFile(fileId);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await deleteFile(fileId);
    } catch (error) {

    }
};

const deleteFile = async (fileId: string) => {
    try {
        const result = await uploadStore.deleteFile(fileId);
        if (result.result) {
            toast.add({ severity: 'success', summary: 'Datei gelöscht', detail: 'Die Datei wurde erfolgreich gelöscht.', life: 3000 });
        }
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            toast.add({ severity: 'error', summary: 'Konvertierung fehlgeschlagen', detail: error.response.data.message, life: 3000 });
        }
    }
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const onSelectedFiles = () => {
    filesSelected.value = true;
};

const chooseFiles = () => {
    if (fileUpload.value) {
        fileUpload.value.choose();
    }
};

const clearFiles = () => {
    if (fileUpload.value) {
        fileUpload.value.clear();
        filesSelected.value = false;
    }
};
</script>
  
<style></style>
