<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { getAllPlayers, balanceTeams, balanceTeamsWithLanes } from '../services/api_service';
import { useToast } from 'vue-toastification';
import { TransitionGroup } from 'vue';

// Initialisation du système de notification
const toast = useToast();

  // États réactifs
const playersList = ref([]);
const selectedPlayers = ref([]);
const teams = ref({ blue: [], red: [], metrics: null });
const balanceTeamsOption = ref(true); // On active par défaut pour une meilleure UX
const assignLanes = ref(true);        // On active par défaut pour une meilleure UX
const isLoading = ref(false);
const errorMessage = ref("");
const expandedPlayers = ref({});
const searchQuery = ref("");
const sortCriteria = ref("name"); // 'name' ou 'winRate'
const sortDirection = ref("asc"); // 'asc' ou 'desc'
const activeTab = ref('selection'); // 'selection', 'teams'

// Liste des lanes possibles avec leurs icônes et descriptions
const lanes = [
  { value: 'top', label: 'Top', icon: 'top.webp', description: 'Solo lane, champions tanky ou bruisers' },
  { value: 'jungle', label: 'Jungle', icon: 'jungle.webp', description: 'Rôle qui parcourt la jungle et aide toutes les lanes' },
  { value: 'mid', label: 'Mid', icon: 'mid.webp', description: 'Lane centrale, souvent des mages ou assassins' },
  { value: 'adc', label: 'ADC', icon: 'adc.png', description: 'Carry AD, dégâts physiques à distance' },
  { value: 'support', label: 'Support', icon: 'support.webp', description: 'Soutien protégeant l\'ADC et aidant l\'équipe' }
];

// Récupération des joueurs
const fetchPlayers = async () => {
  try {
    isLoading.value = true;
    playersList.value = await getAllPlayers();
    toast.success(`${playersList.value.length} joueurs chargés avec succès`);
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
    toast.error('Impossible de charger la liste des joueurs');
    errorMessage.value = "Erreur de connexion au serveur. Veuillez réessayer plus tard.";
  } finally {
    isLoading.value = false;
  }
};

// Filtrer et trier les joueurs
const filteredAndSortedPlayers = computed(() => {
  let result = [...playersList.value];
  
  // Filtrage par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(player => 
      player.name.toLowerCase().includes(query)
    );
  }
  
  // Tri
  result.sort((a, b) => {
    let compareResult;
    
    if (sortCriteria.value === 'name') {
      compareResult = a.name.localeCompare(b.name);
    } else if (sortCriteria.value === 'winRate') {
      compareResult = a.winRate - b.winRate;
    }
    
    return sortDirection.value === 'asc' ? compareResult : -compareResult;
  });
  
  return result;
});

// Toggle le critère de tri
const toggleSort = (criteria) => {
  if (sortCriteria.value === criteria) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortCriteria.value = criteria;
    sortDirection.value = 'asc';
  }
};

// Ajouter ou retirer un joueur de la sélection
const togglePlayerSelection = (player) => {
  const index = selectedPlayers.value.findIndex(p => p.id === player._id);
  if (index !== -1) {
    selectedPlayers.value.splice(index, 1);
    delete expandedPlayers.value[player._id];
  } else if (selectedPlayers.value.length < 10) {
    selectedPlayers.value.push({
      id: player._id,
      name: player.name,
      winRate: player.winRate,
      primaryRole: null,
      secondaryRole: null
    });
    expandedPlayers.value[player._id] = false;
  } else {
    toast.warning("Vous avez déjà sélectionné 10 joueurs");
  }
};

// État pour savoir si un joueur est sélectionné
const isPlayerSelected = (playerId) => {
  return selectedPlayers.value.some(p => p.id === playerId);
};

