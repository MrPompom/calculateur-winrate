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

onMounted(fetchPlayers);
</script>

<template>
  <div class="team-creation">
    <h2>Création des équipes</h2>
    <p>Sélectionnez 10 joueurs :</p>
    <multiselect 
      v-model="selectedPlayers" 
      :options="playersList" 
      label="name" 
      track-by="_id" 
      placeholder="Sélectionner des joueurs..." 
      multiple
    />

    <div>
      <label><input type="checkbox" v-model="assignLanes"> Assigner les lanes</label>
      <label><input type="checkbox" v-model="balanceTeams"> Équilibrer les équipes en fonction du winrate</label>
    </div>
    
    <button @click="createTeamsRequest">Créer les équipes</button>
    
    <div v-if="teams.blue.length && teams.red.length" class="teams">
      <h3>Équipe Bleue</h3>
      <ul>
        <li v-for="player in teams.blue" :key="player.id">
          {{ player.name }}
          <span v-if="assignLanes"> - Lane: {{ player.lane }}</span>
          <span v-if="assignLanes && balanceTeams"> (Winrate sur lane: {{ player.laneWinRate }}%)</span>
          <span v-if="balanceTeams"> - Winrate global: {{ (player.winRate * 100).toFixed(2) }}%</span>
        </li>
      </ul>

      <h3>Équipe Rouge</h3>
      <ul>
        <li v-for="player in teams.red" :key="player.id">
          {{ player.name }}
          <span v-if="assignLanes"> - Lane: {{ player.lane }}</span>
          <span v-if="assignLanes && balanceTeams"> (Winrate sur lane: {{ player.laneWinRate }}%)</span>
          <span v-if="balanceTeams"> - Winrate global: {{ (player.winRate * 100).toFixed(2) }}%</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.team-creation {
  max-width: 700px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
button {
  margin-top: 10px;
  padding: 10px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}
button:hover {
  background-color: #45a049;
}
.teams {
  margin-top: 20px;
}
.teams ul {
  list-style: none;
  padding: 0;
}
.teams li {
  padding: 5px;
  border-bottom: 1px solid #ccc;
}
</style>
