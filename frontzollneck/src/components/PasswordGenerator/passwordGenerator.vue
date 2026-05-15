<script setup lang="ts">
import { ref } from "vue";
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const password = ref("");
const length = ref(16);
const includeNumbers = ref(true);
const includeSymbols = ref(true);
const includeUppercase = ref(true);

const generatePassword = () => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*?"; 
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let chars = lowercase;
  if (includeNumbers.value) chars += numbers;
  if (includeSymbols.value) chars += symbols;
  if (includeUppercase.value) chars += uppercase;

  let generated = "";
  for (let i = 0; i < length.value; i++) {
    generated += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password.value = generated;
  navigator.clipboard.writeText(password.value);
  toast.add({ severity: 'success', summary: 'Generiert!', detail: 'Neues Passwort wurde generiert und kopiert.', life: 3000 });
};

const copyToClipboard = () => {
  if (!password.value) return;
  navigator.clipboard.writeText(password.value);
  toast.add({ severity: 'success', summary: 'Kopiert!', detail: 'Passwort wurde in die Zwischenablage kopiert.', life: 3000 });
};
</script>

<template>
  <div class="flex align-items-center justify-content-center" style="height: 84vh">
    <div class="card p-4 shadow-4 border-round col-12 col-md-8 col-lg-4">
      <div class="text-center mb-4">
        <h1>🔐 Passwort Generator</h1>
      </div>

      <div class="field mb-4">
        <div class="p-inputgroup">
          <InputText v-model="password" readonly placeholder="Dein neues Passwort" />
          <Button icon="pi pi-copy" severity="secondary" @click="copyToClipboard" :disabled="!password" />
        </div>
      </div>

      <div class="field mb-4">
        <label class="block mb-2 font-bold">Passwortlänge: {{ length }}</label>
        <div class="flex align-items-center gap-3">
          <Slider v-model="length" :min="4" :max="128" class="flex-grow-1" />
          <InputNumber v-model="length" :min="4" :max="128" style="width: 4rem" />
        </div>
      </div>

      <div class="flex flex-column gap-2 mb-4">
        <div class="flex align-items-center gap-2">
          <InputSwitch v-model="includeNumbers" />
          <label>Zahlen</label>
        </div>
        <div class="flex align-items-center gap-2">
          <InputSwitch v-model="includeSymbols" />
          <label>Sonderzeichen (!@#$%^&*?)</label>
        </div>
        <div class="flex align-items-center gap-2">
          <InputSwitch v-model="includeUppercase" />
          <label>Großbuchstaben</label>
        </div>
      </div>

      <Button label="Generieren" icon="pi pi-refresh" class="w-full" @click="generatePassword"></Button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: var(--surface-b);
}
</style>