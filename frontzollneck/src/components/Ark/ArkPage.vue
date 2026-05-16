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
        <div class="card p-3 md:p-4 shadow-4 border-round col-12">
            <div class="text-center md:text-lg text-base mb-4">
                <h1 class="text-lg md:text-2xl m-0">Verwaltungsseite vom ARK-Server zollneck.de</h1>
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
                    <InputText v-model="commandToSend" id="command" required :disabled="!running || loading"
                        autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" class="" />
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
                    <AccordionTab v-for="command in commandHistory" :key="command.command_id" :header="command.command + '  –  ' + formatDate(command.created_at)">
                        <p class="m-0">{{ "Macher: \"" + command.username + "\" Antwort: " + command.response }}</p>
                    </AccordionTab>
                </Accordion>

            </div>

            <div class="flex flex-wrap align-items-stretch justify-content-center gap-2 mt-4">
                <Button label="Einfache Einstellungen" icon="pi pi-sliders-h"
                    @click="openSimpleEditor()" class="ark-action-btn"></Button>
                <Button label="Game.ini bearbeiten" icon="pi pi-file-edit" severity="secondary"
                    @click="openConfigEditor('game')" class="ark-action-btn"></Button>
                <Button label="GameUserSettings.ini bearbeiten" icon="pi pi-file-edit" severity="secondary"
                    @click="openConfigEditor('gameusersettings')" class="ark-action-btn"></Button>
                <Button label="Änderungs-Verlauf" icon="pi pi-history" severity="help"
                    @click="openAuditLog()" class="ark-action-btn"></Button>
                <Button label="Admin-Cheats" icon="pi pi-shield" severity="warning"
                    @click="openAdminLog()" class="ark-action-btn"></Button>
            </div>
        </div>
    </div>
    <div class="flex align-items-end justify-content-end">
        <Button label="Was kommt noch?" @click="upcomming()"></Button>
    </div>

    <Dialog v-model:visible="configDialogVisible" modal :header="configDialogHeader" class="w-11 md:w-10 lg:w-9"
        :style="{ maxWidth: '1200px' }" :closable="!configSaving">
        <div v-if="configLoading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner" style="font-size: 2em"></i>
            <p>Lade Datei...</p>
        </div>
        <div v-else class="flex flex-column gap-3">
            <textarea v-model="configContent" :disabled="configSaving" wrap="off" spellcheck="false"
                autocapitalize="off" autocomplete="off" autocorrect="off" class="ini-editor"></textarea>
            <small class="text-color-secondary">
                Hinweis: Änderungen werden erst nach einem Server-Neustart wirksam.
            </small>
        </div>
        <template #footer>
            <Button label="Abbrechen" icon="pi pi-times" severity="secondary" :disabled="configSaving"
                @click="configDialogVisible = false"></Button>
            <Button label="Speichern" icon="pi pi-save" :loading="configSaving"
                :disabled="configLoading || configSaving" @click="saveConfig()"></Button>
        </template>
    </Dialog>

    <Dialog v-model:visible="simpleDialogVisible" modal header="Einfache Server-Einstellungen"
        class="w-11 md:w-10 lg:w-8" :style="{ maxWidth: '900px' }" :closable="!configSaving">
        <div v-if="simpleLoading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner" style="font-size: 2em"></i>
            <p>Lade Einstellungen...</p>
        </div>
        <div v-else class="flex flex-column gap-4">
            <div v-for="g in groupedSchema" :key="g.cat" class="simple-group">
                <h3 class="simple-group-title">
                    <i :class="categoryIcon(g.cat)"></i>
                    <span>{{ g.cat }}</span>
                    <span class="simple-group-count">{{ g.items.length }}</span>
                </h3>
                <div class="flex flex-column gap-3">
                    <div v-for="s in g.items" :key="s.key" class="simple-row">
                        <div class="flex justify-content-between align-items-center mb-1">
                            <label class="font-medium">{{ s.label }}</label>
                            <InputSwitch v-if="s.type === 'bool'" v-model="simpleValues[s.key]"
                                :disabled="configSaving" />
                        </div>
                        <div v-if="s.type === 'slider'" class="flex flex-column sm:flex-row align-items-stretch sm:align-items-center gap-2 sm:gap-3">
                            <Slider class="flex-grow-1" v-model="simpleValues[s.key]" :min="s.min" :max="s.max"
                                :step="s.step" :disabled="configSaving" />
                            <input type="number" class="simple-num" v-model.number="simpleValues[s.key]" :min="s.min"
                                :max="s.max" :step="s.step" :disabled="configSaving" inputmode="decimal" />
                        </div>
                    </div>
                </div>
            </div>
            <small class="text-color-secondary">
                Hinweis: Änderungen werden erst nach einem Server-Neustart wirksam.
            </small>
        </div>
        <template #footer>
            <Button label="Abbrechen" icon="pi pi-times" severity="secondary" :disabled="configSaving"
                @click="simpleDialogVisible = false"></Button>
            <Button label="Speichern" icon="pi pi-save" :loading="configSaving"
                :disabled="simpleLoading || configSaving" @click="saveSimpleSettings()"></Button>
        </template>
    </Dialog>

    <Dialog v-model:visible="auditDialogVisible" modal header="Änderungs-Verlauf" class="w-11 md:w-10 lg:w-9"
        :style="{ maxWidth: '1100px' }">
        <div v-if="auditLoading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner" style="font-size: 2em"></i>
            <p>Lade Verlauf...</p>
        </div>
        <div v-else-if="auditEntries.length === 0" class="text-center p-4 text-color-secondary">
            Noch keine Einträge.
        </div>
        <div v-else class="flex flex-column gap-2">
            <div v-for="e in auditEntries" :key="e.audit_id" class="audit-entry">
                <div class="flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                    <div class="flex align-items-center gap-2">
                        <span class="audit-badge" :class="'audit-' + e.action">{{ auditLabel(e.action) }}</span>
                        <strong>{{ e.username }}</strong>
                        <span v-if="e.target" class="text-color-secondary">– {{ e.target }}</span>
                    </div>
                    <small class="text-color-secondary">{{ formatDate(e.created_at) }}</small>
                </div>
                <pre v-if="e.details" class="audit-details">{{ e.details }}</pre>
            </div>
        </div>
        <template #footer>
            <Button label="Aktualisieren" icon="pi pi-refresh" severity="secondary" :loading="auditLoading"
                @click="loadAuditLog()"></Button>
            <Button label="Schließen" icon="pi pi-times" @click="auditDialogVisible = false"></Button>
        </template>
    </Dialog>

    <Dialog v-model:visible="adminDialogVisible" modal header="Admin-Cheats (Ingame Console)" class="w-11 md:w-10 lg:w-9"
        :style="{ maxWidth: '1100px' }">
        <div v-if="adminLoading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner" style="font-size: 2em"></i>
            <p>Lade Admin-Cheats...</p>
        </div>
        <div v-else-if="adminEntries.length === 0" class="text-center p-4 text-color-secondary">
            Noch keine Admin-Cheats erfasst. (Hinweis: Es werden nur Einträge ab Aktivierung erfasst.
            Cheats werden alle ~30 s über RCON <code>GetGameLog</code> abgefragt und in der Datenbank gespeichert.)
        </div>
        <div v-else class="flex flex-column gap-2">
            <div v-for="e in adminEntries" :key="e.admin_id" class="audit-entry">
                <div class="flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                    <div class="flex align-items-center gap-2">
                        <span class="audit-badge audit-rcon">CHEAT</span>
                        <strong>{{ e.player_name || 'Unbekannt' }}</strong>
                        <span v-if="e.player_id" class="text-color-secondary">({{ e.player_id }})</span>
                    </div>
                    <small class="text-color-secondary">{{ formatDate(e.created_at) }}</small>
                </div>
                <pre class="audit-details">{{ e.command }}</pre>
            </div>
        </div>
        <template #footer>
            <Button label="Aktualisieren" icon="pi pi-refresh" severity="secondary" :loading="adminLoading"
                @click="loadAdminLog()"></Button>
            <Button label="Schließen" icon="pi pi-times" @click="adminDialogVisible = false"></Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useArkStore } from '@/stores/ArkStore';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";
