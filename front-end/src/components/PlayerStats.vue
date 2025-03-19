<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAllPlayers, getPlayerStats, recalculateStats } from '../services/api_service';
import { useToast } from 'vue-toastification';

import PlayersList from './players/PlayersList.vue';
import PlayerHeader from './stats/PlayerHeader.vue';
import PlayerTabNav from './stats/PlayerTabNav.vue';
import PlayerOverview from './stats/tabs/PlayerOverview.vue';
import PlayerLanes from './stats/tabs/PlayerLanes.vue';
import PlayerChampions from './stats/tabs/PlayerChampions.vue';
import PlayerRiotAccount from './stats/tabs/PlayerRiotAccount.vue';
import PlayerTrends from './stats/tabs/PlayerTrends.vue';
import PlayerEditModal from './modals/PlayerEditModal .vue';

// Toast pour les notifications
const toast = useToast();

// États réactifs
const playersList = ref([]);
const filteredPlayers = ref([]);
const selectedPlayer = ref(null);
const playerStats = ref(null);
const isLoading = ref(true);
const isLoadingStats = ref(false);
const errorMessage = ref("");
const isRecalculating = ref(false);
const searchQuery = ref("");
const sortOption = ref("winRate"); // Options: "name", "winRate", "gamesPlayed"
const sortDirection = ref("desc"); // "asc" ou "desc"
const selectedTab = ref("overview"); // "overview", "lanes", "champions", "riotAccount", "trends"
const isEditModalOpen = ref(false);

