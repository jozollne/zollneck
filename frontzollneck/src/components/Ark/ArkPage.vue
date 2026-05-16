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

    <Dialog v-model:visible="simpleDialogVisible" modal header="Server-Einstellungen"
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
                            <div class="flex align-items-center gap-1">
                                <label class="font-medium">{{ s.label }}</label>
                                <i v-if="s.tooltip" class="pi pi-info-circle simple-tooltip-icon"
                                    v-tooltip.top="{ value: s.tooltip, showDelay: 200 }"></i>
                            </div>
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
    tooltip?: string;
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
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DifficultyOffset', label: 'Schwierigkeit (Offset)', tooltip: 'Basis-Schwierigkeitswert (0–1). Wird von "Max. Wildlevel" überschrieben wenn gesetzt. Höher = schwerere Gegner.', category: 'Allgemein', type: 'slider', min: 0, max: 1, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OverrideOfficialDifficulty', label: 'Max. Wildlevel', tooltip: 'Maximales Level wilder Dinos. Wert × 30 = max. Level (z.B. 5.0 → Level 150, 10.0 → Level 300).', category: 'Allgemein', type: 'slider', min: 1, max: 10, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DayCycleSpeedScale', label: 'Zyklusgeschwindigkeit (Tag/Nacht)', tooltip: 'Gesamtgeschwindigkeit des Tag-Nacht-Zyklus. Höher = schnellerer Wechsel zwischen Tag und Nacht.', category: 'Allgemein', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NightTimeSpeedScale', label: 'Nachtgeschwindigkeit', tooltip: 'Wie schnell die Nacht vergeht. Höher = kürzere Nächte.', category: 'Allgemein', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DayTimeSpeedScale', label: 'Taggeschwindigkeit', tooltip: 'Wie schnell der Tag vergeht. Höher = kürzere Tage.', category: 'Allgemein', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoCountMultiplier', label: 'Wilde Dino-Anzahl', tooltip: 'Multiplikator für die Anzahl wild spawnender Dinos. 1.0 = Standard, 2.0 = doppelt so viele.', category: 'Allgemein', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'MaxTamedDinos', label: 'Max. gezähmte Dinos (Server)', tooltip: 'Maximale Gesamtanzahl gezähmter Dinos auf dem gesamten Server. Gilt für alle Spieler zusammen.', category: 'Allgemein', type: 'slider', min: 100, max: 10000, step: 100 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ResourcesRespawnPeriodMultiplier', label: 'Ressourcen-Respawnzeit', tooltip: 'Multiplikator für die Zeit bis Ressourcen (Stein, Holz, Erz...) wieder erscheinen. Kleiner = schnellerer Respawn.', category: 'Allgemein', type: 'slider', min: 0.1, max: 5, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'KickIdlePlayersPeriod', label: 'AFK-Kick nach (Sekunden)', tooltip: 'Spieler werden nach dieser Inaktivitätszeit automatisch vom Server getrennt.', category: 'Allgemein', type: 'slider', min: 60, max: 7200, step: 60 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AutoSavePeriodMinutes', label: 'Auto-Save Intervall (Min.)', tooltip: 'Wie oft der Server automatisch speichert. Kleinere Werte = sicherere Daten, aber mehr Server-Last.', category: 'Allgemein', type: 'slider', min: 1, max: 60, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TribeNameChangeCooldown', label: 'Tribe-Umbenennungs-Cooldown (Min.)', tooltip: 'Wartezeit in Minuten bevor ein Tribe seinen Namen erneut ändern kann.', category: 'Allgemein', type: 'slider', min: 0, max: 60, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TheMaxStructuresInRange', label: 'Max. Strukturen in Reichweite', tooltip: 'Maximale Anzahl Bauwerke eines Tribes im Wirkungsbereich (Standard: 10500). Verhindert übermäßigen Ausbau.', category: 'Allgemein', type: 'slider', min: 1000, max: 25000, step: 500 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PerPlatformMaxStructuresMultiplier', label: 'Plattformsattel-Strukturen (Mult.)', tooltip: 'Multipliziert das Bauwerk-Limit auf Plattformsätteln (z.B. Bronto, Quetz). Höher = mehr Bauplätze.', category: 'Allgemein', type: 'slider', min: 0.5, max: 20, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlatformSaddleBuildAreaBoundsMultiplier', label: 'Plattformsattel-Baubereich', tooltip: 'Vergrößert/verkleinert den Baubereich auf Plattformsätteln. Höher = größerer Baubereich.', category: 'Allgemein', type: 'slider', min: 0.5, max: 10, step: 0.5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructurePickupTimeAfterPlacement', label: 'Pickup-Zeitfenster nach Bau (Sek.)', tooltip: 'Wie lange nach dem Platzieren eine Struktur ohne Werkzeug wieder aufgehoben werden kann (0 = deaktiviert).', category: 'Allgemein', type: 'slider', min: 0, max: 600, step: 5 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructurePickupHoldDuration', label: 'Pickup-Halte-Dauer (Sek.)', tooltip: 'Wie lange E gehalten werden muss um eine Struktur aufzunehmen. Kleiner = schnelleres Aufheben.', category: 'Allgemein', type: 'slider', min: 0, max: 5, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ItemStackSizeMultiplier', label: 'Item-Stapelgröße', tooltip: 'Multiplikator für die maximale Stapelgröße von Items. Höher = mehr Items pro Slot möglich.', category: 'Allgemein', type: 'slider', min: 0.1, max: 100, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventOfflinePvPInterval', label: 'Offline-PvP-Schutz Verzögerung (Sek.)', tooltip: 'Sekunden nach dem Ausloggen bis der Offline-PvP-Schutz greift. 0 = sofortiger Schutz.', category: 'Allgemein', type: 'slider', min: 0, max: 3600, step: 1 },
    { file: 'game', section: GAME_SECTION, key: 'StructureDamageRepairCooldown', label: 'Reparatur-Cooldown nach Schaden (Sek.)', tooltip: 'Wie viele Sekunden nach einem Angriff eine Struktur nicht repariert werden kann.', category: 'Allgemein', type: 'slider', min: 0, max: 600, step: 1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'MaxPlatformSaddleStructureLimit', label: 'Plattformsattel Max-Strukturen (absolut)', tooltip: 'Absolutes Strukturlimit pro Plattformsattel, unabhängig vom Multiplikator.', category: 'Allgemein', type: 'slider', min: 10, max: 500, step: 5 },

    // Raten
    { file: 'gameusersettings', section: GUS_SECTION, key: 'HarvestAmountMultiplier', label: 'Ernte-Menge', tooltip: 'Wie viel Ressourcen pro Ernteschlag gewonnen werden. 2.0 = doppelte Ausbeute.', category: 'Raten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'HarvestHealthMultiplier', label: 'Ressourcen-Lebenspunkte', tooltip: 'Lebenspunkte der Ressourcen (Bäume, Steine...). Höher = mehr Schläge zum Abbauen nötig, aber auch mehr Ausbeute.', category: 'Raten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PlayerHarvestingDamageMultiplier', label: 'Spieler-Ernteschaden', tooltip: 'Schaden den Spieler beim Ernten an Ressourcen verursachen. Höher = schnelleres Abbauen.', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'DinoHarvestingDamageMultiplier', label: 'Dino-Ernteschaden', tooltip: 'Schaden den gezähmte Dinos beim Ernten an Ressourcen verursachen.', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'ResourceNoReplenishRadiusPlayers', label: 'Ressourcen-Sperrradius (Spieler)', tooltip: 'Multiplikator des Radius um Spieler, in dem keine Ressourcen respawnen. Größer = weiterer Sperrbereich.', category: 'Raten', type: 'slider', min: 0.1, max: 2, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'ResourceNoReplenishRadiusStructures', label: 'Ressourcen-Sperrradius (Bauwerke)', tooltip: 'Multiplikator des Radius um Bauwerke, in dem keine Ressourcen respawnen.', category: 'Raten', type: 'slider', min: 0.1, max: 2, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'SupplyCrateLootQualityMultiplier', label: 'Versorgungskisten-Qualität', tooltip: 'Qualitätsmultiplikator für Items in Versorgungskisten (Drops). Höher = bessere Ausrüstung.', category: 'Raten', type: 'slider', min: 1, max: 5, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'FishingLootQualityMultiplier', label: 'Angel-Loot-Qualität', tooltip: 'Qualitätsmultiplikator für Items beim Angeln. Höher = bessere gefangene Ausrüstung.', category: 'Raten', type: 'slider', min: 1, max: 5, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'FuelConsumptionIntervalMultiplier', label: 'Treibstoffverbrauch (Mult.)', tooltip: 'Multiplikator für den Treibstoffverbrauch von Generatoren, Öfen, Fackeln usw. Kleiner = sparsamer.', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'CropGrowthSpeedMultiplier', label: 'Pflanzenwachstumsgeschwindigkeit', tooltip: 'Wie schnell Pflanzen in Pflanzentöpfen wachsen und Früchte tragen. Höher = schneller.', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'HairGrowthSpeedMultiplier', label: 'Haarwachstumsgeschwindigkeit', tooltip: 'Wie schnell Haare und Bart nachwachsen. Höher = schneller. Beeinflusst auch Wollproduktion.', category: 'Raten', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'PoopIntervalMultiplier', label: 'Dino-Kotintervall', tooltip: 'Zeitabstand zwischen Dino-Ausscheidungen. Kleiner = häufiger Kot (nützlich für Dünger-Farmen).', category: 'Raten', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Verfallszeiten
    { file: 'game', section: GAME_SECTION, key: 'GlobalCorpseDecompositionTimeMultiplier', label: 'Verwesungszeit (Leichen)', tooltip: 'Wie lange Leichen von Spielern und Dinos bestehen bleiben. Höher = länger sichtbar/bergbar.', category: 'Verfallszeiten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvEStructureDecayPeriodMultiplier', label: 'PvE Bauwerk-Verfall bis Übernahme', tooltip: 'Multiplikator für die Zeit bis ein Bauwerk im PvE-Modus von anderen übernommen werden kann (bei Eigentümer-Inaktivität).', category: 'Verfallszeiten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvEStructureDecayDestructionPeriod', label: 'PvE Bauwerk-Verfall bis Zerstörung (Std.)', tooltip: 'Stunden nach der Übernahmereife bis ein Bauwerk automatisch zerstört wird (0 = nicht zerstören).', category: 'Verfallszeiten', type: 'slider', min: 0.0, max: 20, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvEDinoDecayPeriodMultiplier', label: 'PvE Dino-Verfall bis Übernahme', tooltip: 'Multiplikator für die Zeit bis ein gezähmter Dino im PvE-Modus von anderen beansprucht werden kann.', category: 'Verfallszeiten', type: 'slider', min: 0.1, max: 20, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'CropDecaySpeedMultiplier', label: 'Pflanzenverfall-Geschwindigkeit', tooltip: 'Wie schnell ungegossene Pflanzen in Töpfen verwelken/verfaulen. Kleiner = langlebiger.', category: 'Verfallszeiten', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableStructureDecayPVE', label: 'Bauwerksverfall deaktivieren (PvE)', tooltip: 'Schaltet den automatischen Verfall und Übernahme-Timer von Bauwerken im PvE-Modus komplett aus.', category: 'Verfallszeiten', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableDinoDecayPvE', label: 'Dino-Verfall deaktivieren (PvE)', tooltip: 'Schaltet den automatischen Verfall-Timer gezähmter Dinos im PvE-Modus komplett aus.', category: 'Verfallszeiten', type: 'bool' },

    // XP Multiplikatoren
    { file: 'gameusersettings', section: GUS_SECTION, key: 'XPMultiplier', label: 'Globaler XP-Multiplikator', tooltip: 'Allgemeiner Multiplikator für alle XP-Quellen gleichzeitig. Wird mit den spezifischen XP-Multiplikatoren multipliziert.', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'KillXPMultiplier', label: 'Kill-XP', tooltip: 'XP-Multiplikator speziell fürs Töten von Kreaturen.', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'HarvestXPMultiplier', label: 'Ernte-XP', tooltip: 'XP-Multiplikator für das Sammeln von Ressourcen.', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'CraftXPMultiplier', label: 'Crafting-XP', tooltip: 'XP-Multiplikator für das Herstellen von Items und Bauwerken.', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'GenericXPMultiplier', label: 'Allgemeines XP', tooltip: 'XP-Multiplikator für allgemeine Aktionen (z.B. Erkunden neuer Gebiete).', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'SpecialXPMultiplier', label: 'Spezial-XP', tooltip: 'XP-Multiplikator für besondere Aktionen (z.B. Bezwingen von Bossen).', category: 'XP-Boni', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Schaden & Resistenz
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerDamageMultiplier', label: 'Spieler-Schaden', tooltip: 'Multiplikator für den Schaden, den Spieler verursachen. Höher = mehr Schaden.', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerResistanceMultiplier', label: 'Spieler-Resistenz', tooltip: 'Multiplikator für den Schaden, den Spieler erleiden. Kleiner = weniger Schaden eingesteckt (zäherer Spieler).', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoDamageMultiplier', label: 'Wilder Dino-Schaden', tooltip: 'Multiplikator für den Schaden wilder Dinos. Höher = gefährlichere Wildtiere.', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoResistanceMultiplier', label: 'Wilder Dino-Resistenz', tooltip: 'Multiplikator für den Schaden, den wilde Dinos erleiden. Kleiner = zähere Wildtiere.', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'StructureDamageMultiplier', label: 'Bauwerk-Schaden', tooltip: 'Multiplikator für den Schaden, den Bauwerke erleiden. Kleiner = stabilere Bauten.', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PvPZoneStructureDamageMultiplier', label: 'PvP-Zone Bauwerk-Schaden', tooltip: 'Zusätzlicher Schadensmultiplikator für Bauwerke in PvP-Sonderzonen.', category: 'Schaden & Resistenz', type: 'slider', min: 0.1, max: 10, step: 0.01 },

    // Zucht
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TamingSpeedMultiplier', label: 'Zähmungsgeschwindigkeit', tooltip: 'Wie schnell Dinos gezähmt werden. Höher = schnelleres Zähmen (Taming-Fortschritt steigt schneller).', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'MatingIntervalMultiplier', label: 'Paarungsintervall', tooltip: 'Abstand zwischen möglichen Paarungen. Kleiner = Paarung öfter möglich.', category: 'Zucht', type: 'slider', min: 0.01, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'MatingSpeedMultiplier', label: 'Paarungsgeschwindigkeit', tooltip: 'Wie schnell der Paarungsvorgang abläuft. Höher = schneller bereit zur Paarung.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'EggHatchSpeedMultiplier', label: 'Ei-Schlüpfgeschwindigkeit', tooltip: 'Wie schnell Eier ausgebrütet werden. Höher = kürzere Brutzeit.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyMatureSpeedMultiplier', label: 'Baby-Reifungsgeschwindigkeit', tooltip: 'Wie schnell Babys aufwachsen und erwachsen werden. Höher = schnellere Reifung.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyFoodConsumptionSpeedMultiplier', label: 'Baby-Nahrungsverbrauch', tooltip: 'Wie schnell Babys Nahrung verbrauchen. Kleiner = seltener füttern nötig.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleIntervalMultiplier', label: 'Baby-Kuschelintervall', tooltip: 'Zeitabstand zwischen Imprint-Aufforderungen des Babys. Kleiner = häufigere Imprint-Anfragen.', category: 'Zucht', type: 'slider', min: 0.01, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleGracePeriodMultiplier', label: 'Kuschel-Gnadenzeitraum', tooltip: 'Zeitfenster nach der Imprint-Aufforderung, in dem noch ohne Strafpunkte gekuschelt werden kann.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyCuddleLoseImprintQualitySpeedMultiplier', label: 'Imprint-Verlustrate', tooltip: 'Wie schnell Imprint-Qualität verloren geht, wenn eine Kuschel-Aufforderung verpasst wird. Kleiner = weniger Verlust.', category: 'Zucht', type: 'slider', min: 0.01, max: 10, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'BabyImprintingStatScaleMultiplier', label: 'Imprint-Statbonus', tooltip: 'Stärke des Stat-Bonus durch vollständiges Imprint. Höher = stärkerer Bonus für den Züchter.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'BabyImprintAmountMultiplier', label: 'Imprint-Menge pro Kuscheln', tooltip: 'Wie viel Imprint-Prozent pro Kuschel-Aktion vergeben wird. Höher = weniger Kuschel-Aktionen bis 100%.', category: 'Zucht', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Spieler-Stats (Pro Level)
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OxygenSwimSpeedStatMultiplier', label: 'Schwimmgeschwindigkeit', tooltip: 'Schwimmgeschwindigkeit pro Levelaufstieg.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[0]', label: 'Spieler: Gesundheit', tooltip: 'Bonus-Gesundheit (HP) die ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[1]', label: 'Spieler: Ausdauer', tooltip: 'Bonus-Ausdauer die ein Spieler pro Levelaufstieg erhält (bestimmt Sprint-Dauer).', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[2]', label: 'Spieler: Betäubungswiderstand', tooltip: 'Betäubungs-Widerstand (Torpidity) pro Level. Kann von Spielern nicht direkt gesteigert werden.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[3]', label: 'Spieler: Sauerstoff', tooltip: 'Sauerstoffvorrat (Tauchzeit) den ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[4]', label: 'Spieler: Nahrung', tooltip: 'Nahrungskapazität die ein Spieler pro Levelaufstieg erhält. Höher = langsamer verhungern.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[5]', label: 'Spieler: Wasser', tooltip: 'Wasserkapazität (Durstleiste) die ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[6]', label: 'Spieler: Temperaturtoleranz', tooltip: 'Hitze-/Kältetoleranz (Fortitude) die ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[7]', label: 'Spieler: Gewicht', tooltip: 'Tragekapazität (Gewichtslimit) die ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[8]', label: 'Spieler: Nahkampfschaden', tooltip: 'Nahkampf-Schadensbonus den ein Spieler pro Levelaufstieg erhält (in %).', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[9]', label: 'Spieler: Bewegungsgeschwindigkeit', tooltip: 'Bewegungsgeschwindigkeit die ein Spieler pro Levelaufstieg erhält.', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_Player[10]', label: 'Spieler: Crafting-Geschwindigkeit', tooltip: 'Handwerks-Geschwindigkeit die ein Spieler pro Levelaufstieg erhält (beeinflusst auch Rezept-Qualität).', category: 'Spieler-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Dino-Stats (Pro Level)
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[0]', label: 'Gez. Dino: Gesundheit', tooltip: 'Gesundheitsbonus pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[1]', label: 'Gez. Dino: Ausdauer', tooltip: 'Ausdauerbonus pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[2]', label: 'Gez. Dino: Betäubungswiderstand', tooltip: 'Betäubungs-Widerstand pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[3]', label: 'Gez. Dino: Sauerstoff', tooltip: 'Sauerstoffvorrat (Tauchzeit) pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[4]', label: 'Gez. Dino: Nahrung', tooltip: 'Nahrungskapazität pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[5]', label: 'Gez. Dino: Wasser', tooltip: 'Wasserkapazität pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[6]', label: 'Gez. Dino: Temperaturtoleranz', tooltip: 'Temperaturtoleranz pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[7]', label: 'Gez. Dino: Gewicht', tooltip: 'Tragekapazität pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[8]', label: 'Gez. Dino: Nahkampfschaden', tooltip: 'Nahkampf-Schaden pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[9]', label: 'Gez. Dino: Bewegungsgeschwindigkeit', tooltip: 'Bewegungsgeschwindigkeit pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'game', section: GAME_SECTION, key: 'PerLevelStatsMultiplier_DinoTamed[10]', label: 'Gez. Dino: Crafting-Geschwindigkeit', tooltip: 'Crafting-Geschwindigkeit pro Level nach dem Zähmen.', category: 'Dino-Stats (Pro Level)', type: 'slider', min: 0.1, max: 10, step: 0.1 },

    // Verbrauch (Spieler)
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerCharacterWaterDrainMultiplier', label: 'Durstverbrauch (Spieler)', tooltip: 'Multiplikator für den Wasserverlust pro Zeiteinheit. Kleiner = weniger durstig. Standard: 1.0', category: 'Verbrauch (Spieler)', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerCharacterFoodDrainMultiplier', label: 'Hungerverbrauch (Spieler)', tooltip: 'Multiplikator für den Nahrungsverlust pro Zeiteinheit. Kleiner = weniger hungrig. Standard: 1.0', category: 'Verbrauch (Spieler)', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerCharacterStaminaDrainMultiplier', label: 'Ausdauerverbrauch (Spieler)', tooltip: 'Multiplikator für den Ausdauerverlust beim Sprint/Schwimmen. Kleiner = ausdauernder. Standard: 1.0', category: 'Verbrauch (Spieler)', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PlayerCharacterHealthRecoveryMultiplier', label: 'Gesundheitsregeneration (Spieler)', tooltip: 'Multiplikator für die passive HP-Regeneration. Höher = schnellere Heilung. Standard: 1.0', category: 'Verbrauch (Spieler)', type: 'slider', min: 0.1, max: 10, step: 0.01 },

    // Verbrauch (Gezähmte Dinos)
    { file: 'gameusersettings', section: GUS_SECTION, key: 'TamedDinoCharacterFoodDrainMultiplier', label: 'Hungerverbrauch (Gezähmt, passiv)', tooltip: 'Passiver Nahrungsverbrauch gezähmter Dinos im Stand (nicht beim Reiten). Kleiner = seltener füttern nötig.', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoCharacterFoodDrainMultiplier', label: 'Hungerverbrauch (Alle Dinos)', tooltip: 'Allgemeiner Nahrungsverbrauch aller Dinos (wild & gezähmt). Kleiner = weniger Futter benötigt.', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoCharacterStaminaDrainMultiplier', label: 'Ausdauerverbrauch (Dino)', tooltip: 'Ausdauerverlust von Dinos beim Rennen/Fliegen. Kleiner = länger durchhaltend.', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DinoCharacterHealthRecoveryMultiplier', label: 'Gesundheitsregeneration (Dino)', tooltip: 'Passive HP-Regeneration aller Dinos. Höher = schnellere Heilung.', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'LayEggIntervalMultiplier', label: 'Ei-Lege-Intervall', tooltip: 'Zeitabstand zwischen Eiablagen gezähmter Dinos. Kleiner = häufigere Eierproduktion.', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'TamedDinoTorporDrainMultiplier', label: 'Betäubungsabbau (Gezähmte Dinos)', tooltip: 'Wie schnell Betäubung bei gezähmten Dinos abklingt. Kleiner = länger betäubt (gut für Veterinär-Eingriffe).', category: 'Verbrauch (Gezähmte Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },

    // Verbrauch (Wilde Dinos)
    { file: 'game', section: GAME_SECTION, key: 'WildDinoCharacterFoodDrainMultiplier', label: 'Hungerverbrauch (Wilde Dinos)', tooltip: 'Nahrungsverbrauch wilder Dinos. Relevant für passive Zähmung (Dino muss hungrig sein).', category: 'Verbrauch (Wilde Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'PassiveTameIntervalMultiplier', label: 'Passiv-Zähmungsintervall', tooltip: 'Zeitabstand zwischen Fütterungsschritten beim passiven Zähmen. Kleiner = schnelleres passives Zähmen.', category: 'Verbrauch (Wilde Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },
    { file: 'game', section: GAME_SECTION, key: 'WildDinoTorporDrainMultiplier', label: 'Betäubungsabbau (Wilde Dinos)', tooltip: 'Wie schnell Betäubung bei wilden Dinos abklingt. Kleiner = länger betäubt (mehr Zeit zum Zähmen).', category: 'Verbrauch (Wilde Dinos)', type: 'slider', min: 0.01, max: 5, step: 0.01 },

    // Server-Optionen (Bools)
    { file: 'game', section: GAME_SECTION, key: 'bAllowUnlimitedRespecs', label: 'Unbegrenzte Respecs (Mindwipe)', tooltip: 'Spieler können beliebig oft ihre Levelpunkte zurücksetzen (Mindwipe Tonic ohne Limit).', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bPassiveDefensesDamageRiderlessDinos', label: 'Passive Verteidigung vs. reitlose Dinos', tooltip: 'Passive Verteidigungsstrukturen (Türme, Pflanzensamen X) schaden auch Dinos ohne Reiter.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerPVE', label: 'PvE-Modus', tooltip: 'Aktiviert PvE-Modus: Spieler können sich gegenseitig nicht angreifen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerHardcore', label: 'Hardcore-Modus', tooltip: 'Beim Tod wird der Charakter permanent gelöscht (Permadeath).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventOfflinePvP', label: 'Offline-PvP-Schutz', tooltip: 'Spieler und ihre Strukturen/Dinos können nicht angegriffen werden, solange sie offline sind.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'EnablePvPGamma', label: 'PvP-Gamma erlauben', tooltip: 'Spieler dürfen im PvP die Gamma-Helligkeit mit "gamma" Befehl anpassen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AdminLogging', label: 'Admin-Aktionen protokollieren', tooltip: 'Admin-Befehle werden im Tribe-Log und auf der Karte für andere Spieler sichtbar protokolliert.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'GlobalVoiceChat', label: 'Globaler Sprachchat', tooltip: 'Alle Spieler können über Sprachchat kommunizieren, unabhängig von Entfernung oder Tribe.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ProximityChat', label: 'Näherungs-Textkonsole', tooltip: 'Textnachrichten im lokalen Chat sind nur für nahe Spieler sichtbar.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowThirdPersonPlayer', label: 'Third-Person-Ansicht erlauben', tooltip: 'Spieler können in die Third-Person-Kamera wechseln.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ServerCrosshair', label: 'Fadenkreuz anzeigen', tooltip: 'Zeigt ein Fadenkreuz in der Bildschirmmitte an.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ShowMapPlayerLocation', label: 'Spielerposition auf Karte', tooltip: 'Spieler sehen ihre eigene Position als Marker auf der In-Game-Karte.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ShowFloatingDamageText', label: 'Schwebende Schadensanzeige', tooltip: 'Zeigt Schadenszahlen schwebend über getroffenen Zielen an.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowHitMarkers', label: 'Treffermarkierungen', tooltip: 'Zeigt eine visuelle/akustische Bestätigung wenn ein Treffer landet.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowFlyerCarryPVE', label: 'Flyer dürfen tragen (PvE)', tooltip: 'Flugtiere dürfen im PvE-Modus andere Spieler, Kreaturen oder Dinos aufheben und tragen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowCaveBuildingPvE', label: 'Höhlenbau erlauben (PvE)', tooltip: 'Erlaubt das Errichten von Bauwerken in Höhlen/Dungeons im PvE-Modus.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'ForceAllowCaveFlyers', label: 'Flyer in Höhlen erlauben', tooltip: 'Flugtiere dürfen in Höhlen und Dungeons fliegen (normalerweise verboten).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PvPDinoDecay', label: 'Dino-Verfall im PvP', tooltip: 'Gezähmte Dinos inaktiver Spieler verfallen und werden freigegeben im PvP-Modus.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'OverrideStructurePlatformPrevention', label: 'Plattformsattel-Bausperren überschreiben', tooltip: 'Erlaubt das Bauen auf Plattformsätteln auch in normalerweise gesperrten Bereichen (z.B. Ressourcenschutz-Zonen).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowRaidDinoFeeding', label: 'Raid-Dinos füttern', tooltip: 'Ermöglicht das Füttern und Pflegen von Titan-artigen Raid-Dinos (z.B. Titanosaur).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventTribeAlliances', label: 'Stammesallianzen verhindern', tooltip: 'Stämme können keine Allianzen bilden – kein gemeinsamer Marker oder Zusammenarbeit über Tribe hinaus.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadSurvivors', label: 'Charakter-Transfer sperren', tooltip: 'Verhindert das Herunterladen von Charakteren aus dem ARK-Netzwerk (Obelisken/Terminals).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadItems', label: 'Item-Transfer sperren', tooltip: 'Verhindert das Herunterladen von Items aus dem ARK-Netzwerk.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDownloadDinos', label: 'Dino-Transfer sperren', tooltip: 'Verhindert das Herunterladen von Dinos aus dem ARK-Netzwerk.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NoTributeDownloads', label: 'Tribute-Downloads deaktivieren', tooltip: 'Keine Downloads über das Tribute-System an Obelisken und Supply Terminals.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowAnyoneBabyImprintCuddle', label: 'Imprint für alle Spieler erlauben', tooltip: 'Jeder Spieler kann Imprint-Kuscheln bei einem Baby durchführen, nicht nur der Züchter.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'DisableImprintDinoBuff', label: 'Imprint-Bonus deaktivieren', tooltip: 'Deaktiviert den Kampf-Bonus für Dinos durch vollständiges Imprint.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'PreventDiseases', label: 'Krankheiten deaktivieren', tooltip: 'Spieler können keine Krankheiten (z.B. Leprosy) bekommen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'NonPermanentDiseases', label: 'Krankheiten nicht permanent', tooltip: 'Krankheiten heilen automatisch von selbst aus, ohne dass ein Heilmittel benötigt wird.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'EnableExtraStructurePreventionVolumes', label: 'Zusätzliche Bausperrzonen aktivieren', tooltip: 'Aktiviert zusätzliche kartenspezifische Bausperrzonen (verhindert Blockade wichtiger Gebiete).', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowIntegratedSPlusStructures', label: 'Integrierte S+-Strukturen aktivieren', tooltip: 'Aktiviert die in ARK integrierten Structures Plus (S+) Bauteile und Funktionen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AllowHideDamageSourceFromLogs', label: 'Schadensquelle im Log verbergen', tooltip: 'Die Quelle von Schaden wird in Todesnachrichten und Logs nicht angezeigt.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AlwaysNotifyPlayerLeft', label: 'Server-Verlassen ankündigen', tooltip: 'Alle Spieler werden benachrichtigt, wenn jemand den Server verlässt.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'AlwaysNotifyPlayerJoined', label: 'Server-Beitritt ankündigen', tooltip: 'Alle Spieler werden benachrichtigt, wenn jemand dem Server beitritt.', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bOnlyAllowSpecifiedEngrams', label: 'Nur erlaubte Engrams freischaltbar', tooltip: 'Spieler können nur explizit freigegebene Engrams (Rezepte) lernen. Benötigt eine Engram-Whitelist.', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bAllowFlyerSpeedLeveling', label: 'Flyer-Geschwindigkeit levelbar', tooltip: 'Erlaubt das Investieren von Level-Punkten in die Bewegungsgeschwindigkeit bei Flugtieren.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'bUseSingleplayerSettings', label: 'Singleplayer-Einstellungen verwenden', tooltip: 'Aktiviert das Singleplayer-Balancing (schnelleres Zähmen, andere Multiplizierungen). Nicht für Multiplayer empfohlen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bDisableFriendlyFire', label: 'Friendly Fire deaktivieren', tooltip: 'Stammesmitglieder und Alliierte können sich gegenseitig nicht verletzen.', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bUseCorpseLocator', label: 'Leichen-Locator aktivieren', tooltip: 'Spieler sehen die Position ihrer eigenen Leiche (mit Items) als Marker auf der Karte.', category: 'Server-Optionen', type: 'bool' },
    { file: 'game', section: GAME_SECTION, key: 'bDisableStructurePlacementCollision', label: 'Bauwerk-Kollision deaktivieren', tooltip: 'Bauwerke können sich überlappen und werden nicht durch andere Objekte blockiert.', category: 'Server-Optionen', type: 'bool' },
    { file: 'gameusersettings', section: GUS_SECTION, key: 'bAllowPlatformSaddleMultiFloors', label: 'Plattformsattel: Mehrere Etagen', tooltip: 'Ermöglicht das Bauen übereinander gestapelter Stockwerke auf Plattformsätteln.', category: 'Server-Optionen', type: 'bool' },
];

const SIMPLE_CATEGORIES = [
    'Allgemein',
    'Raten',
    'Verfallszeiten',
    'XP-Boni',
    'Schaden & Resistenz',
    'Zucht',
    'Spieler-Stats (Pro Level)',
    'Dino-Stats (Pro Level)',
    'Verbrauch (Spieler)',
    'Verbrauch (Gezähmte Dinos)',
    'Verbrauch (Wilde Dinos)',
    'Server-Optionen',
];

const groupedSchema = SIMPLE_CATEGORIES
    .map(cat => ({ cat, items: allSimpleSettings.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0);

const categoryIcon = (cat: string): string => {
    switch (cat) {
        case 'Allgemein': return 'pi pi-cog';
        case 'Server-Optionen': return 'pi pi-sliders-v';
        case 'Raten': return 'pi pi-percentage';
        case 'Verfallszeiten': return 'pi pi-clock';
        case 'XP-Boni': return 'pi pi-star';
        case 'Schaden & Resistenz': return 'pi pi-shield';
        case 'Verbrauch (Spieler)': return 'pi pi-user';
        case 'Verbrauch (Gezähmte Dinos)': return 'pi pi-heart';
        case 'Verbrauch (Wilde Dinos)': return 'pi pi-dinosaur';
        case 'Zucht': return 'pi pi-heart-fill';
        case 'Spieler-Stats (Pro Level)': return 'pi pi-chart-bar';
        case 'Dino-Stats (Pro Level)': return 'pi pi-chart-line';
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
        // Don't add a trailing "\n" — the lookahead in sectionRe does NOT consume
        // the "\n" before the next section header, so any trailing newline we add
        // here would compound on every save and create accumulating blank lines.
        newBody = body.replace(/\s*$/, '') + `\n${key}=${value}`;
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
        // Cleanup: collapse 3+ consecutive blank lines to a single one and ensure
        // exactly one trailing newline. ARK's INI parser can choke on excessive
        // blank lines, which would cause it to discard the file and write defaults.
        const cleanupIni = (s: string) => s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
        gameText = cleanupIni(gameText);
        gusText = cleanupIni(gusText);
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

.simple-tooltip-icon {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    cursor: help;
    opacity: 0.6;
    transition: opacity 0.15s, color 0.15s;
}

.simple-tooltip-icon:hover {
    opacity: 1;
    color: var(--primary-color);
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
