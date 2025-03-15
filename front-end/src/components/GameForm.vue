<script setup>
import { ref, onMounted } from 'vue';
import { getAllPlayers, addGame, addPlayer } from '../services/api_service';
import championsData from '../data/champions.json';
import { ModelSelect } from 'vue-search-select';
import 'vue-search-select/dist/VueSearchSelect.css';

const playersList = ref([]);
const newPlayerName = ref('');
const championsList = ref([]);
const lanesList = ['top', 'mid', 'jungle', 'adc', 'support'];

const gameData = ref({
  blueTeam: Array(5).fill().map(() => ({ player: '', champion: '', kills: 0, deaths: 0, assists: 0, lane: '', won: false })),
  redTeam: Array(5).fill().map(() => ({ player: '', champion: '', kills: 0, deaths: 0, assists: 0, lane: '', won: false })),
  winningTeam: '' // Stocke l'équipe gagnante
});

const fetchPlayers = async () => {
  try {
    playersList.value = await getAllPlayers();
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
  }
};

const loadChampions = () => {
  championsList.value = championsData.champions.map(c => ({ value: c, text: c }));
};

const createPlayer = async () => {
  if (!newPlayerName.value) return;
  try {
    await addPlayer(newPlayerName.value);
    newPlayerName.value = '';
    fetchPlayers();
  } catch (error) {
    console.error('Erreur lors de la création du joueur', error);
  }
};

const submitGame = async () => {
  const formattedPlayers = [
    ...gameData.value.blueTeam.map(player => ({
      name: player.player,
      champion: player.champion,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      side: "Blue",
      lane: player.lane,
      won: gameData.value.winningTeam === "Blue"
    })),
    ...gameData.value.redTeam.map(player => ({
      name: player.player,
      champion: player.champion,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      side: "Red",
      lane: player.lane,
      won: gameData.value.winningTeam === "Red"
    }))
  ];

  console.log("Données envoyées :", JSON.stringify({ players: formattedPlayers, winningTeam: gameData.value.winningTeam }, null, 2));

  try {
    await addGame({ players: formattedPlayers, winningTeam: gameData.value.winningTeam });
    alert('Game ajoutée avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la game', error);
  }
};

// Bloquer les valeurs négatives et permettre la molette
const ensurePositiveValue = (event) => {
  if (event.target.value < 0) {
    event.target.value = 0;
  }
};

// Activer la molette sur les inputs numériques sans scroller la page
const allowScrollOnInputs = () => {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('wheel', (event) => {
      event.stopPropagation();
    });
  });
};

onMounted(() => {
  fetchPlayers();
  loadChampions();
  allowScrollOnInputs();
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
    <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Ajouter une partie</h2>

    <!-- Création de Joueur -->
    <div class="flex gap-4 mb-6">
      <input v-model="newPlayerName" placeholder="Nom du joueur" class="p-2 border rounded-md shadow-sm w-full">
      <button @click="createPlayer" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Créer</button>
    </div>

    <!-- Sélection du gagnant -->
    <div class="flex justify-center mb-6">
      <label class="text-lg font-medium mr-4">Équipe Gagnante :</label>
      <select v-model="gameData.winningTeam" class="p-2 border rounded-md shadow-sm">
        <option value="">Sélectionner une équipe</option>
        <option value="Blue">Équipe Bleue</option>
        <option value="Red">Équipe Rouge</option>
      </select>
    </div>

    <!-- Équipes -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Équipe Bleue -->
      <div class="bg-blue-50 p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-blue-700 mb-4">Équipe Bleue</h3>
        <div v-for="(player, index) in gameData.blueTeam" :key="index" class="flex flex-wrap gap-3 items-center mb-3">
          <ModelSelect v-model="player.player" :options="playersList.map(p => ({ value: p.name, text: p.name }))" placeholder="Joueur" class="w-40" />
          <ModelSelect v-model="player.champion" :options="championsList" placeholder="Champion" class="w-40" />

          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Kills</label>
            <input type="number" v-model.number="player.kills" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>
          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Deaths</label>
            <input type="number" v-model.number="player.deaths" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>
          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Assists</label>
            <input type="number" v-model.number="player.assists" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>

          <select v-model="player.lane" class="p-2 border rounded-md shadow-sm">
            <option value="">Lane</option>
            <option v-for="l in lanesList" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
      </div>

      <!-- Équipe Rouge -->
      <div class="bg-red-50 p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-red-700 mb-4">Équipe Rouge</h3>
        <div v-for="(player, index) in gameData.redTeam" :key="index" class="flex flex-wrap gap-3 items-center mb-3">
          <ModelSelect v-model="player.player" :options="playersList.map(p => ({ value: p.name, text: p.name }))" placeholder="Joueur" class="w-40" />
          <ModelSelect v-model="player.champion" :options="championsList" placeholder="Champion" class="w-40" />

          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Kills</label>
            <input type="number" v-model.number="player.kills" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>
          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Deaths</label>
            <input type="number" v-model.number="player.deaths" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>
          <div class="flex flex-col items-center">
            <label class="text-xs text-gray-500">Assists</label>
            <input type="number" v-model.number="player.assists" min="0" @input="ensurePositiveValue" class="w-12 p-2 border rounded-md shadow-sm text-center">
          </div>

          <select v-model="player.lane" class="p-2 border rounded-md shadow-sm">
            <option value="">Lane</option>
            <option v-for="l in lanesList" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="text-center mt-6">
      <button @click="submitGame" class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition">Ajouter la game</button>
    </div>
  </div>
</template>
