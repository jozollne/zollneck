import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/AuthStore';
import HomePage from '../components/HomePage.vue'
import AuthPage from '../components/Auth/AuthPage.vue'
import FileConvertor from '../components/Files/FileConvertor.vue'
import YoutubeVideoConvertor from '../components/Youtube/YoutubeVideoConvertor.vue'
import TestPageVue from '@/components/TestPage.vue';
import SecretPageVue from '@/components/Auth/SecretPage.vue';
import { useFunctionsStore } from '@/stores/RouterStore';
import { useToast } from 'primevue/usetoast';
import download from '../components/Files/CloudPage.vue'
import newHomePage from '../components/newHomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthPage,
      beforeEnter: async (to, from, next) => {
        const authStore = useAuthStore();
        if (await authStore.checkUserToken()) {
          next({ name: 'home' });
        } else {
          next();
        }
      }
    },
    {
      path: '/testingstuff',
      name: 'test',
      component: TestPageVue,
      meta: { requiresAuth: false }
    },
    {
      path: '/newhome',
      name: 'newhome',
      component: newHomePage,
      meta: { requiresAuth: false }
    },
    {
      path: '/apps/file-convertor',
      name: 'fileConvertor',
      component: FileConvertor,
      meta: { requiresAuth: true }
    },
    {
      path: '/apps/youtube-video-convertor',
      name: 'youtubeVideo',
      component: YoutubeVideoConvertor,
      meta: { requiresAuth: true }
    },
    {
      path: '/f0a9f6ba-1d06-4678-b6af-89df03618e66',
      name: 'f0a9f6ba-1d06-4678-b6af-89df03618e66',
      component: SecretPageVue,
      meta: { requiresAuth: true }
    },
    {
      path: '/apps/download',
      name: 'download',
      component: download,
      meta: { requiresAuth: true }
    },
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const functionStore = useFunctionsStore();
  const toast = useToast(); // Stellen Sie sicher, dass Sie `useToast` importieren

  if (to.name !== 'auth') {
    functionStore.oldRoute = to.path;
  }

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (await authStore.checkUserToken()) {
      next();
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Authentifizierung erforderlich',
        detail: 'Für den Zugriff auf: "' + functionStore.oldRoute + '" ist eine Authentifizierung erfoderlich!',
        life: 3000
      });
      next({ name: 'auth' });
    }
  } else {
    next();
  }
});



export default router;