// Fonction pour afficher/masquer les rôles d'un joueur
const togglePlayerDropdown = (playerId) => {
  expandedPlayers.value[playerId] = !expandedPlayers.value[playerId];
};

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (laneName) => {
  if (!laneName) return '';
  const lane = lanes.find(l => l.value === laneName);
  if (!lane) return '';
  return new URL(`../assets/${lane.icon}`, import.meta.url).href;
};

// Filtrer les options du rôle secondaire en fonction du rôle principal
const getAvailableSecondaryRoles = (player) => {
  return lanes.filter(lane => lane.value !== player.primaryRole);
};

// Assigner des lanes de manière aléatoire
const assignRandomLanes = (players) => {
  let availableLanes = [...lanes.map(lane => lane.value)];
  players.forEach(player => {
    if (availableLanes.length > 0) {
      player.lane = availableLanes.splice(Math.floor(Math.random() * availableLanes.length), 1)[0];
    } else {
      player.lane = lanes[Math.floor(Math.random() * lanes.length)].value;
    }
  });
};

// Fonction pour formater la date si nécessaire ailleurs dans l'application
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString();
};

// Création des équipes
const createTeamsRequest = async () => {
  if (selectedPlayers.value.length !== 10) {
    toast.error('Veuillez sélectionner exactement 10 joueurs.');
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    let response;
    
    if (balanceTeamsOption.value && assignLanes.value) {
      response = await balanceTeamsWithLanes(selectedPlayers.value);
      teams.value.blue = response?.blueTeam || [];
      teams.value.red = response?.redTeam || [];
      teams.value.metrics = response?.metrics || null;
    } else if (balanceTeamsOption.value) {
      response = await balanceTeams(selectedPlayers.value);
      teams.value.blue = response?.blueTeam || [];
      teams.value.red = response?.redTeam || [];
      teams.value.metrics = response?.metrics || null;
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
    
    // Passer automatiquement à l'affichage des équipes
    activeTab.value = 'teams';
    
    toast.success('Équipes générées avec succès !');
  } catch (error) {
    console.error('Erreur lors de la création des équipes:', error);
    errorMessage.value = "Une erreur est survenue lors de la création des équipes.";
    toast.error('Échec de la génération des équipes');
  } finally {
    isLoading.value = false;
  }
};

// Fonction pour remplir les rôles manquants automatiquement
const autoFillRoles = () => {
  // Mettre en place une distribution équilibrée des rôles
  const assignedPrimaryRoles = selectedPlayers.value
    .filter(player => player.primaryRole)
    .map(player => player.primaryRole);
  
  const missingRoles = lanes
    .map(lane => lane.value)
    .filter(lane => !assignedPrimaryRoles.includes(lane));
  
  // Assigner les rôles manquants aux joueurs sans rôle primaire
  const playersWithoutRole = selectedPlayers.value.filter(player => !player.primaryRole);
  
  playersWithoutRole.forEach((player, index) => {
    if (index < missingRoles.length) {
      player.primaryRole = missingRoles[index];
    }
  });
  
  toast.info('Rôles manquants assignés automatiquement');
};

// Réinitialiser la sélection de joueurs
const resetSelection = () => {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser la sélection ?')) {
    selectedPlayers.value = [];
    expandedPlayers.value = {};
  }
};

// Surveillance des rôles pour éviter les doublons
watch(
  selectedPlayers,
  (newPlayers) => {
    newPlayers.forEach((player) => {
      if (player.primaryRole === player.secondaryRole && player.secondaryRole !== null) {
        player.secondaryRole = null;
      }
    });
  },
  { deep: true }
);

onMounted(() => {
  fetchPlayers();
});
</script>

