<script setup lang="ts">
import { usePockerStore } from '@/stores/PockerStore';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();
const pockerStore = usePockerStore();

const dateJoin = ref<Date>();
const dateLeave = ref<Date>(new Date());
const buyIn = ref();
const payOut = ref();
const location = ref();
const loading = ref(false);
const loadingLocation = ref(false);
const showHistoryConst = ref(false);
const gamemode = ref();
const fun = ref();

onMounted(() => {
    pockerStore.getAll();

    if (navigator.geolocation) {
        loadingLocation.value = true;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=de`);
                    const data = await response.json();

                    // Priorisiere Stadtname, fallback auf display_name
                    location.value =
                        data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.hamlet ||
                        data.address.county ||
                        data.display_name ||
                        `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;

                    toast.add({
                        severity: 'success',
                        summary: 'Standort ermittelt',
                        detail: `Standort automatisch auf "${location.value}" gesetzt.`,
                        life: 3000
                    });
                    loadingLocation.value = false;
                } catch (error) {
                    console.error('Fehler beim Rückwärts-Geocoding:', error);
                    location.value = `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
                    toast.add({
                        severity: 'warn',
                        summary: 'Geocoding fehlgeschlagen',
                        detail: 'Standort wurde als Koordinaten gesetzt.',
                        life: 3000
                    });
                    loadingLocation.value = false;
                }
            },
            (error) => {
                console.error('Geolocation-Fehler:', error);
                toast.add({
                    severity: 'warn',
                    summary: 'Standort nicht verfügbar',
                    detail: 'Bitte Standortfreigabe aktivieren, um den Standort automatisch einzutragen.',
                    life: 4000
                });
                loadingLocation.value = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        console.warn('Geolocation wird von diesem Browser nicht unterstützt.');
        toast.add({
            severity: 'warn',
            summary: 'Nicht unterstützt',
            detail: 'Dein Browser unterstützt keine Standortbestimmung.',
            life: 4000
        });
        loadingLocation.value = false;
    }
});


const addDay = async () => {
    try {
        loading.value = true
        const response = await pockerStore.addDay(
            buyIn.value,
            payOut.value,
            gamemode.value,
            fun.value,
            dateJoin.value,
            dateLeave.value,
            location.value
        );
        if (response.profit > 0) {
            toast.add({
                severity: 'success',
                summary: 'Tag hinzugefügt!',
                detail: `Du hast heute ${formatEuro(response.profit)} in ${formatSeconds(response.timeSpend)} gemacht!`,
                life: 7000
            });
        } else if (response.profit < 0) {
            toast.add({
                severity: 'warn',
                summary: 'Tag hinzugefügt!',
                detail: `Du hast heute ${formatEuro(response.profit)} in ${formatSeconds(response.timeSpend)} verloren.`,
                life: 7000
            });
        } else {
            toast.add({
                severity: 'info',
                summary: 'Tag hinzugefügt!',
                detail: `Du bist heute break-even in ${formatSeconds(response.timeSpend)} rausgegangen.`,
                life: 7000
            });
        }

    } catch (error: any) {
        if (error.response.status == 401) {
            toast.add({ severity: 'error', summary: 'Session ungültig!', detail: 'Die Sitzung ist abgelaufen. Melde dich erneut an.', life: 7000 });
        } else {
            toast.add({ severity: 'error', summary: "Fehler!", detail: error.response.data.message, life: 7000 });
        }
    } finally {
        loading.value = false
    }
};

function formatSeconds(seconds: number | null): string {
    if (seconds == null) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || (!h && !m)) parts.push(`${s}s`);
    return parts.join(' ');
}

function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatEuro(amount: number | null): string {
    if (amount == null) return '-';
    return amount.toFixed(2) + ' €';
}

const showHistory = async () => {
    showHistoryConst.value = true;
}

const latestEntry = computed(() => {
    return pockerStore.entries.length > 0 ? pockerStore.entries[0] : null;
});

const dialogHeader = computed(() => {
    if (!latestEntry.value) return 'Poker History';

    return `Gamble history | 🪙 ${formatEuro(latestEntry.value.allTimeProfit)} Profit | ⏱️ ${formatSeconds(latestEntry.value.allTimeTimeSpend)} Time spend`;
});
</script>

<template>
    <Dialog v-model:visible="showHistoryConst" modal :header="dialogHeader" class="w-11">
        <DataTable :value="pockerStore.entries" stripedRows scrollable scrollHeight="60vh" resizableColumns
            columnResizeMode="fit">

            <Column sortable field="dateJoin" header="Datum">
                <template #body="{ data }">
                    {{ formatDate(data.dateJoin) || '-' }}
                </template>
            </Column>

            <Column sortable field="buyIn" header="Buy-In">
                <template #body="{ data }">
                    {{ formatEuro(data.buyIn) }}
                </template>
            </Column>

            <Column sortable field="payOut" header="Pay-Out">
                <template #body="{ data }">
                    {{ formatEuro(data.payOut) }}
                </template>
            </Column>

            <Column sortable field="profit" header="Profit">
                <template #body="{ data }">
                    {{ formatEuro(data.profit) }}
                </template>
            </Column>

            <Column sortable field="timeSpend" header="Spielzeit">
                <template #body="{ data }">
                    {{ formatSeconds(data.timeSpend) || '-' }}
                </template>
            </Column>


            <Column sortable field="location" header="Location">
                <template #body="{ data }">
                    {{ data.location || '-' }}
                </template>
            </Column>

            <Column sortable field="gamemode" header="Gamemode">
                <template #body="{ data }">
                    {{ data.gamemode }}
                </template>
            </Column>

            <Column sortable field="fun" header="Fun">
                <template #body="{ data }">
                    <Rating v-model="data.fun" readonly :cancel="false" />
                </template>
            </Column>
        </DataTable>
    </Dialog>


    <div class="flex align-items-center justify-content-center" style="height: 84vh">
        <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-6">
            <div class="flex align-items-center justify-content-center gap-5 text-center">
                <h1>Gamble history</h1>
                <Rating v-model="fun" />
            </div>

            <form @submit.prevent="addDay">
                <div class="md:flex align-items-center justify-content-center gap-2">
                    <span class="p-float-label w-full mb-4">
                        <InputText v-model="buyIn" id="buyIn" class="w-full"></InputText>
                        <label for="buyIn">Buy In</label>
                    </span>
                    <span class="p-float-label w-full mb-4">
                        <InputText v-model="payOut" id="payOut" class="w-full"></InputText>
                        <label for="payOut">Pay Out</label>
                    </span>
                    <span class="p-float-label md:w-3 mb-4">
                        <InputText v-model="location" id="location" class="w-full" :disabled="loadingLocation" ></InputText>
                        <label for="location">Location</label>
                    </span>
                    <span class="p-float-label md:w-3 mb-4">
                        <InputText v-model="gamemode" id="gamemode" class="w-full"></InputText>
                        <label for="gamemode">Game</label>
                    </span>
                </div>

                <div class="md:flex align-items-center justify-content-center gap-2">
                    <span class="p-float-label w-full mb-4">
                        <Calendar id="dateJoin" v-model="dateJoin" showTime hourFormat="24" touchUI class="w-full" />
                        <label for="dateJoin">Join</label>
                    </span>
                    <span class="p-float-label w-full mb-4">
                        <Calendar id="dateLeave" v-model="dateLeave" showTime hourFormat="24" touchUI class="w-full" />
                        <label for="dateLeave">Leave</label>
                    </span>
                </div>

                <div class="flex align-items-center justify-content-center mb-3">
                    <Button type="submit" :disabled="!buyIn || !payOut || !location || !gamemode || !fun"
                        label="Add Day" icon="pi pi-money-bill" class="md:w-11 mr-2" :loading="loading"></Button>

                    <Button @click="showHistory" label="History" icon="pi pi-clock" class=""></Button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.card {
    background-color: var(--surface-b);
}
</style>

//add fun scaling
//add gamemode selector with icons only
//make dateJoin and dateLeave more acurate