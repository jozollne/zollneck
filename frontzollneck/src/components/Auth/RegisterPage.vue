<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useFunctionsStore } from '../../stores/funtionsStore'
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';

const funtionsStore = useFunctionsStore();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const retypePassword = ref('');
const username = ref('');
const firstName = ref('');
const lastName = ref('');
const toast = useToast();

const register = async () => {
  try {
    await authStore.registerUser(email.value.toLowerCase(), password.value, username.value.toLowerCase(), firstName.value.toLowerCase(),lastName.value.toLowerCase())
    toast.add({ severity: 'success', summary: 'Regristrierung erfolgreich', detail: "Bitte einen Admin um Aktivierung des Accounts", life: 3000 });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      toast.add({ severity: 'error', summary: 'Regristrierung fehlgeschlagen', detail: error.response.data.message, life: 3000 });
    } else {
      toast.add({ severity: 'error', summary: 'Regristrierung fehlgeschlagen', detail: 'Ein unbekannter Fehler ist aufgetreten', life: 3000 });
    }
  }
};

</script>

<template>
  <form @submit.prevent="register" class="flex flex-column align-items-stretch gap-4 p-2">
    <div class="p-float-label flex flex-column">
      <InputText v-model="firstName" id="firstName" />
      <label for="firstName">Vorname</label>
    </div>
    <div class="p-float-label flex flex-column">
      <InputText v-model="lastName" id="lastName" />
      <label for="lastName">Nachname</label>
    </div>
    <div class="p-float-label flex flex-column">
      <InputText v-model="username" id="username" />
      <label for="username">*Benutzername</label>
    </div>
    <div class="p-float-label flex flex-column">
      <InputText v-model="email" id="registeremail" autocomplete="username" required />
      <label for="registeremail">*E-Mail</label>
    </div>
    <div class="p-float-label flex flex-column">
      <Password v-model="password" id="registerpassword" required toggleMask promptLabel="Wähle ein Passwort"
        weakLabel="Schwach" mediumLabel="Mittel" strongLabel="Stark" />
      <label for="registerpassword">*Passwort</label>
    </div>
    <!-- <div class="p-float-label flex flex-column">
      <Password v-model="retypePassword" id="retypePassword" required toggleMask :feedback="false" />
      <label for="retypePassword">*Passwort</label>
    </div> -->
    <Button type="submit" label="Registrieren" icon="pi pi-user-plus"></Button>
  </form>
</template>

<style scoped></style>
