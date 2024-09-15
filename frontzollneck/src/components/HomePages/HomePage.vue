<template>
    <div class="app-background">
        <div class="flex flex-column align-items-center justify-content-center h-screen">
            <div class="flex align-items-center justify-content-center">
                <div class="md:pr-8">
                    <p class="font-bold text-center md:text-left text-4xl md:text-7xl">Hi, ich bin John Zollner</p>
                    <p class="text-xl md:text-4xl md:text-left text-center">
                        Ich weiß definitiv <span
                            class="font-bold text-center md:text-left text-indigo-300 line-through">nicht</span>
                        was ich tue :)
                    </p>
                    <p v-if="!authStore.isAuthenticated" class="md:text-left text-center">
                        Wenn du dich anmeldest, kannst du alle Funktionen meiner Website nutzen 🤠🤠🤠
                    </p>
                </div>
                <Image src="/Chillig round.png" width="500" preview class="hidden xl:block"></Image>
            </div>
            <div class="flex flex-wrap justify-content-center gap-5 align-items-center pt-3">
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/c-sharp-16-svgrepo-com.svg" alt="C# Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">3+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/javascript-16-svgrepo-com.svg" alt="JavaScript Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">2+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/nestjs-svgrepo-com.svg" alt="NestJS Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">1+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/postgresql-svgrepo-com.svg" alt="PostgreSQL Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">2+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/vuejs-svgrepo-com.svg" alt="VueJS Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">2+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/jira-svgrepo-com.svg" alt="Jira Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">3+ Years</span>
                </div>
                <div class="icon-container flex flex-column sm:flex-row align-items-center">
                    <img src="@/icons/cisco-svgrepo-com.svg" alt="Cisco Icon" class="w-2rem xl:w-4rem" />
                    <span class="pt-2 sm:pt-0 sm:pl-2 text-xs xl:text-3xl font-bold">2+ Years</span>
                </div>
            </div>

            <div class="flex align-items-center justify-content-center pt-6 gap-3">
                <Button v-if="!authStore.isAuthenticated" icon="pi pi-user" label="Anmelden" class="w-full md:w-auto"
                    @click="functionsStore.goToAuth()" />
                <Button icon="pi pi-angle-double-down" label="Kontakt" class="w-full md:w-auto"
                    @click="scrollTo('kontakt')" />
            </div>
        </div>
        <form @submit.prevent="sendContact" class="flex flex-column align-items-stretch gap-4 p-2">
        <div id="kontakt" class="flex align-items-center justify-content-center font-bold flex-column pt-8">
            <p class="text-5xl">Hier kannst mit mir in Konatk treten!</p>
            <div class="p-float-label flex flex-column mb-5 w-full md:w-10">
                <InputText v-model="email" id="contactemail" required autocomplete="email" />
                <label for="contactemail">E-Mail</label>
            </div>
            <div class="p-float-label flex flex-column mb-5 w-full md:w-10">
                <InputText v-model="thema" id="thema" required />
                <label for="thema">Um was geht es?</label>
            </div>
            <div class="p-float-label flex flex-column mb-3 w-full md:w-10">
                <Textarea v-model="message" id="message" required rows="5" cols="30" class="max-w-full" />
                <label for="message">Nachricht</label>
            </div>
            <Button label="Senden" type="submit" class="mb-3 w-full md:w-10"></Button>
        </div>
    </form>
    </div>
    
</template>

<script setup lang="ts">
import axios from 'axios';
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useFunctionsStore } from '@/stores/RouterStore';
import { useAuthStore } from '@/stores/AuthStore';

const authStore = useAuthStore();
const functionsStore = useFunctionsStore();
const toast = useToast();
const email = ref('');
const thema = ref('');
const message = ref('');

const scrollTo = (id: string) => {
    if (id != "top") {
        const scrollTo = document.getElementById(id);
        if (scrollTo) {
            scrollTo.scrollIntoView({ behavior: 'smooth' });
        }
    } else if (id == "top") {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const sendContact = () => {
    const options = {
        method: 'POST',
        url: 'https://zollneck.de/api/contact/newContact',
        headers: { 'Content-Type': 'application/json' },
        data: {
            email: email.value,
            subject: thema.value,
            message: message.value
        }
    };

    axios.request(options).then(function (response) {
        console.log(response.data);
        toast.add({ severity: 'success', summary: 'Nachricht gesendet!', detail: 'Betreff: ' + response.data, life: 3000 });
    }).catch(function (error) {
        toast.add({ severity: 'error', summary: 'Fehler!', detail: error, life: 3000 });
        console.error(error);
    });
}
</script>

<style>
.app-background {
    background-image: url('/background.jpg');
    background-size: cover;
    background-attachment: fixed;
}

.content-text {
    margin-left: 20px;
}
</style>
