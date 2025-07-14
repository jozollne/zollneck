<script setup lang="ts">
import { usePokerStore } from '@/stores/PokerStore';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { useAuthStore } from '@/stores/AuthStore';
import type { PokerEntry } from '../Objects/PokerObject';

const toast = useToast();
const pokerStore = usePokerStore();
const authStore = useAuthStore();

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
const filters = ref();
filters.value = {
    global: { value: '', matchMode: FilterMatchMode.CONTAINS }
};

onMounted(() => {
    pokerStore.getAll();

    if (!authStore.userRoles.includes('poker')) {
        showHistory();
        toast.add({ severity: 'error', summary: "Fehler!", detail: "Du hast keine Rechte um Einträge zu erstellen ;(", life: 30000 });
        return;
    }

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

const filteredEntries = computed(() => {
    if (!filters.value) return pokerStore.entries;

    return pokerStore.entries.filter(entry => {
        const f = filters.value;

        if (f.global?.value) {
            const search = f.global.value.toLowerCase();
            if (
                !(entry.location?.toLowerCase().includes(search) ||
                    entry.gamemode?.toLowerCase().includes(search) ||
                    String(entry.profit).includes(search) ||
                    String(entry.fun).includes(search) ||
                    String(entry.buyIn).includes(search) ||
                    String(entry.payOut).includes(search) ||
                    (entry.dateJoin && formatDate(entry.dateJoin).includes(search)))
            ) {
                return false;
            }
        }

        if (f.location?.constraints?.[0]?.value) {
            const val = f.location.constraints[0].value.toLowerCase();
            if (!entry.location?.toLowerCase().startsWith(val)) return false;
        }

        if (f.gamemode?.constraints?.[0]?.value) {
            const val = f.gamemode.constraints[0].value.toLowerCase();
            if (!entry.gamemode?.toLowerCase().startsWith(val)) return false;
        }

        if (f.profit?.constraints?.[0]?.value != null) {
            if (entry.profit !== f.profit.constraints[0].value) return false;
        }

        if (f.fun?.constraints?.[0]?.value != null) {
            if (entry.fun !== f.fun.constraints[0].value) return false;
        }

        if (f.buyIn?.constraints?.[0]?.value != null) {
            if (entry.buyIn !== f.buyIn.constraints[0].value) return false;
        }

        if (f.payOut?.constraints?.[0]?.value != null) {
            if (entry.payOut !== f.payOut.constraints[0].value) return false;
        }

        if (f.dateJoin?.constraints?.[0]?.value != null) {
            const filterDate = new Date(f.dateJoin.constraints[0].value).toDateString();
            if (!entry.dateJoin) return false;
            const entryDate = new Date(entry.dateJoin).toDateString();
            if (entryDate !== filterDate) return false;
        }

        return true;
    });
});

const totalFilteredProfit = computed(() => {
    return filteredEntries.value.reduce((acc: number, entry: PokerEntry) => acc + (entry.profit ?? 0), 0);
});

const totalFilteredTimeSpend = computed(() => {
    return filteredEntries.value.reduce((acc, entry: PokerEntry) => acc + (entry.timeSpend ?? 0), 0);
});

const clearFilter = () => {
    filters.value.global.value = '';
};



const addDay = async () => {
    try {
        loading.value = true
        const response = await pokerStore.addDay(
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
                severity: 'error',
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
        } else if (error.response.status == 403) {
            toast.add({ severity: 'error', summary: "Fehler!", detail: "Du hast keine Rechte um Einträge zu erstellen ;(", life: 7000 });
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
</script>

<template>
    <Dialog v-model:visible="showHistoryConst" modal class="w-11">
        <template #header>
            <div class="hidden md:flex flex-wrap gap-3 align-items-center justify-content-between w-full">
                <Button type="button" icon="pi pi-filter-slash" label="Clear" outlined @click="clearFilter" />
                <div class="flex flex-col text-sm xl:text-3xl font-bold">
                    <div class="text-green-500" v-if="totalFilteredProfit > 0">
                        🪙 {{ formatEuro(totalFilteredProfit) }} Profit 🪙
                    </div>
                    <div class="text-red-500" v-if="totalFilteredProfit < 0">
                        🪙 {{ formatEuro(totalFilteredProfit) }} Profit 🪙
                    </div>
                    ---⏱️ {{ formatSeconds(totalFilteredTimeSpend) }} Time spend ⏱️
                </div>
                <InputText v-model="filters.global.value" placeholder="Filter" class="w-3 lg:w-1"/>
            </div>
        </template>


        <DataTable :value="filteredEntries" stripedRows scrollable scrollHeight="60vh" resizableColumns
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
                    <div class="text-green-500" v-if="data.profit > 0">
                        {{ formatEuro(data.profit) }}
                    </div>
                    <div class="text-red-500" v-if="data.profit < 0">
                        {{ formatEuro(data.profit) }}
                    </div>
                    <div class="text-yellow-500" v-if="data.profit == 0">
                        {{ formatEuro(data.profit) }}
                    </div>
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
                        <InputText v-model="location" id="location" class="w-full">
                        </InputText>
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