// Récupération de la liste des joueurs avec gestion d'erreur
const fetchPlayers = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  
  try {
    playersList.value = await getAllPlayers();
    filteredPlayers.value = [...playersList.value];
    
    if (playersList.value.length === 0) {
      errorMessage.value = "Aucun joueur trouvé. Créez des joueurs pour commencer.";
    } else {
      // Si aucun joueur n'est sélectionné, sélectionner le premier (meilleur winrate)
      if (!selectedPlayer.value && sortedPlayers.value.length > 0) {
        await fetchPlayerStats(sortedPlayers.value[0]);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
    errorMessage.value = "Impossible de charger la liste des joueurs. Veuillez réessayer.";
    toast.error("Erreur lors du chargement des joueurs");
  } finally {
    isLoading.value = false;
  }
};

// Récupération des statistiques d'un joueur
const fetchPlayerStats = async (player) => {
  if (!player) return;
  isLoadingStats.value = true;
  errorMessage.value = "";
  selectedPlayer.value = player;
  playerStats.value = null; // Reset stats while loading

  try {
    playerStats.value = await getPlayerStats(player.name);
    
    // Sélectionner l'onglet "overview" par défaut
    selectedTab.value = "overview";
    
    if (!playerStats.value) {
      errorMessage.value = "Aucune statistique disponible pour ce joueur.";
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du joueur:', error);
    errorMessage.value = "Impossible de charger les statistiques.";
    toast.error("Erreur lors du chargement des statistiques");
  } finally {
    isLoadingStats.value = false;
  }
};

// Recalculer toutes les statistiques
const handleRecalculateStats = async () => {
  if (isRecalculating.value) return;
  
  isRecalculating.value = true;
  try {
    await recalculateStats();
    await fetchPlayers();
    if (selectedPlayer.value) {
      await fetchPlayerStats(selectedPlayer.value);
    }
    toast.success("Les statistiques ont été recalculées avec succès !");
  } catch (error) {
    console.error("Erreur lors du recalcul des stats :", error);
    toast.error("Une erreur est survenue lors du recalcul des statistiques.");
  } finally {
    isRecalculating.value = false;
  }
};

// Ouvrir la modal d'édition
const openEditModal = () => {
  isEditModalOpen.value = true;
};

// Computed property pour trier les joueurs
const sortedPlayers = computed(() => {
  if (!playersList.value.length) return [];
  
  return [...playersList.value].sort((a, b) => {
    let result;
    
    if (sortOption.value === "name") {
      result = a.name.localeCompare(b.name);
    } else if (sortOption.value === "winRate") {
      result = b.winRate - a.winRate;
    } else if (sortOption.value === "gamesPlayed") {
      result = (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
    }
    
    return sortDirection.value === "asc" ? -result : result;
  });
});

// Filtrer les joueurs en fonction de la recherche
const filterPlayers = (query) => {
  searchQuery.value = query;
  
  if (!query) {
    filteredPlayers.value = [...playersList.value];
    return;
  }
  
  const searchTerm = query.toLowerCase();
  filteredPlayers.value = playersList.value.filter(player => 
    player.name.toLowerCase().includes(searchTerm)
  );
};

// Changer l'option de tri
const changeSortOption = (option) => {
  if (sortOption.value === option) {
    // Inverser la direction si on clique sur la même option
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortOption.value = option;
    // Par défaut: ordre alphabétique ascendant, winrate et games descendant
    sortDirection.value = option === "name" ? "asc" : "desc";
  }
};

// Changer d'onglet
const changeTab = (tab) => {
  selectedTab.value = tab;
};

// Traiter la mise à jour d'un joueur
const handleUpdatePlayer = async (updatedPlayerData) => {
  // Cette fonction sera appelée par le PlayerEditModal
  // La logique de mise à jour est déléguée au composant modal
  isEditModalOpen.value = false;
  await fetchPlayers();
  
  // Trouver et sélectionner le joueur mis à jour
  const updatedPlayer = playersList.value.find(p => p._id === updatedPlayerData.id);
  if (updatedPlayer) {
    await fetchPlayerStats(updatedPlayer);
  }
};

onMounted(fetchPlayers);
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
    <!-- Liste des joueurs (panneau gauche) -->
    <PlayersList 
      :players="sortedPlayers"
      :selected-player="selectedPlayer"
      :loading="isLoading"
      :error-message="errorMessage"
      :search-query="searchQuery"
      :sort-option="sortOption"
      :sort-direction="sortDirection"
      :is-recalculating="isRecalculating"
      @select-player="fetchPlayerStats"
      @search="filterPlayers"
      @change-sort="changeSortOption"
      @recalculate="handleRecalculateStats"
    />

    <!-- Statistiques du joueur (panneau droit) -->
    <div class="w-full lg:w-2/3 bg-white p-4 rounded-lg shadow-md order-1 lg:order-2">
      <!-- État de chargement -->
      <div v-if="!selectedPlayer" class="flex items-center justify-center h-64">
        <p class="text-gray-500 text-center">Sélectionnez un joueur pour voir ses statistiques.</p>
      </div>
      
      <div v-else-if="isLoadingStats" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p class="text-gray-500">Chargement des statistiques de {{ selectedPlayer.name }}...</p>
        </div>
      </div>
      
      <div v-else-if="errorMessage" class="flex items-center justify-center h-64">
        <p class="text-red-500 text-center">{{ errorMessage }}</p>
      </div>
      
      <div v-else-if="playerStats">
        <!-- En-tête avec le nom du joueur, winrate global et bouton d'édition -->
        <PlayerHeader 
          :player-stats="playerStats" 
          :selected-player="selectedPlayer"
          @edit="openEditModal"
        />
        
        <!-- Onglets de navigation -->
        <PlayerTabNav 
          :selected-tab="selectedTab"
          :player-stats="playerStats"
          @change-tab="changeTab"
        />
        
        <!-- Contenu des onglets -->
        <PlayerOverview v-if="selectedTab === 'overview'" :player-stats="playerStats" />
        <PlayerLanes v-if="selectedTab === 'lanes'" :player-stats="playerStats" />
        <PlayerChampions v-if="selectedTab === 'champions'" :player-stats="playerStats" />
        <PlayerRiotAccount v-if="selectedTab === 'riotAccount'" :player-stats="playerStats" />
        <PlayerTrends v-if="selectedTab === 'trends'" :player-stats="playerStats" />
      </div>
    </div>
    
    <!-- Modal d'édition du joueur -->
    <PlayerEditModal 
      v-if="selectedPlayer && isEditModalOpen"
      :player="selectedPlayer"
      :is-open="isEditModalOpen"
      @close="isEditModalOpen = false"
      @update-player="handleUpdatePlayer"
    />
  </div>
</template>