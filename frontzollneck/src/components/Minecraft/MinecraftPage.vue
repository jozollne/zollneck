<template>
    <ConfirmPopup group="confirmPowerServer">
        <template #message="slotProps">
            <div class="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border p-3 mb-3 pb-0">
                <i :class="slotProps.message.icon" class="text-6xl text-primary-500"></i>
                <p>{{ slotProps.message.message }}</p>
            </div>
        </template>
    </ConfirmPopup>
    <div class="flex align-items-center justify-content-center" style="height: 84vh">
        <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-6">
            <div class="text-center mb-4">
                <h1>Verwaltungsseite vom Miecraftserver zollneck.de</h1>
            </div>

            <div class="md:flex align-items-center justify-content-center gap-2">
                <Button :label="status" :disabled="loading" :severity="color" @click="getStatus()"
                    class="w-full"></Button>
                <Button v-if="running" :loading="loading" icon="pi pi-pause" severity="danger"
                    @click="stopServer()"></Button>
                <Button v-if="!running" :loading="loading" icon="pi pi-play" severity="success"
                    @click="startServer()"></Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMinecraftStore } from '@/stores/MinecraftStore';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";
import { HttpStatusCode } from 'axios';


const confirm = useConfirm();
const minecraftStore = useMinecraftStore();
const toast = useToast();
const running = ref();
const loading = ref();
const color = ref("warning")
const status = ref("Status: Unbekannt")

onMounted(async () => {
    getStatus()
});

const getStatus = async () => {
    try {
        const response = await minecraftStore.getStatus()
        if (response.running == true) {
            toast.add({ severity: 'success', summary: 'Server ist an!', detail: "Der Minecraft Server is an!", life: 3000 });
            running.value = true
            color.value = "success"
            status.value = "Status: Läuft"
        } else {
            toast.add({ severity: 'info', summary: 'Server ist aus!', detail: "Der Minecraft Server ist aus!", life: 3000 });
            color.value = "danger"
            running.value = false
            status.value = "Status: Aus"
        }
    } catch (error: any) {
        checkError(error)
    }
};

const startServer = async () => {
    showConfirmationPopup(
        'Willst du den Minecraft-Server wirklich starten?',
        async () => {
            try {
                const response = await minecraftStore.startServer();
                loading.value = true;
                toast.add({ severity: 'success', summary: 'Wird gestartet!', detail: 'Der Minecraft Server wird nun gestartet', life: 3000 });
                if (response.success) {
                    // Weitere Logik hier
                } else {
                    toast.add({ severity: 'warn', summary: 'Bereits gestartet oder Fehler!', detail: 'Der Minecraft Server ist bereits aktiv oder es ist ein Fehler aufgetreten', life: 3000 });
                }
                await getStatus();
            } catch (error: any) {
                checkError(error)
            } finally {
                loading.value = false;
            }
        }
    );
};

const stopServer = async () => {
    showConfirmationPopup(
        'Willst du den Minecraft-Server wirklich stoppen?',
        async () => {
            try {
                const response = await minecraftStore.stopServer();
                loading.value = true;
                toast.add({ severity: 'success', summary: 'Wird gestoppt!', detail: 'Der Minecraft Server wird nun gestoppt', life: 3000 });
                if (response.success) {
                    // Weitere Logik hier
                } else {
                    toast.add({ severity: 'warn', summary: 'Bereits gestoppt oder Fehler!', detail: 'Der Minecraft Server ist bereits aus oder es ist ein Fehler aufgetreten', life: 3000 });
                }
                await getStatus();
            } catch (error: any) {
                checkError(error)
            } finally {
                loading.value = false;
            }
        }
    );
};

const showConfirmationPopup = (message: string, onAccept: () => Promise<void>, onReject?: () => void) => {
    confirm.require({
        group: 'confirmPowerServer',
        message: message,
        icon: 'pi pi-exclamation-circle',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptLabel: 'Confirm',
        rejectLabel: 'Cancel',
        rejectClass: 'p-button-outlined p-button-sm',
        acceptClass: 'p-button-sm',
        accept: async () => {
            await onAccept();
        },
        reject: () => {
            if (onReject) {
                onReject();
            } else {
                console.log("rejected");
            }
        }
    });
};

const checkError = (error: any) => {
    if (error.response) {
        if (error.response.data.statusCode === HttpStatusCode.Unauthorized) {
            toast.add({ severity: 'error', summary: 'Session abgelaufen!', detail: 'Aktion nicht durchgeführt, bitte lade die Seite neu.', group: 'sessionExpired' });
        } else {
            toast.add({ severity: 'error', summary: 'Unbehandelter Fehler!', detail: error.message, life: 3000 });
        }
    } else {
        console.error(error.message);
        toast.add({ severity: 'error', summary: 'Fehler', detail: 'Ein unbekannter Fehler ist aufgetreten', life: 3000 });
    }
};
</script>

<style scoped>
.card {
    background-color: var(--surface-b);
}
</style>
