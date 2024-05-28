import { createApp } from 'vue'
import { createPinia } from 'pinia'

import Header from './Header.vue'
import router from './router'
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import FileUpload from 'primevue/fileupload'
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Button from 'primevue/button'
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import MegaMenu from 'primevue/megamenu';
import Badge from 'primevue/badge';
import Avatar from 'primevue/avatar';
import Menubar from 'primevue/menubar';
import Menu from 'primevue/menu';
import ProgressBar from 'primevue/progressbar';
import Dropdown from 'primevue/dropdown';
import RadioButton from 'primevue/radiobutton';
import InputSwitch from 'primevue/inputswitch'

import 'primevue/resources/themes/lara-dark-purple/theme.css'
import 'primeicons/primeicons.css'
import 'primevue/resources/primevue.min.css'
import 'primeflex/primeflex.css';


const app = createApp(Header)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, { ripple: true });
app.use(ToastService);

app.component('InputSwitch', InputSwitch)
app.component('RadioButton', RadioButton)
app.component('Dropdown', Dropdown)
app.component('ProgressBar', ProgressBar)
app.component('Menu', Menu)
app.component('Badge', Badge)
app.component('Avatar', Avatar)
app.component('Menubar', Menubar)
app.component('MegaMenu', MegaMenu)
app.component('Password', Password)
app.component('Divider', Divider)
app.component('Card', Card)
app.component('FileUpload', FileUpload)
app.component('Button', Button);
app.component('InputText', InputText);
app.component('Toast', Toast);

const savedToken = localStorage.getItem('userToken');
if (savedToken) {
  localStorage.setItem('userToken', savedToken)}

app.mount('#app')
