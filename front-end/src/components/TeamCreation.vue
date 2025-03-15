<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, createTeams } from '../services/api_service';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.css';

const playersList = ref([]);
const selectedPlayers = ref([]);
const teams = ref({ blue: [], red: [] });
const balanceTeams = ref(false);
const assignLanes = ref(false);

const fetchPlayers = async () => {
  try {
    playersList.value = await getAllPlayers();
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
  }
};

const createTeamsRequest = async () => {
  if (selectedPlayers.value.length !== 10) {
    alert('Veuillez sélectionner exactement 10 joueurs.');
    return;
  }

  try {
    const response = await createTeams(selectedPlayers.value, assignLanes.value, balanceTeams.value);
    if (response) {
      teams.value.blue = response.blueTeam;
      teams.value.red = response.redTeam;
    }
  } catch (error) {
    console.error('Erreur lors de la création des équipes:', error);
  }
};

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (lane) => {
  const extension = lane === 'adc' ? 'png' : 'webp';
  return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
};
onMounted(fetchPlayers);
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
    <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Création des Équipes</h2>

    <!-- Sélection des joueurs -->
    <div class="mb-6">
      <p class="text-lg font-medium text-gray-700 mb-2">Sélectionnez 10 joueurs :</p>
      <Multiselect 
        v-model="selectedPlayers" 
        :options="playersList" 
        label="name" 
        track-by="_id" 
        placeholder="Sélectionner des joueurs..." 
        multiple
        class="w-full"
      />
    </div>

    <!-- Options d'équilibrage -->
    <div class="flex gap-6 justify-center mb-6">
      <label class="flex items-center gap-2 text-gray-700">
        <input type="checkbox" v-model="assignLanes" class="form-checkbox h-5 w-5 text-blue-600">
        Assigner les lanes
      </label>
      <label class="flex items-center gap-2 text-gray-700">
        <input type="checkbox" v-model="balanceTeams" class="form-checkbox h-5 w-5 text-green-600">
        Équilibrer les équipes
      </label>
    </div>

    <!-- Bouton de génération -->
    <div class="text-center mb-6">
      <button @click="createTeamsRequest" class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
        Générer les équipes
      </button>
    </div>

    <!-- Affichage des équipes -->
    <div v-if="teams.blue.length && teams.red.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Équipe Bleue -->
      <div class="bg-blue-50 p-4 rounded-lg shadow-md">
        <h3 class="text-xl font-semibold text-blue-700 mb-4">Équipe Bleue</h3>
        <ul>
          <li v-for="player in teams.blue" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800">{{ player.name }}</span>
              <img v-if="assignLanes" :src="getLaneIcon(player.lane)" :alt="player.lane" class="w-6 h-6">
            </div>
            <div class="text-sm text-gray-600">
              <span v-if="assignLanes && balanceTeams"> WR Lane: <span class="text-blue-600">{{ player.statsByLane && player.statsByLane[player.lane]?.gamesPlayed > 0 ? (player.statsByLane[player.lane].winRate * 100).toFixed(2) + '%' : '0%' }}</span></span>
              <span v-if="balanceTeams"> | WR Global: <span class="text-green-600">{{ (player.winRate * 100).toFixed(2) }}%</span></span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Équipe Rouge -->
      <div class="bg-red-50 p-4 rounded-lg shadow-md">
        <h3 class="text-xl font-semibold text-red-700 mb-4">Équipe Rouge</h3>
        <ul>
          <li v-for="player in teams.red" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800">{{ player.name }}</span>
              <img v-if="assignLanes" :src="getLaneIcon(player.lane)" :alt="player.lane" class="w-6 h-6 object-cover">
            </div>
            <div class="text-sm text-gray-600">
              <span v-if="assignLanes && balanceTeams"> WR Lane: <span class="text-red-600">{{ player.statsByLane && player.statsByLane[player.lane]?.gamesPlayed > 0 ? (player.statsByLane[player.lane].winRate * 100).toFixed(2) + '%' : '0%' }}</span></span>
              <span v-if="balanceTeams"> | WR Global: <span class="text-green-600">{{ (player.winRate * 100).toFixed(2) }}%</span></span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multiselect {
  max-width: 600px;
  margin: auto;
}
</style>
