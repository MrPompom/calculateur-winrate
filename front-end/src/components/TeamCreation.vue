<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, balanceTeams, balanceTeamsWithLanes } from '../services/api_service';

const playersList = ref([]);
const selectedPlayers = ref([]);
const teams = ref({ blue: [], red: [] });
const balanceTeamsOption = ref(false);
const assignLanes = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

// Liste des lanes possibles
const lanes = ['top', 'jungle', 'mid', 'adc', 'support'];

// Récupération des joueurs
const fetchPlayers = async () => {
  try {
    playersList.value = await getAllPlayers();
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
  }
};

// Ajouter ou retirer un joueur de la sélection
const togglePlayerSelection = (player) => {
  const index = selectedPlayers.value.findIndex(p => p._id === player._id);
  if (index !== -1) {
    selectedPlayers.value.splice(index, 1);
  } else if (selectedPlayers.value.length < 10) {
    selectedPlayers.value.push(player);
  }
};

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (lane) => {
  if (!lane) return '';
  const extension = lane === 'adc' ? 'png' : 'webp';
  return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
};

// Assigner des lanes de manière aléatoire
const assignRandomLanes = (players) => {
  let availableLanes = [...lanes];
  players.forEach(player => {
    if (availableLanes.length > 0) {
      player.lane = availableLanes.splice(Math.floor(Math.random() * availableLanes.length), 1)[0];
    } else {
      player.lane = lanes[Math.floor(Math.random() * lanes.length)];
    }
  });
};

// Création des équipes
const createTeamsRequest = async () => {
  if (selectedPlayers.value.length !== 10) {
    alert('Veuillez sélectionner exactement 10 joueurs.');
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    if (balanceTeamsOption.value && assignLanes.value) {
      const response = await balanceTeamsWithLanes(selectedPlayers.value);
      teams.value.blue = response?.blueTeam || [];
      teams.value.red = response?.redTeam || [];
    } else if (balanceTeamsOption.value) {
      const response = await balanceTeams(selectedPlayers.value);
      teams.value.blue = response?.blueTeam || [];
      teams.value.red = response?.redTeam || [];
    } else {
      // Mode aléatoire
      const shuffledPlayers = [...selectedPlayers.value].sort(() => Math.random() - 0.5);
      teams.value.blue = shuffledPlayers.slice(0, 5);
      teams.value.red = shuffledPlayers.slice(5, 10);

      if (assignLanes.value) {
        assignRandomLanes(teams.value.blue);
        assignRandomLanes(teams.value.red);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création des équipes:', error);
    errorMessage.value = "Une erreur est survenue lors de la création des équipes.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchPlayers);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg flex gap-6">
    <!-- Liste des joueurs -->
    <div class="w-1/3 bg-gray-100 p-4 rounded-lg shadow-md">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Sélectionnez 10 joueurs</h2>

      <ul class="space-y-2">
        <li 
          v-for="player in playersList" 
          :key="player._id" 
          @click="togglePlayerSelection(player)"
          class="cursor-pointer p-3 bg-white rounded-md shadow-sm hover:bg-gray-200 transition flex justify-between items-center"
          :class="{ 'bg-blue-200': selectedPlayers.includes(player) }"
        >
          <span class="text-gray-800 font-medium">{{ player.name }}</span>
          <span class="text-sm text-gray-500">{{ (player.winRate * 100).toFixed(2) }}% WR</span>
        </li>
      </ul>
    </div>

    <!-- Joueurs sélectionnés et options -->
    <div class="w-2/3 p-6 bg-gray-50 rounded-lg shadow-md">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">Joueurs sélectionnés</h3>

      <div v-if="selectedPlayers.length === 0" class="text-gray-500 text-center">
        Aucun joueur sélectionné.
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div v-for="player in selectedPlayers" :key="player._id" class="p-3 bg-white shadow rounded-md flex justify-between items-center">
          <span class="text-gray-800 font-medium">{{ player.name }}</span>
          <button @click="togglePlayerSelection(player)" class="text-red-500 hover:text-red-700">❌</button>
        </div>
      </div>

      <!-- Options d'équilibrage -->
      <div class="flex gap-6 justify-center mt-6">
        <label class="flex items-center gap-2 text-gray-700">
          <input type="checkbox" v-model="assignLanes" class="form-checkbox h-5 w-5 text-blue-600">
          Assigner les lanes
        </label>
        <label class="flex items-center gap-2 text-gray-700">
          <input type="checkbox" v-model="balanceTeamsOption" class="form-checkbox h-5 w-5 text-green-600">
          Équilibrer les équipes
        </label>
      </div>

      <!-- Bouton de génération -->
      <div class="text-center mt-6">
        <button 
          @click="createTeamsRequest" 
          class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          :disabled="selectedPlayers.length !== 10"
        >
          {{ isLoading ? "Génération..." : "Générer les équipes" }}
        </button>
      </div>

      <div v-if="errorMessage" class="text-center text-red-600 font-semibold mt-4">
        {{ errorMessage }}
      </div>
    </div>
  </div>

  <!-- Affichage des équipes générées -->
  <div v-if="teams.blue.length && teams.red.length" class="max-w-6xl mx-auto mt-6 p-6 bg-white shadow-md rounded-lg">
    <h2 class="text-xl font-bold text-center text-gray-800 mb-4">Équipes Générées</h2>

    <div class="grid grid-cols-2 gap-6">
      <!-- Équipe Bleue -->
      <div class="bg-blue-50 p-4 rounded-lg shadow-md">
        <h3 class="text-xl font-semibold text-blue-700 mb-4">Équipe Bleue</h3>
        <ul>
          <li v-for="player in teams.blue" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
            <span class="text-gray-800 font-medium">{{ player.name }}</span>
            <span v-if="balanceTeamsOption" class="text-sm text-gray-600">{{ (player.winRate * 100).toFixed(2) }}% WR</span>
            <img v-if="assignLanes && player.lane" :src="getLaneIcon(player.lane)" class="w-6 h-6">
          </li>
        </ul>
      </div>
      
      <!-- Équipe Rouge -->
      <div class="bg-red-50 p-4 rounded-lg shadow-md">
        <h3 class="text-xl font-semibold text-red-700 mb-4">Équipe Rouge</h3>
        <ul>
          <li v-for="player in teams.red" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
            <span class="text-gray-800 font-medium">{{ player.name }}</span>
            <span v-if="balanceTeamsOption" class="text-sm text-gray-600">{{ (player.winRate * 100).toFixed(2) }}% WR</span>
            <img v-if="assignLanes && player.lane" :src="getLaneIcon(player.lane)" class="w-6 h-6">
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
