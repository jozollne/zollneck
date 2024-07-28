<template>
    <div class="app-background">
        <div class="flex flex-column align-items-center justify-content-center h-screen">
            <div class="flex align-items-center justify-content-center">
                <div class="md:pr-8">
                    <p class="font-bold text-center md:text-left text-4xl md:text-7xl">Hi, ich bin John Zollner</p>
                    <p class="text-xl md:text-4xl">
                        I definitely <span
                            class="font-bold text-center md:text-left text-indigo-300 line-through">don't</span>
                        know
                        what I'm doing :)
                    </p>
                </div>
                <Image src="/Profilbild.png" width="550" preview class="hidden xl:block"></Image>
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
                <Button icon="pi pi-angle-double-down" label="Über mich" class="w-full md:w-auto"
                    @click="scrollTo('about')" />
                <Button icon="pi pi-angle-double-down" label="Dreineinhalb Jahre AWI" class="w-full md:w-auto"
                    @click="scrollTo('awi')" />
                <Button icon="pi pi-angle-double-down" label="Kontakt" class="w-full md:w-auto"
                    @click="scrollTo('kontakt')" />
            </div>
        </div>

        <div id="about" class="flex flex-column align-items-center justify-content-center h-screen">
            <div class="flex flex-column md:flex-row align-items-center justify-content-center md:pl-7 w-full">
                <Image src="/liegen.jpg" width="600" preview class="hidden xl:block"></Image>
                <div class="pl-1 md:pl-7">
                    <p class="text-4xl text-center md:text-left md:text-6xl font-bold">Über mich</p>
                    <p class="text-base md:text-4xl font-semibold">
                        Hi, ich bin John Zollner, 20 Jahre jung! Ich habe meine zweieinhalbjährige Ausbildung am
                        Alfred-Wegener-Institut hinter mir und genieße bis zum 18.01.2025 mein Bleibejahr. Leider gibt
                        es
                        aktuell keine freien Stellen mehr in der IT, also muss ich mich spätestens am 18.01.2025
                        schweren
                        Herzens vom AWI
                        verabschieden.
                        Deshalb bin ich schon auf der Suche nach einem neuen Job, der mir genauso viel Spaß macht und
                        bei
                        dem ich einen wichtigen Beitrag leisten kann.
                    </p>
                    <p class="text-base md:text-4xl font-semibold">
                        Bei mir zu Hause <span class="font-bold text-indigo-300">hatte</span> niemand eine Ahnung von
                        Technik – mich eingeschlossen. Das hat mich angespornt, mehr über Computer zu lernen. Je älter
                        ich
                        wurde,
                        desto größer wurde mein Interesse an Computern. Irgendwann war ich bei Freunden und Familie der
                        erste
                        Ansprechpartner,
                        wenn es um technische Probleme ging.
                    </p>
                </div>
            </div>
            <div class="flex align-items-center justify-content-center gap-3">
                <Button icon="pi pi-angle-double-up" label="Top" class="w-full md:w-auto" @click="scrollTo('top')" />
                <Button icon="pi pi-angle-double-down" label="Dreineinhalb Jahre AWI" class="w-full md:w-auto"
                    @click="scrollTo('awi')" />
                <Button icon="pi pi-angle-double-down" label="Kontakt" class="w-full md:w-auto"
                    @click="scrollTo('kontakt')" />
            </div>
        </div>
        <div id="awi" class="text-center pt-5">
            <p class="text-center text-3xl md:text-7xl font-bold">
                Meine drei ein halb Jahre beim
            </p>
            <p class="text-center text-5xl md:text-8xl font-bold text-indigo-300">Alfred-Wegener-Institut</p>
        </div>
        <div class="flex align-items-start pl-2 md:pl-7">
            <div class="vertical-line hidden md:block"></div>
            <div class="md:pl-5">
                <p class="text-2xl md:text-6xl font-bold">
                    <i class="pi pi-code text-2xl md:text-6xl mr-2"></i>
                    Softwareentwicklung ♥️
                </p>
                <p class="text-xl md:text-6xl font-bold">Datenbankanwendung für die Wissenschaftliche Werkstadt</p>
                <div class="flex align-content-start">
                    <Image src="/WissWerk.png" width="850" preview class="hidden xl:block"></Image>
                    <div class="md:pl-7">
                        <p class="text-base md:text-5xl font-semibold">Für mein Abschlussprojekt habe ich eine
                            Datenbankanwendung
                            für unsere Wissenschaftliche Werkstadt erschaffen. Dafür habe ich selbstsädig Front- und
                            Backend sowie Datenbank geplannt und entwickelt.</p>
                    </div>
                </div>
                <Divider />
                <p class="text-xl md:text-6xl font-bold">Internet Verwaltungsseite für das Forschungsschiff FS-Heicnke
                </p>
                <div class="flex align-content-start">
                    <Image src="/swicthConnection.png" width="850" preview class="hidden xl:block"></Image>
                    <div class="md:pl-7">
                        <p class="text-base md:text-5xl font-semibold">Ein cooles Projekt im Bleibejahr war es, ein
                            sicheres
                            Front- und Backend zur Verwaltung der Internetverbindung auf der FS-Heincke zu bauen.
                            Mit dieser Seite können autorisierte Crew-Mitglieder die Internetverbindung des
                            Forschungsschiffes FS-Heicnke mit einem Knpofdruck einstellen und testen.</p>
                    </div>
                </div>
                <p class="text-2xl md:text-6xl font-bold">
                    <i class="pi pi-sitemap text-2xl md:text-6xl mr-2"></i>
                    Netzwerk
                </p>
                <div class="flex align-content-start">
                    <Image src="/Rack.jpg" width="350" preview class="hidden xl:block"></Image>
                    <div class="md:pl-7">
                        <p class="text-xl md:text-6xl font-bold">Netzwerkintegration im neuen Technikum
                        </p>
                        <p class="text-base md:text-5xl font-semibold">Jedes Moderne Gebäude braucht Internet. So wie
                            auch
                            das
                            Technikum, in dem ich Racks aufgebaut und die dazugehörigen Switche konfiguriert habe.
                        </p>
                    </div>
                </div>
                <Divider />
                <div class="flex align-content-start">
                    <Image src="/meineDreiSwtiche.jpg" width="350" preview class="hidden xl:block"></Image>
                    <div class="md:pl-7">
                        <p class="text-xl md:text-6xl font-bold">Erstellen eines Azubinetztes
                        </p>
                        <p class="text-base md:text-5xl font-semibold">In meiner Ausbildung habe ich ein abgeschottetes
                            Netzwerk
                            mit einem WSUS, WDS, DNS, DHCP, ADDC und drei Layer zwei Switchen erstellt. So hatte ich
                            mein eigenes Phyisches Netz in dem ich machen konnte was ich wollte.</p>
                    </div>
                </div>
                <p class="text-2xl md:text-6xl font-bold">
                    <i class="pi pi-phone text-2xl md:text-6xl mr-2"></i>
                    Helpdesk
                </p>
                <div class="flex align-content-start">
                    <Image src="/helpdesk/gudsupport.jpeg" width="650" preview class="hidden xl:block"></Image>
                    <div class="md:pl-7">
                        <p class="text-xl md:text-6xl font-bold">Interner 1st und später auch 2nd Level Support</p>
                        <p class="text-base md:text-5xl font-semibold">Ein größer Teil meiner Zeit am AWI war die Arbeit
                            im
                            Heldpesk. Hier habe ich anfangs 1st Level Probleme aufgenommen und bearbeitet. Später
                            habe ich immer mehr 2nd Level Tickets bearbeitet.</p>
                    </div>
                </div>
                <div class="flex align-items-center justify-content-center pt-3 gap-3">
                    <Button icon="pi pi-angle-double-up" label="Top" @click="scrollTo('top')" />
                    <Button icon="pi pi-angle-double-down" label="Kontakt" @click="scrollTo('kontakt')" />
                </div>
            </div>
        </div>
        <form @submit.prevent="sendContact" class="flex flex-column align-items-stretch gap-4 p-2">
            <div id="kontakt" class="flex align-items-center justify-content-center font-bold flex-column pt-8">
                <p class="text-5xl">Ich freue mich über eine Nachricht!</p>
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

.vertical-line {
    width: 30px;
    height: 360vh;
    background: linear-gradient(to bottom, blueviolet, darkblue);
    border-radius: 5px;
    /* Adds rounded corners */
    position: relative;
    /* Changed to relative to work with padding */
    left: 0;
    top: 0;
}

.content-text {
    margin-left: 20px;
}
</style>
