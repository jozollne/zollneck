
<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import router from '@/router';
import { useFunctionsStore } from '@/stores/funtionsStore';

const functionStore = useFunctionsStore();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const toast = useToast();

const login = async () => {
  try {
    await authStore.setUserToken(email.value.toLocaleLowerCase(), password.value);
    router.push({ path: functionStore.oldRoute || '/' });
    toast.add({ severity: 'success', summary: 'Login erfolgreich', detail: 'Willkommen "' + localStorage.getItem('userAccount') + '"', life: 3000 });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      toast.add({ severity: 'error', summary: 'Login fehlgeschlagen', detail: error.response.data.message, life: 3000 });
    } else {
      toast.add({ severity: 'error', summary: 'Login fehlgeschlagen', detail: 'Ein unbekannter Fehler ist aufgetreten', life: 3000 });
    }
  };
}
</script>


<template>
  <form @submit.prevent="login" class="flex flex-column align-items-stretch gap-4 p-2">
    <div class="p-float-label flex flex-column">
      <InputText v-model="email" id="loginemail" required autocomplete="username" class="w-full" />
      <label for="loginemail">*E-Mail oder Benutzername</label>
    </div>
    <div class="p-float-label flex flex-column">
      <Password v-model="password" id="loginpassword" required toggleMask :feedback="false" class="w-full" />
      <label for="loginpassword">*Passwort</label>
    </div>
    <Button type="submit" label="Anmelden" icon="pi pi-user"></Button>
  </form>
</template>