import { HttpStatusCode } from 'axios';


const confirm = useConfirm();
const arkStore = useArkStore();
const toast = useToast();
const running = ref();
const loading = ref();
const color = ref("warning")
const status = ref("Status: Unbekannt")
const commandToSend = ref("")
const commandHistory = ref<{ command_id: number, username: string, command: string, response: string, created_at: string }[]>([]);;

const configDialogVisible = ref(false);
const configLoading = ref(false);
const configSaving = ref(false);
const configContent = ref('');
const configFile = ref<'game' | 'gameusersettings'>('game');
const configDialogHeader = ref('');

// --- Einfache Einstellungen ---
type SimpleSetting = {
    key: string;
    file: 'game' | 'gameusersettings';
    section: string;
    label: string;
    category: string;
    type: 'slider' | 'bool';
    min?: number;
    max?: number;
    step?: number;
};

const GUS_SECTION = 'ServerSettings';
const GAME_SECTION = '/Script/ShooterGame.ShooterGameMode';

// Schema basiert auf den tatsächlich in den aktuellen INIs vorhandenen Keys.
const allSimpleSettings: SimpleSetting[] = [
    // Allgemein
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DifficultyOffset', label: 'Schwierigkeit', category: 'Allgemein', type: 'slider', min: 0, max: 1, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OverrideOfficialDifficulty', label: 'Max. Wildlevel-Stufe', category: 'Allgemein', type: 'slider', min: 1, max: 10, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NightTimeSpeedScale', label: 'Nacht-Geschwindigkeit', category: 'Allgemein', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoCountMultiplier', label: 'Dino-Anzahl', category: 'Allgemein', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'MaxTamedDinos', label: 'Max. gez. Dinos', category: 'Allgemein', type: 'slider', min: 100, max: 10000, step: 100 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ResourcesRespawnPeriodMultiplier', label: 'Ressourcen-Respawn-Zeit', category: 'Allgemein', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructurePreventResourceRadiusMultiplier', label: 'Ressourcen-Blockradius', category: 'Allgemein', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'KickIdlePlayersPeriod', label: 'AFK-Kick (Sekunden)', category: 'Allgemein', type: 'slider', min: 60, max: 7200, step: 60 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AutoSavePeriodMinutes', label: 'Auto-Save-Intervall (Min)', category: 'Allgemein', type: 'slider', min: 1, max: 60, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TribeNameChangeCooldown', label: 'Tribe-Umbenennen Cooldown (Min)', category: 'Allgemein', type: 'slider', min: 0, max: 60, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TheMaxStructuresInRange', label: 'Max. Strukturen in Reichweite', category: 'Allgemein', type: 'slider', min: 1000, max: 25000, step: 500 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PerPlatformMaxStructuresMultiplier', label: 'Plattform-Strukturen Mult.', category: 'Allgemein', type: 'slider', min: 0.5, max: 20, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlatformSaddleBuildAreaBoundsMultiplier', label: 'Plattform-Bau-Radius', category: 'Allgemein', type: 'slider', min: 0.5, max: 10, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructurePickupTimeAfterPlacement', label: 'Pickup-Zeitfenster (Sek.)', category: 'Allgemein', type: 'slider', min: 0, max: 600, step: 5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructurePickupHoldDuration', label: 'Pickup-Halte-Dauer (Sek.)', category: 'Allgemein', type: 'slider', min: 0, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ItemStackSizeMultiplier', label: 'Item-Stack-Größe', category: 'Allgemein', type: 'slider', min: 0.1, max: 100, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OxygenSwimSpeedStatMultiplier', label: 'Oxygen-Schwimmtempo-Mult.', category: 'Allgemein', type: 'slider', min: 1, max: 50, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'GreaterRiftActivationMultiplier', label: 'Greater Rift Aktivierung', category: 'Allgemein', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventOfflinePvPInterval', label: 'Offline-PvP-Schutz Intervall (Sek.)', category: 'Allgemein', type: 'slider', min: 0, max: 3600, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructureDamageRepairCooldown', label: 'Reparatur-Cooldown', category: 'Allgemein', type: 'slider', min: 0, max: 600, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'RCONServerGameLogBuffer', label: 'RCON Game-Log-Buffer', category: 'Allgemein', type: 'slider', min: 0, max: 5000, step: 50 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvEStructureDecayPeriodMultiplier', label: 'PvE Bauwerk-Verfall (Periode)', category: 'Allgemein', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvEDinoDecayPeriodMultiplier', label: 'PvE Dino-Verfall (Periode)', category: 'Allgemein', type: 'slider', min: 0.1, max: 20, step: 0.1 },

    // Raten (XP, Taming, Ernte)
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TamingSpeedMultiplier', label: 'Taming-Geschwindigkeit', category: 'Raten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'HarvestAmountMultiplier', label: 'Ernte-Menge', category: 'Raten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'CropGrowthSpeedMultiplier', label: 'Pflanzenwachstum', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'CropDecaySpeedMultiplier', label: 'Pflanzenverfall', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'DinoHarvestingDamageMultiplier', label: 'Dino-Ernte-Schaden', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PlayerHarvestingDamageMultiplier', label: 'Spieler-Ernte-Schaden', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'ResourceNoReplenishRadiusPlayers', label: 'Kein-Respawn-Radius (Spieler)', category: 'Raten', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'ResourceNoReplenishRadiusStructures', label: 'Kein-Respawn-Radius (Bauten)', category: 'Raten', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'SupplyCrateLootQualityMultiplier', label: 'Loot-Kisten-Qualität', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'FishingLootQualityMultiplier', label: 'Angel-Loot-Qualität', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'GlobalCorpseDecompositionTimeMultiplier', label: 'Leichen-Zerfall-Zeit', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'FuelConsumptionIntervalMultiplier', label: 'Treibstoff-Verbrauch', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'PvPZoneStructureDamageMultiplier', label: 'PvP-Zone Bauwerk-Schaden', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },

    // XP detailliert (Game.ini)
    { file: 'game', section: GAME_SECTION, key: 'KillXPMultiplier', label: 'Kill-XP', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'HarvestXPMultiplier', label: 'Ernte-XP', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'CraftXPMultiplier', label: 'Crafting-XP', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'GenericXPMultiplier', label: 'Generisches XP', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'SpecialXPMultiplier', label: 'Spezial-XP', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Schaden & Resistenz
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TamedDinoDamageMultiplier', label: 'Gez. Dinos: Schaden', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TamedDinoResistanceMultiplier', label: 'Gez. Dinos: Resistenz', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 20, step: 0.1 },

    // Verbrauch (Dinos)
    { file: 'gameusersettings', section: GUS_SECTION, key: 'RaidDinoCharacterFoodDrainMultiplier', label: 'Raid-Dinos: Hunger', category: 'Verbrauch (Dinos)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PoopIntervalMultiplier', label: 'Dino-Kot-Intervall', category: 'Verbrauch (Dinos)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'LayEggIntervalMultiplier', label: 'Ei-Lege-Intervall', category: 'Verbrauch (Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },

    // Zucht
    { file: 'game', section: GAME_SECTION, key: 'MatingIntervalMultiplier', label: 'Paarungs-Intervall', category: 'Zucht', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'MatingSpeedMultiplier', label: 'Paarungs-Geschwindigkeit', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'EggHatchSpeedMultiplier', label: 'Ei-Brutzeit', category: 'Zucht', type: 'slider', min: 0.1, max: 50, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyMatureSpeedMultiplier', label: 'Baby-Reifung', category: 'Zucht', type: 'slider', min: 0.1, max: 50, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyFoodConsumptionSpeedMultiplier', label: 'Baby-Hunger', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleIntervalMultiplier', label: 'Baby-Kuschel-Intervall', category: 'Zucht', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleGracePeriodMultiplier', label: 'Kuschel-Gnadenzeit', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleLoseImprintQualitySpeedMultiplier', label: 'Imprint-Verlust', category: 'Zucht', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'BabyImprintingStatScaleMultiplier', label: 'Imprint-Bonus', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Server-Optionen (Bools) — GameUserSettings.ini
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerPVE', label: 'PvE-Modus', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerHardcore', label: 'Hardcore-Modus', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventOfflinePvP', label: 'Offline-PvP-Schutz', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'EnablePvPGamma', label: 'PvP-Gamma erlauben', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AdminLogging', label: 'Admin-Logging', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'GlobalVoiceChat', label: 'Globaler Voice-Chat', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ProximityChat', label: 'Proximity-Chat', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowThirdPersonPlayer', label: 'Third Person erlauben', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerCrosshair', label: 'Fadenkreuz anzeigen', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ShowMapPlayerLocation', label: 'Position auf Karte', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ShowFloatingDamageText', label: 'Schadenstext anzeigen', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowHitMarkers', label: 'Trefferanzeige', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowFlyerCarryPVE', label: 'Flyer dürfen tragen (PvE)', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowCaveBuildingPvE', label: 'Höhlenbau erlauben (PvE)', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ForceAllowCaveFlyers', label: 'Flyer in Höhlen erlauben', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableStructureDecayPVE', label: 'Bauwerksverfall deaktivieren (PvE)', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableDinoDecayPvE', label: 'Dino-Verfall deaktivieren (PvE)', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvPDinoDecay', label: 'Dino-Verfall (PvP)', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OverrideStructurePlatformPrevention', label: 'Plattform-Bau-Sperre überschreiben', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowRaidDinoFeeding', label: 'Raid-Dinos füttern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventTribeAlliances', label: 'Tribe-Allianzen verhindern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadSurvivors', label: 'Survivor-Download verhindern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadItems', label: 'Item-Download verhindern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadDinos', label: 'Dino-Download verhindern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NoTributeDownloads', label: 'Tribute-Downloads aus', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowAnyoneBabyImprintCuddle', label: 'Jeder darf Imprint kuscheln', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableImprintDinoBuff', label: 'Imprint-Buff deaktivieren', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDiseases', label: 'Krankheiten verhindern', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NonPermanentDiseases', label: 'Krankheiten nicht permanent', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'EnableExtraStructurePreventionVolumes', label: 'Extra Bau-Sperrzonen', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowIntegratedSPlusStructures', label: 'S+ Strukturen erlauben', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowHideDamageSourceFromLogs', label: 'Schadensquelle aus Logs verbergen', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ShowAnniversaryContent', label: 'Jubiläums-Content', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AlwaysNotifyPlayerLeft', label: 'Spieler-Verlassen melden', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DontAlwaysNotifyPlayerJoined', label: 'Spieler-Beitritt nicht melden', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OnlyAllowSpecifiedEngrams', label: 'Nur erlaubte Engrams', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'bAllowFlyerSpeedLeveling', label: 'Flyer Speed leveln', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'bUseSingleplayerSettings', label: 'Singleplayer-Einstellungen', category: 'Server-Optionen', type: 'bool' },

    // Server-Optionen (Bools) — Game.ini
    { file: 'game', section: GAME_SECTION, key: 'bDisableFriendlyFire', label: 'Friendly Fire deaktivieren', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bUseCorpseLocator', label: 'Leichen-Anzeige', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bDisableStructurePlacementCollision', label: 'Bau-Kollision deaktivieren', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bAllowPlatformSaddleMultiFloors', label: 'Plattform-Sattel: mehrere Etagen', category: 'Server-Optionen', type: 'bool' },
];

const SIMPLE_CATEGORIES = [
    'Allgemein',
    'Raten',
    'XP-Boni',
    'Schaden & Resistenz',
    'Verbrauch (Dinos)',
    'Zucht',
    'Server-Optionen',
];

const groupedSchema = SIMPLE_CATEGORIES
    .map(cat => ({ cat, items: allSimpleSettings.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0);

const categoryIcon = (cat: string): string => {
    switch (cat) {
        case 'Allgemein': return 'pi pi-cog';
        case 'Raten': return 'pi pi-percentage';
        case 'XP-Boni': return 'pi pi-star';
        case 'Schaden & Resistenz': return 'pi pi-shield';
        case 'Verbrauch (Spieler)': return 'pi pi-user';
        case 'Verbrauch (Dinos)': return 'pi pi-heart';
        case 'Zucht': return 'pi pi-heart-fill';
        case 'Server-Optionen': return 'pi pi-sliders-v';
        default: return 'pi pi-circle';
    }
};

const simpleDialogVisible = ref(false);
const simpleLoading = ref(false);
const simpleValues = ref<Record<string, any>>({});
const rawTexts = ref<{ game: string; gameusersettings: string }>({ game: '', gameusersettings: '' });

const formatNum = (n: any): string => {
    if (typeof n !== 'number' || isNaN(n)) return '-';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

const readIniValue = (text: string, section: string, key: string): string | null => {
    const sectionRe = new RegExp(`\\[${escapeRegex(section)}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i');
    const m = text.match(sectionRe);
    if (!m) return null;
    const keyRe = new RegExp(`^\\s*${escapeRegex(key)}\\s*=\\s*(.+?)\\s*$`, 'mi');
    const km = m[1].match(keyRe);
    return km ? km[1].trim() : null;
};

const setIniValue = (text: string, section: string, key: string, value: string): string => {
    const sectionRe = new RegExp(`(\\[${escapeRegex(section)}\\])([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i');
    const m = text.match(sectionRe);
    if (!m) {
        const sep = text.endsWith('\n') ? '' : '\n';
        return text + sep + `\n[${section}]\n${key}=${value}\n`;
    }
    const header = m[1];
    const body = m[2];
    const keyRe = new RegExp(`^(\\s*)${escapeRegex(key)}\\s*=.*$`, 'mi');
    let newBody: string;
    if (keyRe.test(body)) {
        newBody = body.replace(keyRe, `$1${key}=${value}`);
    } else {
        newBody = body.replace(/\s*$/, '') + `\n${key}=${value}\n`;
    }
    return text.replace(m[0], header + newBody);
};

const openSimpleEditor = async () => {
    simpleDialogVisible.value = true;
    simpleLoading.value = true;
    simpleValues.value = {};
    try {
        const [g, gu] = await Promise.all([
            arkStore.readConfig('game'),
            arkStore.readConfig('gameusersettings'),
        ]);
        rawTexts.value = { game: g.content, gameusersettings: gu.content };
        const values: Record<string, any> = {};
        for (const s of allSimpleSettings) {
            const raw = readIniValue(rawTexts.value[s.file], s.section, s.key);
            if (s.type === 'bool') {
                values[s.key] = raw ? /true/i.test(raw) : false;
            } else {
                const n = raw !== null ? parseFloat(raw) : (s.min ?? 1);
                values[s.key] = isNaN(n) ? (s.min ?? 1) : n;
            }
        }
        simpleValues.value = values;
    } catch (error: any) {
        checkError(error);
        simpleDialogVisible.value = false;
    } finally {
        simpleLoading.value = false;
    }
};

const saveSimpleSettings = async () => {
    try {
        configSaving.value = true;
        let gameText = rawTexts.value.game;
        let gusText = rawTexts.value.gameusersettings;
        for (const s of allSimpleSettings) {
            const v = simpleValues.value[s.key];
            let str: string;
            if (s.type === 'bool') {
                str = v ? 'True' : 'False';
            } else {
                const num = typeof v === 'number' ? v : parseFloat(v);
                str = Number.isInteger(num) ? num.toFixed(6) : num.toFixed(6);
            }
            if (s.file === 'game') gameText = setIniValue(gameText, s.section, s.key, str);
            else gusText = setIniValue(gusText, s.section, s.key, str);
        }
        await Promise.all([
            arkStore.writeConfig('game', gameText),
            arkStore.writeConfig('gameusersettings', gusText),
        ]);
        toast.add({ severity: 'success', summary: 'Gespeichert!', detail: 'Server-Einstellungen wurden aktualisiert.', life: 4000 });
        simpleDialogVisible.value = false;
    } catch (error: any) {
        checkError(error);
    } finally {
        configSaving.value = false;
    }
};

// --- Audit-Log ---
type AuditEntry = {
    audit_id: number;
    username: string;
    action: string;
    target: string | null;
    details: string | null;
    created_at: string;
};
const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const auditEntries = ref<AuditEntry[]>([]);

const auditLabel = (action: string): string => {
    switch (action) {
        case 'start': return 'Start';
        case 'stop': return 'Stop';
        case 'rcon': return 'RCON';
        case 'config_write': return 'Config';
        default: return action;
    }
};

const loadAuditLog = async () => {
    auditLoading.value = true;
    try {
        const data = await arkStore.getAuditLog();
        auditEntries.value = data || [];
    } catch (error: any) {
        checkError(error);
    } finally {
        auditLoading.value = false;
    }
};

const openAuditLog = () => {
    auditDialogVisible.value = true;
    loadAuditLog();
};

// --- Admin-Cheat-Log (in-game console commands) ---
type AdminEntry = {
    admin_id: number;
    player_name: string | null;
    player_id: string | null;
    command: string;
    raw_line: string;
    created_at: string;
};
const adminDialogVisible = ref(false);
const adminLoading = ref(false);
const adminEntries = ref<AdminEntry[]>([]);

const loadAdminLog = async () => {
    adminLoading.value = true;
    try {
        const data = await arkStore.getAdminLog();
        adminEntries.value = data || [];
    } catch (error: any) {
        checkError(error);
    } finally {
        adminLoading.value = false;
    }
};

const openAdminLog = () => {
    adminDialogVisible.value = true;
    loadAdminLog();
};

const openConfigEditor = async (file: 'game' | 'gameusersettings') => {
    configFile.value = file;
    configDialogHeader.value = file === 'game' ? 'Game.ini bearbeiten' : 'GameUserSettings.ini bearbeiten';
    configDialogVisible.value = true;
    configLoading.value = true;
    configContent.value = '';
    try {
        const response = await arkStore.readConfig(file);
        configContent.value = response.content;
    } catch (error: any) {
        checkError(error);
        configDialogVisible.value = false;
    } finally {
        configLoading.value = false;
    }
};

const saveConfig = async () => {
    try {
        configSaving.value = true;
        await arkStore.writeConfig(configFile.value, configContent.value);
        toast.add({ severity: 'success', summary: 'Gespeichert!', detail: configDialogHeader.value + ' wurde gespeichert.', life: 4000 });
        configDialogVisible.value = false;
    } catch (error: any) {
        checkError(error);
    } finally {
        configSaving.value = false;
    }
};

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
        const response = await arkStore.getCommandLog();
        commandHistory.value = response.map((entry: { command_id: number, username: string, command: string; response: string; created_at: string }) => ({
            command_id: entry.command_id,
            username: entry.username,
            command: entry.command,
            response: entry.response,
            created_at: entry.created_at
        }));
    } catch (error: any) {
        checkError(error);
    } finally {
        loading.value = false;
    }
};

const upcomming = () => {
    toast.add({ severity: 'info', summary: 'Kommende Features:', detail: "- Mod-Verwaltung\n- Live Logs anzeigen\n- Backup-Verwaltung", life: 5000 });
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // TypeORM gibt kein Z zurück → Browser würde als Lokalzeit parsen → UTC erzwingen
    const utcStr = (dateStr.endsWith('Z') || dateStr.match(/[+-]\d{2}:?\d{2}$/)) ? dateStr : dateStr + 'Z';
    const d = new Date(utcStr);
    return d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
};


const sendCommand = async (command: string) => {
    try {
        loading.value = true;
        const trimmedCommand = command.trim();
        const response = await arkStore.sendCommand(localStorage.getItem('username'), trimmedCommand);
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
        const response = await arkStore.getStatus()
        if (response.running == true) {
            toast.add({ severity: 'success', summary: 'Server ist an!', detail: "Der ARK Server ist an!", life: 3000 });
            running.value = true
            color.value = "success"
            status.value = "Status: Läuft"
        } else {
            toast.add({ severity: 'success', summary: 'Server ist aus!', detail: "Der ARK Server ist aus!", life: 3000 });
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
        'Willst du den ARK-Server wirklich starten?',
        async () => {
            try {
                loading.value = true;
                toast.add({ severity: 'info', summary: 'Wird gestartet!', detail: 'Der ARK Server wird nun gestartet', life: 3000 });
                const response = await arkStore.startServer();
                if (!response.success) {
                    toast.add({ severity: 'warn', summary: 'Bereits gestartet oder Fehler!', detail: 'Der ARK Server ist bereits aktiv oder es ist ein Fehler aufgetreten', life: 3000 });
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
        'Willst du den ARK-Server wirklich stoppen?',
        async () => {
            try {
                loading.value = true;
                toast.add({ severity: 'info', summary: 'Wird gestoppt!', detail: 'Der ARK Server wird nun gestoppt', life: 3000 });
                const response = await arkStore.stopServer();
                if (!response.success) {
                    toast.add({ severity: 'warn', summary: 'Bereits gestoppt oder Fehler!', detail: 'Der ARK Server ist bereits aus oder es ist ein Fehler aufgetreten', life: 3000 });
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

.ark-action-btn {
    flex: 1 1 100%;
}

@media (min-width: 768px) {
    .ark-action-btn {
        flex: 0 0 auto;
    }
}

.ini-editor {
    width: 100%;
    height: 60vh;
    min-height: 300px;
    padding: 12px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #e0e0e0;
    background-color: #1e1e1e;
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    resize: vertical;
    white-space: pre;
    overflow: auto;
    tab-size: 4;
    outline: none;
}

.ini-editor:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}

.ini-editor:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.simple-num {
    width: 90px;
    padding: 6px 8px;
    font-family: inherit;
    font-size: 0.9rem;
    color: #e0e0e0;
    background-color: #1e1e1e;
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    text-align: right;
    outline: none;
    flex-shrink: 0;
}

@media (max-width: 640px) {
    .simple-num {
        width: 100%;
        text-align: left;
    }
    .ini-editor {
        font-size: 12px;
        height: 50vh;
    }
}

.simple-num:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}

.simple-num:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.simple-row {
    padding-bottom: 4px;
}

.simple-group {
    margin-bottom: 0.5rem;
}

.simple-group-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 1rem 0;
    padding: 0.6rem 0.9rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(90deg, var(--primary-color) 0%, rgba(0,0,0,0) 100%);
    border-left: 4px solid var(--primary-color);
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.simple-group-title i {
    font-size: 1.1rem;
}

.simple-group-count {
    margin-left: auto;
    padding: 2px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    letter-spacing: 0;
    text-transform: none;
}

@media (max-width: 640px) {
    .simple-group-title {
        font-size: 0.95rem;
        padding: 0.5rem 0.7rem;
    }
}

.audit-entry {
    padding: 10px 12px;
    background-color: #1e1e1e;
    border: 1px solid var(--surface-border);
    border-radius: 6px;
}

.audit-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: var(--surface-c);
    color: var(--text-color);
}

.audit-start { background-color: #1f6f3a; color: #fff; }
.audit-stop { background-color: #7a2222; color: #fff; }
.audit-rcon { background-color: #2b5a8a; color: #fff; }
.audit-config_write { background-color: #6a4ca6; color: #fff; }

.audit-details {
    margin: 6px 0 0;
    padding: 8px 10px;
    background-color: #141414;
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #d0d0d0;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 240px;
    overflow: auto;
}

@media (max-width: 640px) {
    .audit-entry {
        padding: 8px;
    }
    .audit-details {
        font-size: 11px;
        max-height: 180px;
    }
}
</style>
