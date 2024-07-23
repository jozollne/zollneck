<script setup lang="ts">
import { ref } from 'vue';
</script>

<template>
    <div class="app-background">
        <div class="flex align-items-center justify-content-center" style="height: 85vh;">
            <div class="text-center pr-8">
                <p class="text-7xl font-bold">Hi, ich bin John Zollner</p>
                <p class="text-4xl">
                    IT-Administrator und <span class="font-bold text-indigo-300">Full-Stack Developer</span>
                </p>
            </div>
            <Image src="/Profilbild.png" width="550" preview></Image>
        </div>
        <div class="flex align-items-center justify-content-center pb-8">
            <Button icon="pi pi-angle-double-down" aria-label="Submit" />
        </div>
        <div style="height: 55vh;">
        </div>
        <div class="relative mt-10">
            <div class="text-center pr-8">
                <p class="text-7xl font-bold">
                    Meine drei ein halb Jahre beim
                <p class="text-8xl font-bold text-cyan-400">Alfred-Wegener-Institut für Polar und Meeresforschung</p>
                </p>
            </div>
            <div class="line-container">
                <div class="vertical-line"></div>
                <div class="pl-5">
                    <p class="text-7xl font-bold">
                        <i class="pi pi-sitemap text-7xl mr-2"></i>
                        Netzwerk
                    </p>
                    <div class="flex align-content-start">
                        <Image src="/Rack.jpg" width="350" preview></Image>
                        <div class="pl-7">
                            <p class="text-7xl font-bold">Netzwerkintegration im neuen Technikum
                            </p>
                            <p class="text-5xl font-semibold">Jedes Moderne Gebäude braucht Internet. So wie auch das
                                Technikum, in dem ich Racks aufgebaut und die dazugehörigen Switche konfiguriert habe.
                            </p>
                        </div>
                    </div>
                    <Divider />
                    <div class="flex align-content-start">
                        <Image src="/meineDreiSwtiche.jpg" width="350" preview></Image>
                        <div class="pl-7">
                            <p class="text-7xl font-bold">Erstellen eines Azubinetztes
                            </p>
                            <p class="text-5xl font-semibold">In meiner Ausbildung habe ich ein abgeschottetes Netzwerk
                                mit einem WSUS, WDS, DNS, DHCP, ADDC und drei Layer zwei Switchen erstellt. So hatte ich
                                mein eigenes Phyisches Netz in dem ich machen konnte was ich wollte.</p>
                        </div>
                    </div>
                    <Divider />
                    <Divider />
                    <p class="text-7xl font-bold">
                        <i class="pi pi-code text-7xl mr-2"></i>
                        Softwareentwicklung ♥️
                    </p>
                    <p class="text-7xl font-bold">Datenbankanwendung für die Wissenschaftliche Werkstadt</p>
                    <div class="flex align-content-start">
                        <Image src="/WissWerk.png" width="850" preview></Image>
                        <div class="pl-7">
                            <p class="text-5xl font-semibold">Für mein Abschlussprojekt habe ich eine Datenbankanwendung
                                für unsere Wissenschaftliche Werkstadt erschaffen. Dafür habe ich selbstsädig Front- und
                                Backend sowie Datenbank geplannt und entwickelt.</p>
                        </div>
                    </div>
                    <Divider />
                    <p class="text-7xl font-bold">Internet Verwaltungsseite für das Forschungsschiff FS-Heicnke</p>
                    <div class="flex align-content-start">
                        <Image src="/swicthConnection.png" width="850" preview></Image>
                        <div class="pl-7">
                            <p class="text-5xl font-semibold">Ein cooles Projekt im Bleibejahr war es, ein sicheres
                                Front- und Backend zur Verwaltung der Internetverbindung auf der FS-Heincke zu bauen.
                                Mit dieser Seite können autorisierte Crew-Mitglieder die Internetverbindung des
                                Forschungsschiffs FS-Heicnke mit einem Knpofdruck einstellen und testen.</p>
                        </div>
                    </div>
                    <Divider />
                    <Divider />
                    <p class="text-7xl font-bold">
                        <i class="pi pi-phone text-7xl mr-2"></i>
                        Helpdesk
                    </p>
                    <div class="flex align-content-start">
                        <Image src="/helpdesk/gudsupport.jpeg" width="650" preview></Image>
                        <div class="pl-7">
                            <p class="text-7xl font-bold">Interner 1st und später auch 2nd Level Heldpesk Support</p>
                            <p class="text-5xl font-semibold">Ein größer Teil meiner Zeit am AWI war die Arbeit im
                                Heldpesk. Hier habe ich anfangs 1st Level Probleme aufgenommen und bearbeitet. Später
                                habe ich immer mehr 2nd Level Tickets bearbeitet.</p>
                        </div>
                    </div>
                </div>
            </div>
            <p class="text-xl">Work in progress</p>
        </div>
    </div>
</template>

<style>
.app-background {
    background-image: url('/public/background.jpg');
    background-size: cover;
    background-attachment: fixed;
    background-position: center;
}

.line-container {
    display: flex;
    align-items: flex-start;
    position: relative;
    margin-top: 20px;
    padding-left: 100px;
    /* Adds padding to the left of the container */
}

.vertical-line {
    width: 10px;
    height: 370vh;
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
