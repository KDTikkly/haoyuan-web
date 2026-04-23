import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import './assets/css/main.css'

import HomeView from './views/HomeView.vue'
import ExperienceView from './views/ExperienceView.vue'
import ProjectsView from './views/ProjectsView.vue'
import GamingView from './views/GamingView.vue'
import ResumeView from './views/ResumeView.vue'
import AdminView from './views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/experience', name: 'experience', component: ExperienceView },
    { path: '/projects', name: 'projects', component: ProjectsView },
    { path: '/gaming', name: 'gaming', component: GamingView },
    { path: '/resume', name: 'resume', component: ResumeView },
    { path: '/hidden-admin', name: 'admin', component: AdminView },
  ],
  scrollBehavior: () => ({ top: 0 })
})

createApp(App).use(router).use(i18n).mount('#app')
