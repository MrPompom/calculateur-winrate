<script setup>
import { ref, onMounted } from 'vue';
import { getAllGames } from '../services/api_service';

const gamesList = ref([]);
const isLoading = ref(true);

const fetchGames = async () => {
  try {
    gamesList.value = await getAllGames();
  } catch (error) {
    console.error('Erreur lors de la récupération des games:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchGames);
</script>

<template>
  <div class="game-history">
    <h2>Historique des Games</h2>
    <div v-if="isLoading">Chargement des games...</div>
    <div v-else>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Équipe Gagnante</th>
            <th>Équipe Bleue (Joueurs)</th>
            <th>Équipe Rouge (Joueurs)</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="game in gamesList" :key="game._id">
            <td>{{ game._id }}</td>
            <td :class="{'blue-win': game.winningTeam === 'Blue', 'red-win': game.winningTeam === 'Red'}">
              {{ game.winningTeam }}
            </td>
            <td>
              <ul>
                <li v-for="player in game.players.filter(p => p.side === 'Blue')" :key="player.playerId">
                  <strong>{{ player.playerId.name }}</strong> - {{ player.champion }} ({{ player.kills }}/{{ player.deaths }}/{{ player.assists }})
                </li>
              </ul>
            </td>
            <td>
              <ul>
                <li v-for="player in game.players.filter(p => p.side === 'Red')" :key="player.playerId">
                  <strong>{{ player.playerId.name }}</strong> - {{ player.champion }} ({{ player.kills }}/{{ player.deaths }}/{{ player.assists }})
                </li>
              </ul>
            </td>
            <td>{{ new Date(game.createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
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
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
th {
  background-color: #f4f4f4;
}
.blue-win {
  color: blue;
  font-weight: bold;
}
.red-win {
  color: red;
  font-weight: bold;
}
</style>