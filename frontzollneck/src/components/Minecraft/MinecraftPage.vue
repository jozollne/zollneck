<template>
    <ConfirmPopup group="confirmPowerServer">
        <template #message="slotProps">
            <div class="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border p-3 mb-3 pb-0">
                <i :class="slotProps.message.icon" class="text-6xl text-primary-500"></i>
                <p>{{ slotProps.message.message }}</p>
            </div>
        </template>
    </ConfirmPopup>
    <div class="flex align-items-center justify-content-center" style="height: 79vh">
        <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-6">
            <div class="text-center md:text-lg text-xs mb-4">
                <h1>Verwaltungsseite vom Minecraftserver zollneck.de</h1>
            </div>

            <div class="flex align-items-center justify-content-center gap-2">
                <Button :label="status" :disabled="loading" :severity="color" @click="getStatus()"
                    class="md:w-full w-9"></Button>
                <Button v-if="running" :loading="loading" icon="pi pi-pause" severity="danger"
                    @click="stopServer()"></Button>
                <Button v-if="!running" :loading="loading" icon="pi pi-play" severity="success"
                    @click="startServer()"></Button>
            </div>

            <form @submit.prevent="sendCommand(commandToSend)"
                class="p-fluid flex align-items-center justify-content-center gap-2 mt-5">
                <span class="p-float-label md:w-full w-9">
                    <InputText v-model="commandToSend" id="command" required :disabled="!running || loading" class="" />
                    <label for="command">Konsole</label>
                </span>
                <Button icon="pi pi-send" :disabled="!running || loading" type="submit"></Button>
            </form>

            <div class="md:flex align-items-center justify-content-center pt-2">
                <div v-if="loading" class="text-center mt-3">
                    <i class="pi pi-spin pi-spinner" style="font-size: 2em"></i>
                    <p>Lade historische kommands...</p>
                </div>

                <Accordion class="w-full">
                    <AccordionTab v-for="command in commandHistory" :key="command.command_id" :header="command.command">
                        <p class="m-0">{{"Macher: \"" + command.username + "\" Antwort: " + command.response }}</p>
                    </AccordionTab>
                </Accordion>

            </div>
        </div>
    </div>
    <div class="flex align-items-end justify-content-end">
        <Button label="Was kommt noch?" @click="upcomming()"></Button>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
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
const commandToSend = ref("")
const commandHistory = ref<{ command_id: number, username: string, command: string, response: string }[]>([]);

onMounted(async () => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    getStatus()
    getCommandLog();
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});


const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (loading.value) {
        const message = 'Bist du sicher das du neu laden möchtest? Deine Änderungen werden eventuell nicht gespeichert.';
        event.returnValue = message;
        return message;
    }
};

const getCommandLog = async () => {
    try {
        loading.value = true;
        commandHistory.value = [];
        const response = await minecraftStore.getCommandLog();
        commandHistory.value = response.map((entry: { command_id: number, username:string, command: string; response: string; }) => ({
            command_id: entry.command_id,
            username: entry.username,
            command: entry.command,
            response: removeMinecraftFormatting(entry.response)
        }));
    } catch (error: any) {
        checkError(error);
    } finally {
        loading.value = false;
    }
};

const removeMinecraftFormatting = (text: string) => {
    return text.replace(/§[0-9a-fk-or]/g, '');
};

const upcomming = () => {
    toast.add({ severity: 'info', summary: 'Kommende Features:', detail: "- Weltenverwaltung (Mehrere Welten)\n- Live Logs anzeigen", life: 5000 });
};


const sendCommand = async (command: string) => {
    try {
        loading.value = true;
        const formattedCommand = command.startsWith('/') ? command.replace('/', '') : command;
        const response = await minecraftStore.sendCommand(localStorage.getItem('userAccount'), formattedCommand);
        if (response != "") {
            toast.add({ severity: 'success', summary: 'Befehl ausgeführt! Antwort:', detail: response.output, life: 10000 });
        } else {
            toast.add({ severity: 'info', summary: 'Unbehandelter Fehler:', detail: response, life: 3000 });
        }
    } catch (error: any) {
        checkError(error);
    } finally {
        getCommandLog();
        loading.value = false;
    }
};


const getStatus = async () => {
    try {
        const response = await minecraftStore.getStatus()
        if (response.running == true) {
            toast.add({ severity: 'success', summary: 'Server ist an!', detail: "Der Minecraft Server is an!", life: 3000 });
            running.value = true
            color.value = "success"
            status.value = "Status: Läuft"
        } else {
            toast.add({ severity: 'success', summary: 'Server ist aus!', detail: "Der Minecraft Server ist aus!", life: 3000 });
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
                loading.value = true;
                toast.add({ severity: 'info', summary: 'Wird gestartet!', detail: 'Der Minecraft Server wird nun gestartet', life: 3000 });
                const response = await minecraftStore.startServer();
                if (!response.success) {
                    toast.add({ severity: 'warn', summary: 'Bereits gestartet oder Fehler!', detail: 'Der Minecraft Server ist bereits aktiv oder es ist ein Fehler aufgetreten', life: 3000 });
                }
            } catch (error: any) {
                checkError(error)
            } finally {
                loading.value = false;
                await getStatus();
            }
        }
    );
};

const stopServer = async () => {
    showConfirmationPopup(
        'Willst du den Minecraft-Server wirklich stoppen?',
        async () => {
            try {
                loading.value = true;
                toast.add({ severity: 'info', summary: 'Wird gestoppt!', detail: 'Der Minecraft Server wird nun gestoppt', life: 3000 });
                const response = await minecraftStore.stopServer();
                if (!response.success) {
                    toast.add({ severity: 'warn', summary: 'Bereits gestoppt oder Fehler!', detail: 'Der Minecraft Server ist bereits aus oder es ist ein Fehler aufgetreten', life: 3000 });
                }
            } catch (error: any) {
                checkError(error)
            } finally {
                await getStatus();
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