<template>
  <div class="max-w-7xl mx-auto p-4">
    <!-- En-tête avec onglets -->
    <div class="mb-6 flex justify-center border-b border-gray-200">
      <button 
        @click="activeTab = 'selection'" 
        class="px-6 py-3 text-lg font-medium transition-colors" 
        :class="activeTab === 'selection' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'"
      >
        Sélection
      </button>
      <button 
        @click="activeTab = 'teams'" 
        class="px-6 py-3 text-lg font-medium transition-colors" 
        :class="activeTab === 'teams' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'"
        :disabled="!teams.blue.length"
      >
        Équipes
      </button>
    </div>

    <!-- Onglet de sélection des joueurs -->
    <div v-if="activeTab === 'selection'">
      <div class="bg-white shadow-md rounded-lg overflow-hidden flex flex-col md:flex-row">
        <!-- Liste des joueurs -->
        <div class="w-full md:w-1/3 bg-gray-100 p-4 border-r border-gray-200">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Liste des joueurs</h2>
          
          <!-- Barre de recherche -->
          <div class="mb-4">
            <input 
              v-model="searchQuery" 
              class="w-full p-2 border rounded-md" 
              placeholder="Rechercher un joueur..." 
              type="search"
            />
          </div>
          
          <!-- En-tête de tri -->
          <div class="flex justify-between items-center mb-2 px-2 text-sm text-gray-600">
            <button @click="toggleSort('name')" class="flex items-center">
              Nom
              <span v-if="sortCriteria === 'name'" class="ml-1">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
            <button @click="toggleSort('winRate')" class="flex items-center">
              Win Rate
              <span v-if="sortCriteria === 'winRate'" class="ml-1">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
          </div>
          
          <!-- Liste des joueurs avec indicateur de chargement -->
          <div v-if="isLoading && !playersList.length" class="py-10 text-center text-gray-500">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p>Chargement des joueurs...</p>
          </div>
          
          <TransitionGroup 
            name="list" 
            tag="ul" 
            class="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
          >
            <li 
              v-for="player in filteredAndSortedPlayers" 
              :key="player._id" 
              @click="togglePlayerSelection(player)"
              class="cursor-pointer p-3 bg-white rounded-md shadow-sm hover:bg-gray-200 transition-colors flex justify-between items-center"
              :class="{ 'bg-blue-200 hover:bg-blue-300': isPlayerSelected(player._id) }"
            >
              <span class="text-gray-800 font-medium">{{ player.name }}</span>
              <span class="text-sm text-gray-500">{{ (player.winRate * 100).toFixed(2) }}% WR</span>
            </li>
          </TransitionGroup>

          <div v-if="!isLoading && filteredAndSortedPlayers.length === 0" class="py-4 text-center text-gray-500">
            Aucun joueur trouvé.
          </div>
        </div>

        <!-- Joueurs sélectionnés et options -->
        <div class="w-full md:w-2/3 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-800">Joueurs sélectionnés ({{ selectedPlayers.length }}/10)</h3>
            <button 
              @click="resetSelection" 
              class="text-sm text-red-500 hover:text-red-700 transition-colors"
              :disabled="selectedPlayers.length === 0"
            >
              Réinitialiser
            </button>
          </div>

          <div v-if="selectedPlayers.length === 0" class="text-gray-500 text-center py-10">
            <p>Aucun joueur sélectionné.</p>
            <p class="text-sm mt-2">Cliquez sur un joueur dans la liste pour le sélectionner.</p>
          </div>

          <TransitionGroup 
            name="list" 
            tag="div" 
            class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
          >
            <div v-for="player in selectedPlayers" :key="player.id" class="p-3 bg-white shadow rounded-md transition-all">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="text-gray-800 font-medium">{{ player.name }}</span>
                  <span v-if="player.primaryRole" class="flex-shrink-0">
                    <img :src="getLaneIcon(player.primaryRole)" class="w-4 h-4 inline-block" :title="player.primaryRole" />
                  </span>
                </div>
                <button @click.stop="togglePlayerSelection({_id: player.id})" class="text-red-500 hover:text-red-700">❌</button>
              </div>

              <!-- Bouton pour afficher/cacher les rôles -->
              <button @click.stop="togglePlayerDropdown(player.id)" class="w-full mt-2 text-gray-600 text-sm hover:underline">
                {{ expandedPlayers[player.id] ? "Masquer les rôles" : "Choisir les rôles" }}
              </button>

              <!-- Sélection des rôles avec transition -->
              <transition name="fade">
                <div v-if="expandedPlayers[player.id]" class="mt-2 space-y-2">
                  <div>
                    <label class="text-gray-600 text-sm">Rôle Principal :</label>
                    <select v-model="player.primaryRole" class="w-full p-2 border rounded-md mt-1">
                      <option value="">Aucun</option>
                      <option v-for="lane in lanes" :key="lane.value" :value="lane.value">
                        {{ lane.label }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="text-gray-600 text-sm">Rôle Secondaire :</label>
                    <select v-model="player.secondaryRole" class="w-full p-2 border rounded-md mt-1">
                      <option value="">Aucun</option>
                      <option v-for="lane in getAvailableSecondaryRoles(player)" :key="lane.value" :value="lane.value">
                        {{ lane.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </transition>
            </div>
          </TransitionGroup>

          <!-- Options d'équilibrage -->
          <div class="flex flex-col sm:flex-row sm:gap-6 justify-center mt-6 bg-gray-50 p-4 rounded-lg">
            <label class="flex items-center gap-2 text-gray-700 mb-2 sm:mb-0">
              <input type="checkbox" v-model="assignLanes" class="form-checkbox h-5 w-5 text-blue-600">
              <span>Assigner les lanes</span>
              <span class="text-gray-400 text-xs">(utilise les rôles choisis)</span>
            </label>
            <label class="flex items-center gap-2 text-gray-700">
              <input type="checkbox" v-model="balanceTeamsOption" class="form-checkbox h-5 w-5 text-green-600">
              <span>Équilibrer les équipes</span>
              <span class="text-gray-400 text-xs">(par win rate)</span>
            </label>
          </div>

          <!-- Boutons d'action -->
          <div class="flex justify-center gap-3 mt-6">
            <button 
              @click="autoFillRoles" 
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              :disabled="selectedPlayers.length === 0"
            >
              Auto-assigner les rôles
            </button>
            
            <button 
              @click="createTeamsRequest" 
              class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              :disabled="selectedPlayers.length !== 10 || isLoading"
            >
              <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              <span>{{ isLoading ? "Génération..." : "Générer les équipes" }}</span>
            </button>
          </div>

          <div v-if="errorMessage" class="text-center text-red-600 font-semibold mt-4 p-2 bg-red-50 rounded">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- Onglet d'affichage des équipes générées -->
    <div v-if="activeTab === 'teams'" class="bg-white shadow-md rounded-lg p-6 transition-all duration-300">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Équipes Générées</h2>

      <div v-if="!teams.blue.length && !teams.red.length" class="text-center py-10 text-gray-500">
        <p>Aucune équipe générée pour le moment.</p>
        <button @click="activeTab = 'selection'" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Générer des équipes
        </button>
      </div>

      <div v-else>
        <!-- Statistiques d'équilibrage -->
        <div v-if="teams.metrics" class="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Statistiques d'équilibrage</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white p-3 rounded shadow-sm">
              <p class="text-sm text-gray-600">Win Rate Global</p>
              <div class="flex justify-between mt-1">
                <span class="font-medium text-blue-600">Équipe Bleue: {{ (teams.metrics.blueTotalWinRate * 100)?.toFixed(1) || '-' }}%</span>
                <span class="font-medium text-red-600">Équipe Rouge: {{ (teams.metrics.redTotalWinRate * 100)?.toFixed(1) || '-' }}%</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Moyenne: 
                <span class="text-blue-600">{{ (teams.metrics.blueAverageWinRate * 100)?.toFixed(1) || '-' }}%</span> / 
                <span class="text-red-600">{{ (teams.metrics.redAverageWinRate * 100)?.toFixed(1) || '-' }}%</span>
              </div>
            </div>
            
            <div class="bg-white p-3 rounded shadow-sm">
              <p class="text-sm text-gray-600">Écart de Win Rate</p>
              <p class="font-medium mt-1">{{ (teams.metrics.winRateDifference * 100)?.toFixed(1) || '-' }}%</p>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="bg-green-600 h-2 rounded-full" 
                  :style="{width: `${Math.min(100, 100 - teams.metrics.winRateDifference * 20 * 100)}%`}"
                ></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">Plus l'écart est faible, meilleur est l'équilibrage</div>
            </div>
            
            <div class="bg-white p-3 rounded shadow-sm">
              <p class="text-sm text-gray-600">Qualité d'équilibrage</p>
              <p class="font-medium mt-1">{{ teams.metrics.balanceQuality?.toFixed(0) || '-' }}/100</p>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="h-2 rounded-full" 
                  :class="{
                    'bg-red-500': teams.metrics.balanceQuality < 70,
                    'bg-yellow-500': teams.metrics.balanceQuality >= 70 && teams.metrics.balanceQuality < 85,
                    'bg-green-500': teams.metrics.balanceQuality >= 85
                  }"
                  :style="{width: `${teams.metrics.balanceQuality}%`}"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Équipe Bleue -->
          <div class="bg-blue-50 p-4 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-blue-700 mb-4">Équipe Bleue</h3>
            <TransitionGroup name="list" tag="ul" class="space-y-2">
              <li v-for="player in teams.blue" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1">
                    <span class="text-gray-800 font-medium">{{ player.name }}</span>
                    <span v-if="player.roleMatch" class="text-xs px-1 py-0.5 bg-gray-100 rounded text-gray-600">{{ player.roleMatch }}</span>
                  </div>
                  <span class="text-sm text-gray-600">
                    {{ (player.winRate * 100).toFixed(2) }}% WR global
                    <span v-if="assignLanes && player.lane">
                      | {{ (player.laneWinRate * 100).toFixed(2) }}% WR {{ player.lane }}
                    </span>
                  </span>
                </div>
                <img v-if="assignLanes && player.lane" :src="getLaneIcon(player.lane)" class="w-6 h-6">
              </li>
            </TransitionGroup>
          </div>

          <!-- Équipe Rouge -->
          <div class="bg-red-50 p-4 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-red-700 mb-4">Équipe Rouge</h3>
            <TransitionGroup name="list" tag="ul" class="space-y-2">
              <li v-for="player in teams.red" :key="player.id" class="p-3 bg-white shadow-sm rounded-md flex justify-between items-center">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1">
                    <span class="text-gray-800 font-medium">{{ player.name }}</span>
                    <span v-if="player.roleMatch" class="text-xs px-1 py-0.5 bg-gray-100 rounded text-gray-600">{{ player.roleMatch }}</span>
                  </div>
                  <span class="text-sm text-gray-600">
                    {{ (player.winRate * 100).toFixed(2) }}% WR global
                    <span v-if="assignLanes && player.lane">
                      | {{ (player.laneWinRate * 100).toFixed(2) }}% WR {{ player.lane }}
                    </span>
                  </span>
                </div>
                <img v-if="assignLanes && player.lane" :src="getLaneIcon(player.lane)" class="w-6 h-6">
              </li>
            </TransitionGroup>
          </div>
        </div>

        <!-- Actions supplémentaires -->
        <div class="flex justify-center gap-4 mt-8">
          <button @click="activeTab = 'selection'" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
            Revenir à la sélection
          </button>
          
          <button 
            @click="createTeamsRequest" 
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            :disabled="selectedPlayers.length !== 10 || isLoading"
          >
            <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
            <span>{{ isLoading ? "Génération..." : "Régénérer" }}</span>
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<style>
/* Animations et transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>