<template>
    <div class="card">
        <Menubar :model="konvertorItems">
            <template #start>
                <a href="https://zollneck.de">
                    <span class="inline-flex align-items-center gap-1 px-2 py-2">
                        <img src="/Logo.png" alt="Logo" width="35" height="40" class="h-2rem">
                        <span class="font-medium text-white text-xl font-semibold hidden md:block">ZOLLNECK.<span
                                class="text-primary">DE</span></span>
                    </span>
                </a>
            </template>
            <template #item="{ item, props, hasSubmenu, root }">
                <a class="flex align-items-center text-white" v-bind="props.action">
                    <span :class="item.icon" />
                    <span class="ml-2">{{ item.label }}</span>
                    <Badge v-if="item.badge" :class="{ 'ml-auto': !root, 'ml-2': root }" :value="item.badge" />
                    <span v-if="item.shortcut"
                        class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1">{{
                            item.shortcut }}</span>
                    <i v-if="hasSubmenu"
                        :class="['pi pi-angle-down', { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root }]"></i>
                </a>
            </template>
            <template #end>
                <div class="flex align-items-center gap-2">
                    <Button label="Konto" type="button" icon="pi pi-user" @click="toggle" aria-haspopup="true"
                        aria-controls="overlay_menu" />
                    <Menu ref="menu" id="overlay_menu" :model="userItems" :popup="true">
                        <template #start>
                            <span class="inline-flex align-items-center gap-1 px-2 py-2">
                                <img src="/Logo.png" alt="Logo" width="35" height="40" class="h-2rem">
                                <span class="font-medium text-white text-xl font-semibold">ZOLLNECK.<span
                                        class="text-primary">DE</span></span>
                            </span>
                        </template>
                        <template #submenuheader="{ item }">
                            <span class="text-primary font-bold">{{ item.label }}</span>
                        </template>
                        <template #item="{ item, props }">
                            <a class="flex align-items-center" v-bind="props.action">
                                <span :class="item.icon" />
                                <span class="ml-2">{{ item.label }}</span>
                                <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
                                <span v-if="item.shortcut"
                                    class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1">{{
                                        item.shortcut }}</span>
                            </a>
                        </template>
                        <template #end v-if="authStore.isAuthenticated">
                            <button
                                class="relative overflow-hidden w-full p-link flex align-items-center p-2 pl-3 text-color hover:surface-200 border-noround">
                                <Avatar
                                    image="https://www.freeiconspng.com/thumbs/profile-icon-png/account-profile-user-icon--icon-search-engine-10.png"
                                    class="mr-2" shape="circle" />
                                <span class="inline-flex flex-column">
                                    <span class="font-bold">{{ username }}</span>
                                    <span class="text-sm">User</span>
                                </span>
                            </button>
                        </template>
                    </Menu>
                </div>
            </template>
        </Menubar>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useToast } from 'primevue/usetoast';
import { useFunctionsStore } from '@/stores/RouterStore';
import { useAuthStore } from '@/stores/AuthStore';

const toast = useToast();
const authStore = useAuthStore();
const functionsStore = useFunctionsStore();
const menu = ref();

const username = computed(() => {
    return localStorage.getItem('userAccount') || '';
});


const userItems = computed(() => {
    const items = [];

    if (authStore.isAuthenticated) {
        items.push({
            label: 'Abmelden',
            icon: 'pi pi-power-off',
            command: () => {
                functionsStore.logOut();
                toast.add({ severity: 'success', summary: 'Erfolgreich abgemeldet!', detail: 'Nutzer: "' + username.value + '" wurde erfolgreich abgemeldet!', life: 2000 });
            }
        },
            {
                label: 'Profil Bearbeiten',
                icon: 'pi pi-pencil',
                command: () => {

                }
            }
        );
    }
    if (!authStore.isAuthenticated) {
        items.push({
            label: 'Anmelden',
            icon: 'pi pi-user',
            command: () => {
                functionsStore.goToAuth();
            }
        })
    }

    return [{
        label: 'Konto',
        items: items
    }];
});


const toggle = (event: any) => {
    menu.value.toggle(event);
};

const konvertorItems = computed(() => {
    const items = [];
    items.push({
        label: 'Home',
        icon: 'pi pi-home',
        command: () => {
            functionsStore.goToHome();
        }
    });


    /* items.push({
      label: 'Test',
      icon: 'pi pi-pencil',
      command: () => {
        functionsStore.goToTest();
      }
    }); */

    if (authStore.isAuthenticated) {
        items.push({
            label: 'Konverter',
            icon: 'pi pi-file-edit',
            items: [
                {
                    label: 'YouTube',
                    icon: 'pi pi-youtube',
                    command: () => {
                        functionsStore.goToYoutubeVideo();
                    }
                    /* items: [
                      {
                        label: 'Videos',
                        icon: 'pi pi-video',
                        shortcut: '🪟+B',
                        command: () => {
                          functionsStore.goToYoutubeVideo();
                        }
                      },
                      {
                        label: 'Musik',
                        icon: 'pi pi-volume-up',
                        shortcut: '🪟+M',
                        command: () => {
                          functionsStore.goToYoutubeAudio();
                        }
                      }
                    ] */
                },
                {
                    separator: true
                },
                {
                    label: 'Dateien',
                    icon: 'pi pi-file',
                    command: () => {
                        functionsStore.goToFileConvertor();
                    }
                }

            ]

        });

        items.push({
            label: 'Cloud',
            icon: 'pi pi-cloud-download',
            command: () => {
                functionsStore.goToDownload();
            }
        });
    }

    return items;
});

</script>