<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, getPlayerStats } from '../services/api_service';

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
    
    // Vérification du format des données
    if (playerStats.value && playerStats.value.games && Array.isArray(playerStats.value.games)) {
      calculateStats(playerStats.value.games);
    } else {
      console.error("Format inattendu des données reçues :", playerStats.value);
      statsByLane.value = {};
      statsByChampion.value = {};
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du joueur:', error);
    statsByLane.value = {};
    statsByChampion.value = {};
  }
};


onMounted(fetchPlayers);
</script>

<template>
  <div class="player-stats">
    <h2>Statistiques des joueurs</h2>
    <select v-model="selectedPlayer">
      <option value="">Sélectionner un joueur</option>
      <option v-for="p in playersList" :key="p.name" :value="p.name">{{ p.name }}</option>
    </select>
    <button @click="fetchPlayerStats">Voir les stats</button>

    <div v-if="playerStats" class="stats">
      <h3>Statistiques globales de {{ playerStats.name }}</h3>
      <p><strong>Parties jouées :</strong> {{ playerStats.gamesPlayed }}</p>
      <p><strong>Winrate :</strong> {{ (playerStats.winRate * 100).toFixed(2) }}%</p>
      <p><strong>KDA global :</strong> {{ playerStats.totalKills }}/{{ playerStats.totalDeaths }}/{{ playerStats.totalAssists }}</p>
      <p><strong>KDA moyen :</strong> {{ (playerStats.totalKills / playerStats.gamesPlayed).toFixed(2) }}/{{ (playerStats.totalDeaths / playerStats.gamesPlayed).toFixed(2) }}/{{ (playerStats.totalAssists / playerStats.gamesPlayed).toFixed(2) }}</p>
      
      
      <h3>Statistiques par lane</h3>
      <ul>
        <li v-for="(stats, lane) in playerStats.statsByLane" :key="lane">
          <strong>{{ lane }} :</strong> {{stats.gamesPlayed}} games - KDA moyen: {{ (stats.kills / stats.gamesPlayed).toFixed(2) }}/{{ (stats.deaths / stats.gamesPlayed).toFixed(2) }}/{{ (stats.assists / stats.gamesPlayed).toFixed(2) }} - Winrate: {{ (stats.wins / stats.gamesPlayed * 100).toFixed(2) }}%
        </li>
      </ul>
      
      <h3>Statistiques par champion</h3>
      <ul>
        <li v-for="(stats, champ) in playerStats.statsByChampion" :key="champ">
          <strong>{{ champ }} :</strong> {{stats.gamesPlayed}} games - KDA moyen: {{ (stats.kills / stats.gamesPlayed).toFixed(2) }}/{{ (stats.deaths / stats.gamesPlayed).toFixed(2) }}/{{ (stats.assists / stats.gamesPlayed).toFixed(2) }} - Winrate: {{ (stats.wins / stats.gamesPlayed * 100).toFixed(2) }}%
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.player-stats {
  max-width: 700px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.stats {
  margin-top: 20px;
}
select, button {
  padding: 5px;
  font-size: 14px;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  padding: 5px;
  border-bottom: 1px solid #ccc;
}
</style>
