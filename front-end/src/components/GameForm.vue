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
  winningTeam: ''
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

onMounted(() => {
  fetchPlayers();
  loadChampions();
});
</script>

<template>
  <div class="game-form">
    <h2>Ajouter une partie</h2>

    <div class="player-creation">
      <input v-model="newPlayerName" placeholder="Nom du joueur" />
      <button @click="createPlayer">Créer joueur</button>
    </div>
    
    <div class="teams">
      <h3>Équipe Bleue</h3>
      <div v-for="(player, index) in gameData.blueTeam" :key="index" class="player">
        <ModelSelect v-model="player.player" :options="playersList.map(p => ({ value: p.name, text: p.name }))" placeholder="Sélectionner un joueur" class="wide-select" />
        <ModelSelect v-model="player.champion" :options="championsList" placeholder="Sélectionner un champion" class="wide-select" />
        <input type="number" v-model.number="player.kills" placeholder="Kills" />
        <input type="number" v-model.number="player.deaths" placeholder="Deaths" />
        <input type="number" v-model.number="player.assists" placeholder="Assists" />
        <select v-model="player.lane">
          <option value="">Sélectionner une lane</option>
          <option v-for="l in lanesList" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
    </div>
    
    <div class="teams">
      <h3>Équipe Rouge</h3>
      <div v-for="(player, index) in gameData.redTeam" :key="index" class="player">
        <ModelSelect v-model="player.player" :options="playersList.map(p => ({ value: p.name, text: p.name }))" placeholder="Sélectionner un joueur" class="wide-select" />
        <ModelSelect v-model="player.champion" :options="championsList" placeholder="Sélectionner un champion" class="wide-select" />
        <input type="number" v-model.number="player.kills" placeholder="Kills" />
        <input type="number" v-model.number="player.deaths" placeholder="Deaths" />
        <input type="number" v-model.number="player.assists" placeholder="Assists" />
        <select v-model="player.lane">
          <option value="">Sélectionner une lane</option>
          <option v-for="l in lanesList" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
    </div>
    
    <label>Équipe gagnante :</label>
    <select v-model="gameData.winningTeam">
      <option value="Blue">Blue Team</option>
      <option value="Red">Red Team</option>
    </select>
    
    <button @click="submitGame">Ajouter la game</button>
  </div>
</template>

<style scoped>
.game-form {
  max-width: 900px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.teams {
  margin-bottom: 20px;
}
.player {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.player-creation {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
input, select, button, .wide-select {
  padding: 8px;
  font-size: 14px;
  width: 100px;
}
</style>
