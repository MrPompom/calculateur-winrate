<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, getPlayerStats, recalculateStats } from '../services/api_service';

const playersList = ref([]);
const selectedPlayer = ref(null);
const playerStats = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");
const isRecalculating = ref(false);

// Récupération de la liste des joueurs
const fetchPlayers = async () => {
  try {
    playersList.value = await getAllPlayers();
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
  }
};

// Récupération des statistiques d'un joueur
const fetchPlayerStats = async (player) => {
  if (!player) return;
  isLoading.value = true;
  errorMessage.value = "";
  selectedPlayer.value = player;

  try {
    playerStats.value = await getPlayerStats(player.name);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du joueur:', error);
    errorMessage.value = "Impossible de charger les statistiques.";
  } finally {
    isLoading.value = false;
  }
};

// Recalculer toutes les statistiques
const handleRecalculateStats = async () => {
  isRecalculating.value = true;
  try {
    await recalculateStats();
    await fetchPlayers();
    if (selectedPlayer.value) {
      await fetchPlayerStats(selectedPlayer.value);
    }
    alert("Les statistiques ont été recalculées avec succès !");
  } catch (error) {
    console.error("Erreur lors du recalcul des stats :", error);
    alert("Une erreur est survenue lors du recalcul des statistiques.");
  } finally {
    isRecalculating.value = false;
  }
};

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (lane) => {
  if (!lane) return '';
  const extension = lane === 'adc' ? 'png' : 'webp';
  return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
};

// Fonction pour formater le nom des champions pour les images
const formatChampionImageName = (champ) => {
  return champ
    .replace(/Wukong/i, 'MonkeyKing') // Remplace Wukong par MonkeyKing
    .replace(/Vel'Koz/i, 'Velkoz') // Remplace Wukong par MonkeyKing
    .replace(/Cho'Gath/i, 'Chogath') // Remplace Wukong par MonkeyKing
    .replace(/\s+/g, '')   // Supprime les espaces
    .replace(/_/g, '')     // Supprime les underscores
    .replace(/'./g, match => match.toUpperCase()) // Transforme la lettre après ' en majuscule
    .replace(/'/g, ''); // Supprime les apostrophes après modification
};

onMounted(fetchPlayers);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg flex gap-6">
    <!-- Liste des joueurs -->
    <div class="w-1/3 bg-gray-100 p-4 rounded-lg shadow-md">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Liste des Joueurs</h2>
      
      <!-- Bouton de recalcul -->
      <button 
        @click="handleRecalculateStats" 
        class="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition mb-4"
        :disabled="isRecalculating"
      >
        {{ isRecalculating ? "Recalcul en cours..." : "Recalculer les statistiques" }}
      </button>

      <ul class="space-y-2">
        <li 
          v-for="player in playersList" 
          :key="player._id" 
          @click="fetchPlayerStats(player)"
          class="cursor-pointer p-3 bg-white rounded-md shadow-sm hover:bg-gray-200 transition flex justify-between items-center"
        >
          <span class="text-gray-800 font-medium">{{ player.name }}</span>
          <span class="text-sm text-gray-500">{{ (player.winRate * 100).toFixed(2) }}% WR</span>
        </li>
      </ul>
    </div>

    <!-- Affichage des statistiques -->
    <div class="w-2/3 p-6 bg-gray-50 rounded-lg shadow-md">
      <div v-if="isLoading" class="text-center text-gray-500">Chargement...</div>
      <div v-else-if="errorMessage" class="text-center text-red-500">{{ errorMessage }}</div>
      <div v-else-if="playerStats">
        <h3 class="text-2xl font-semibold text-gray-800">{{ playerStats.name }}</h3>

        <!-- Statistiques globales -->
        <div class="bg-gray-100 p-4 rounded-lg shadow-sm mt-4">
          <h4 class="text-lg font-medium text-gray-800">Statistiques Globales</h4>
          <p><strong>Parties jouées :</strong> {{ playerStats.gamesPlayed }}</p>
          <p><strong>Winrate :</strong> <span class="text-blue-600 font-bold">{{ (playerStats.winRate * 100).toFixed(2) }}%</span></p>
          <p><strong>KDA global :</strong> {{ playerStats.totalKills }}/{{ playerStats.totalDeaths }}/{{ playerStats.totalAssists }}</p>
        </div>

        <!-- Statistiques par Lane -->
        <div class="bg-gray-100 p-4 rounded-lg shadow-sm mt-4">
          <h4 class="text-lg font-medium text-gray-800">Statistiques par Lane</h4>
          <ul v-if="playerStats.statsByLane && Object.keys(playerStats.statsByLane).length > 0" class="mt-2">
            <li v-for="(stats, lane) in playerStats.statsByLane" :key="lane" class="flex items-center gap-4 p-2 bg-white shadow rounded-md">
              <img :src="getLaneIcon(lane)" :alt="lane" class="w-6 h-6">
              <span class="capitalize font-semibold text-gray-800">{{ lane }}</span> :
              <span class="text-sm text-gray-600"> {{ stats.gamesPlayed }} games | 
                KDA: {{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }} | 
                WR: <span class="text-blue-600">{{ (stats.winRate * 100).toFixed(2) }}%</span>
              </span>
            </li>
          </ul>
          <p v-else class="text-gray-500 text-sm">Aucune statistique disponible</p>
        </div>

        <!-- Statistiques par Champion -->
        <div class="bg-gray-100 p-4 rounded-lg shadow-sm mt-4">
          <h4 class="text-lg font-medium text-gray-800">Statistiques par Champion</h4>
          <ul v-if="playerStats.statsByChampion && Object.keys(playerStats.statsByChampion).length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            <li v-for="(stats, champ) in playerStats.statsByChampion" :key="champ" class="p-3 bg-white shadow rounded-md">
              <div class="flex items-center gap-4">
                <img :src="`https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formatChampionImageName(champ)}.png`" :alt="champ" class="w-10 h-10">
                <div>
                  <span class="font-semibold">{{ champ }}</span>
                  <p class="text-xs text-gray-600"> {{ stats.gamesPlayed }} games | 
                    KDA: {{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }} | 
                    WR: <span class="text-blue-600">{{ (stats.winRate * 100).toFixed(2) }}%</span>
                  </p>
                </div>
              </div>
            </li>
          </ul>
          <p v-else class="text-gray-500 text-sm">Aucune statistique disponible</p>
        </div>
      </div>
    </div>
  </div>
</template>
