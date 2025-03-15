<script setup>
import { ref, onMounted } from 'vue';
import { getAllGames } from '../services/api_service';

const gamesList = ref([]);
const isLoading = ref(true);
const expandedGames = ref({});

// Récupération des games
const fetchGames = async () => {
  try {
    gamesList.value = await getAllGames();
  } catch (error) {
    console.error('Erreur lors de la récupération des games:', error);
  } finally {
    isLoading.value = false;
  }
};

// Fonction pour récupérer les icônes des champions
const getChampionIcon = (champion) => {
  return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${champion.replace(/\s+/g, '_')}.png`;
};

// Fonction pour récupérer les icônes des lanes
const getLaneIcon = (lane) => {
  const extension = lane === 'adc' ? 'png' : 'webp';
  return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
};

// Basculer l'affichage des détails d’une game
const toggleGameDetails = (gameId) => {
  expandedGames.value[gameId] = !expandedGames.value[gameId];
};

// Fonction pour formater la date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
         ' - ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

onMounted(fetchGames);
</script>

<template>
  <div class="game-history max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Historique des Games</h2>

    <div v-if="isLoading" class="text-center text-gray-600">Chargement des games...</div>
    <div v-else>
      <div v-for="game in gamesList" :key="game._id" class="border rounded-lg shadow-md mb-4">
        <!-- En-tête de la partie -->
        <div class="p-4 flex justify-between items-center bg-gray-100 rounded-t-lg">
          <p class="text-gray-700 font-semibold">{{ formatDate(game.createdAt) }}</p>
          <p class="text-sm font-bold" :class="{'text-blue-600': game.winningTeam === 'Blue', 'text-red-600': game.winningTeam === 'Red'}">
            Victoire: {{ game.winningTeam }}
          </p>
          <button @click="toggleGameDetails(game._id)" class="text-sm px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">
            {{ expandedGames[game._id] ? "Masquer" : "Voir détails" }}
          </button>
        </div>

        <!-- Détails de la partie (masqué par défaut) -->
        <div v-if="expandedGames[game._id]" class="p-4 bg-white">
          <!-- Équipe Bleue -->
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-blue-600">Équipe Bleue</h3>
            <ul class="grid grid-cols-2 gap-4">
              <li v-for="player in game.players.filter(p => p.side === 'Blue')" :key="player.playerId" class="flex items-center gap-3 p-3 bg-gray-50 rounded-md shadow-sm">
                <img :src="getChampionIcon(player.champion)" :alt="player.champion" class="w-12 h-12 object-cover rounded-lg">
                <div class="flex flex-col">
                  <span class="font-semibold text-gray-800">{{ player.playerId.name }}</span>
                  <span class="text-sm text-gray-600">{{ player.champion }}</span>
                  <span class="text-xs text-gray-500">KDA: {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}</span>
                </div>
                <img :src="getLaneIcon(player.lane)" :alt="player.lane" class="w-6 h-6 ml-auto">
              </li>
            </ul>
          </div>

          <!-- Équipe Rouge -->
          <div>
            <h3 class="text-lg font-semibold text-red-600">Équipe Rouge</h3>
            <ul class="grid grid-cols-2 gap-4">
              <li v-for="player in game.players.filter(p => p.side === 'Red')" :key="player.playerId" class="flex items-center gap-3 p-3 bg-gray-50 rounded-md shadow-sm">
                <img :src="getChampionIcon(player.champion)" :alt="player.champion" class="w-12 h-12 object-cover rounded-lg">
                <div class="flex flex-col">
                  <span class="font-semibold text-gray-800">{{ player.playerId.name }}</span>
                  <span class="text-sm text-gray-600">{{ player.champion }}</span>
                  <span class="text-xs text-gray-500">KDA: {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}</span>
                </div>
                <img :src="getLaneIcon(player.lane)" :alt="player.lane" class="w-6 h-6 ml-auto">
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-history {
  max-width: 900px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>
