import { createRouter, createWebHistory } from 'vue-router';
import GameForm from '../components/GameForm.vue';
import PlayerStats from '../components/PlayerStats.vue';
import GameHistory from '../components/GameHistory.vue';
import TeamCreation from '../components/TeamCreation.vue';

const routes = [
  { path: '/', component: GameForm },
  { path: '/stats', component: PlayerStats },
  { path: '/history', component: GameHistory },
  { path: '/teamcreation', component: TeamCreation }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;