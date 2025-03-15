<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, getPlayerStats, recalculateStats  } from '../services/api_service';

const playersList = ref([]);
const selectedPlayer = ref('');
const playerStats = ref(null);

const fetchPlayers = async () => {
  try {
    playersList.value = await getAllPlayers();
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
  }
};

const fetchPlayerStats = async () => {
  if (!selectedPlayer.value) return;
  try {
    playerStats.value = await getPlayerStats(selectedPlayer.value);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du joueur:', error);
  }
};

// Fonction pour récupérer l'icône de lane
const getLaneIcon = (lane) => {
  const extension = lane === 'adc' ? 'png' : 'webp';
  return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
};

const recalculateStatsTrigger = async () => {
  try {
    await recalculateStats();
    alert("Les statistiques ont été recalculées avec succès !");
  } catch (error) {
    console.error("Erreur lors du recalcul des stats:", error);
  }
};


// Fonction pour formater le nom du champion pour l'URL
const formatChampionName = (champ) => {
  return champ
    .replace(/__/g, '.') // Remplace "__" par "."
    .replace(/(?<!_)_(?!_)/g, ' '); // Remplace un seul "_" par un espace
};


const formatChampionImageName = (champ) => {
  return champ
    .replace(/Wukong/i, 'MonkeyKing') // Remplace Wukong par MonkeyKing
    .replace(/K'Sante/i, 'KSante') // Remplace K'Sante par KSante
    .replace(/\s+/g, '')   // Supprime les espaces
    .replace(/_/g, '')     // Supprime les underscores
    .replace(/\./g, '')    // Supprime les points
    .replace(/'./g, match => match[1].toLowerCase()) // Assure que la lettre après ' est minuscule
    .replace(/'/g, ''); // Supprime les apostrophes après modification
};

onMounted(fetchPlayers);
</script>

<template>
  <div class="player-stats">
    <h2 class="text-2xl font-semibold text-center text-gray-700 mb-6">Statistiques des joueurs</h2>

    <div class="flex justify-center gap-4">
      <select v-model="selectedPlayer" class="p-2 border rounded-md shadow-sm bg-white text-gray-700">
        <option value="">Sélectionner un joueur</option>
        <option v-for="p in playersList" :key="p.name" :value="p.name">{{ p.name }}</option>
      </select>
      <button @click="fetchPlayerStats" class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">
        Voir les stats
      </button>
      <button @click="recalculateStatsTrigger" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
        🔄 Recalculer les Stats
      </button>

    </div>

    <div v-if="playerStats" class="stats mt-8 p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h3 class="text-xl font-semibold text-gray-800">{{ playerStats.name }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <!-- Statistiques Globales -->
        <div class="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 class="text-lg font-medium text-gray-800">Statistiques Globales</h4>
          <p><strong>Parties jouées :</strong> {{ playerStats.gamesPlayed }}</p>
          <p><strong>Winrate :</strong> <span class="text-gray-700 font-medium">{{ (playerStats.winRate * 100).toFixed(2) }}%</span></p>
          <p><strong>KDA global :</strong> {{ playerStats.totalKills }}/{{ playerStats.totalDeaths }}/{{ playerStats.totalAssists }}</p>
          <p><strong>KDA moyen :</strong> {{ (playerStats.totalKills / playerStats.gamesPlayed).toFixed(2) }}/{{ (playerStats.totalDeaths / playerStats.gamesPlayed).toFixed(2) }}/{{ (playerStats.totalAssists / playerStats.gamesPlayed).toFixed(2) }}</p>
        </div>

       <!-- Statistiques par Lane avec icônes -->
      <div class="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 class="text-lg font-medium text-gray-800">Statistiques par Lane</h4>
        <ul class="flex flex-col gap-3">
          <li v-for="(stats, lane) in playerStats.statsByLane" 
              :key="lane" 
              class="p-3 bg-white rounded-md shadow-xs border border-gray-200 flex items-center gap-3 justify-between flex-wrap">
            
            <!-- Icône de la lane -->
            <div class="flex items-center gap-3 min-w-0">
              <img :src="getLaneIcon(lane)" :alt="lane" class="w-8 h-8 object-cover">
              <strong class="capitalize text-gray-700">{{ lane }}</strong>
            </div>

            <!-- Stats de la lane -->
            <div class="flex flex-col text-sm min-w-0">
              <p>{{ stats.gamesPlayed }} games</p>
              <p class="text-gray-600">KDA: {{ (stats.kills / stats.gamesPlayed).toFixed(2) }}/{{ (stats.deaths / stats.gamesPlayed).toFixed(2) }}/{{ (stats.assists / stats.gamesPlayed).toFixed(2) }}</p>
            </div>

            <!-- Winrate -->
            <span class="text-gray-700 font-medium text-sm">{{ (stats.wins / stats.gamesPlayed * 100).toFixed(2) }}% Winrate</span>
          </li>
        </ul>
      </div>

      </div>

      <!-- Statistiques par Champion -->
      <div class="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 mt-6">
        <h4 class="text-lg font-medium text-gray-800">Statistiques par Champion</h4>
        <ul class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <li v-for="(stats, champ) in playerStats.statsByChampion" :key="champ" class="p-3 bg-white rounded-md shadow-xs border border-gray-200 flex flex-col items-center">
            <img :src="`https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formatChampionImageName(champ)}.png`" 
                 :alt="champ" class="w-16 h-16 object-cover rounded-lg">
            <strong class="text-gray-700 mt-2">{{ formatChampionName(champ) }}</strong>
            <p class="text-sm">{{ stats.gamesPlayed }} games</p>
            <p class="text-sm text-gray-600">KDA: {{ (stats.kills / stats.gamesPlayed).toFixed(2) }}/{{ (stats.deaths / stats.gamesPlayed).toFixed(2) }}/{{ (stats.assists / stats.gamesPlayed).toFixed(2) }}</p>
            <p class="text-sm text-gray-700">Winrate: {{ (stats.wins / stats.gamesPlayed * 100).toFixed(2) }}%</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-stats {
  max-width: 800px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.stats {
  background: white;
  border-radius: 10px;
}
select, button {
  padding: 10px;
  font-size: 16px;
  border-radius: 8px;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  padding: 5px;
  border-bottom: 1px solid #ddd;
}
</style>
