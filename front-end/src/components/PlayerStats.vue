<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { getAllPlayers, getPlayerStats, recalculateStats } from '../services/api_service';
import { useToast } from 'vue-toastification';

const toast = useToast();
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
const selectedTab = ref("overview"); // "overview", "lanes", "champions", "history"
const championsFilter = ref("");

// Computed properties
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

const filteredChampions = computed(() => {
  if (!playerStats.value || !playerStats.value.statsByChampion) return {};
  
  if (!championsFilter.value) return playerStats.value.statsByChampion;
  
  const filter = championsFilter.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(playerStats.value.statsByChampion).filter(([champ]) => 
      champ.toLowerCase().includes(filter)
    )
  );
});

const sortedChampions = computed(() => {
  if (!filteredChampions.value) return [];
  
  return Object.entries(filteredChampions.value).sort((a, b) => {
    // Trier par nombre de parties décroissant par défaut
    return b[1].gamesPlayed - a[1].gamesPlayed;
  });
});

const mostPlayedChampions = computed(() => {
  if (!playerStats.value || !playerStats.value.statsByChampion) return [];
  
  return Object.entries(playerStats.value.statsByChampion)
    .sort((a, b) => b[1].gamesPlayed - a[1].gamesPlayed)
    .slice(0, 3); // Top 3
});

const bestWinrateChampions = computed(() => {
  if (!playerStats.value || !playerStats.value.statsByChampion) return [];
  
  return Object.entries(playerStats.value.statsByChampion)
    .filter(([_, stats]) => stats.gamesPlayed >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 3); // Top 3
});

const sortedLanes = computed(() => {
  if (!playerStats.value || !playerStats.value.statsByLane) return [];
  
  return Object.entries(playerStats.value.statsByLane)
    .sort((a, b) => b[1].gamesPlayed - a[1].gamesPlayed);
});

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

const calculateKDA = (kills, deaths, assists) => {
  if (deaths === 0) return 'Perfect';
  return ((kills + assists) / deaths).toFixed(2);
};

// Filtrer les joueurs en fonction de la recherche
const filterPlayers = () => {
  if (!searchQuery.value) {
    filteredPlayers.value = [...playersList.value];
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredPlayers.value = playersList.value.filter(player => 
    player.name.toLowerCase().includes(query)
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

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (lane) => {
  if (!lane) return '';
  const extension = lane === 'adc' ? 'png' : 'webp';
  try {
    return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
  } catch (error) {
    console.warn(`Icon not found for lane: ${lane}`);
    return '';
  }
};

// Fonction pour formater le nom des champions pour les images
const formatChampionImageName = (champ) => {
  if (!champ) return 'Default';
  
  // Cas spéciaux connus
  const specialCases = {
    'Wukong': 'MonkeyKing',
    "Vel'Koz": 'Velkoz',
    "Cho'Gath": 'Chogath',
    "Kai'Sa": 'Kaisa',
    "Kha'Zix": 'Khazix',
    "Kog'Maw": 'KogMaw',
    "Rek'Sai": 'RekSai',
    "Nunu & Willump": 'Nunu',
    "Renata Glasc": 'Renata',
    "Dr. Mundo": 'DrMundo',
    "Tahm Kench": 'TahmKench',
    "Twisted Fate": 'TwistedFate',
    "Master Yi": 'MasterYi',
    "Miss Fortune": 'MissFortune',
    "Jarvan IV": 'JarvanIV',
    "Lee Sin": 'LeeSin',
    "Aurelion Sol": 'AurelionSol',
    "Xin Zhao": 'XinZhao'
  };

  // Transformer les underscores en espaces pour rechercher dans le dictionnaire
  const champWithSpaces = champ.replace(/_/g, ' ');
  
  // Vérifier si c'est un cas spécial (avec les espaces corrects)
  if (specialCases[champWithSpaces]) {
    return specialCases[champWithSpaces];
  }

  // Sinon appliquer la logique standard
  return champWithSpaces
    .replace(/\s+/g, '')   // Supprime les espaces
    .replace(/'/g, '')     // Supprime les apostrophes
    .replace(/\./g, '')    // Supprime les points
    .replace(/&/g, '');    // Supprime les &
};

// Fonction pour formater le nom des champions pour l'affichage
const formatChampionDisplayName = (champ) => {
  if (!champ) return 'Inconnu';
  // Remplacer les underscores par des espaces pour l'affichage
  return champ.replace(/_/g, ' ');
};

// Fonction pour obtenir l'URL de l'image du champion
const getChampionImageUrl = (champion) => {
  return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formatChampionImageName(champion)}.png`;
};

// Gestion des erreurs d'image
const handleImageError = (event) => {
  event.target.src = new URL('../assets/default-champion.png', import.meta.url).href;
};

// Déterminer la classe CSS pour le KDA (bon, moyen, mauvais)
const getKDAClass = (kda) => {
  if (kda === 'Perfect') return 'text-purple-600 font-bold';
  const kdaNum = parseFloat(kda);
  if (kdaNum >= 4) return 'text-green-600 font-semibold';
  if (kdaNum >= 2.5) return 'text-blue-600';
  if (kdaNum >= 1) return 'text-yellow-600';
  return 'text-red-600';
};

// Déterminer la classe CSS pour le winrate
const getWinRateClass = (winRate) => {
  const rate = winRate * 100;
  if (rate >= 60) return 'text-green-600 font-semibold';
  if (rate >= 50) return 'text-blue-600';
  if (rate >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

// Calculer la classe de couleur pour la barre de winrate
const getWinRateBarClass = (winRate) => {
  const rate = winRate * 100;
  if (rate >= 60) return 'bg-green-500';
  if (rate >= 50) return 'bg-blue-500';
  if (rate >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

// Afficher/cacher les détails d'un champion
const toggleChampionDetails = (champion) => {
  // Cette fonctionnalité pourrait être implémentée si nécessaire
};

// Surveillez les changements de recherche pour filtrer les joueurs
watch(searchQuery, () => {
  filterPlayers();
});

onMounted(fetchPlayers);
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
    <!-- Panneau de gauche : Liste des joueurs -->
    <div class="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-md order-2 lg:order-1">
      <div class="flex flex-col h-full">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Liste des Joueurs</h2>
        
        <!-- Recherche et filtres -->
        <div class="mb-4">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Rechercher un joueur..." 
            class="w-full p-2 border rounded-md shadow-sm"
          />
        </div>
        
        <!-- Options de tri -->
        <div class="flex justify-between text-sm text-gray-600 mb-2 px-2">
          <button @click="changeSortOption('name')" class="flex items-center hover:text-blue-600">
            Nom
            <span v-if="sortOption === 'name'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button @click="changeSortOption('winRate')" class="flex items-center hover:text-blue-600">
            Win Rate
            <span v-if="sortOption === 'winRate'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button @click="changeSortOption('gamesPlayed')" class="flex items-center hover:text-blue-600">
            Games
            <span v-if="sortOption === 'gamesPlayed'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
        </div>
        
        <!-- Liste des joueurs avec état de chargement -->
        <div v-if="isLoading" class="flex-grow flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
        
        <div v-else-if="errorMessage && !playersList.length" class="flex-grow flex items-center justify-center">
          <p class="text-red-500 text-center">{{ errorMessage }}</p>
        </div>
        
        <div v-else-if="!filteredPlayers.length && searchQuery" class="flex-grow flex items-center justify-center">
          <p class="text-gray-500 text-center">Aucun joueur ne correspond à votre recherche.</p>
        </div>
        
        <div v-else class="flex-grow overflow-y-auto max-h-[calc(100vh-350px)] pr-1">
          <transition-group name="list" tag="ul" class="space-y-2">
            <li 
              v-for="player in sortedPlayers" 
              :key="player._id" 
              @click="fetchPlayerStats(player)"
              class="cursor-pointer p-3 rounded-md shadow-sm hover:bg-gray-100 transition flex justify-between items-center"
              :class="{'bg-blue-50 border-l-4 border-blue-500': selectedPlayer && selectedPlayer._id === player._id}"
            >
              <div class="flex flex-col">
                <span class="text-gray-800 font-medium">{{ player.name }}</span>
                <span class="text-xs text-gray-500">{{ player.gamesPlayed || 0 }} games</span>
              </div>
              
              <div class="flex flex-col items-end">
                <span :class="getWinRateClass(player.winRate)">
                  {{ (player.winRate * 100).toFixed(1) }}%
                </span>
                <div class="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    :class="getWinRateBarClass(player.winRate)" 
                    class="h-1.5 rounded-full"
                    :style="{width: `${Math.min(100, player.winRate * 100)}%`}"
                  ></div>
                </div>
              </div>
            </li>
          </transition-group>
        </div>
        
        <!-- Bouton de recalcul -->
        <button 
          @click="handleRecalculateStats" 
          class="w-full px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition mt-4 flex items-center justify-center"
          :disabled="isRecalculating"
        >
          <span v-if="isRecalculating" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
          <span>{{ isRecalculating ? "Recalcul en cours..." : "Recalculer toutes les statistiques" }}</span>
        </button>
      </div>
    </div>

    <!-- Panneau de droite : Statistiques du joueur -->
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
        <!-- Entête avec le nom du joueur et winrate global -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">{{ playerStats.name }}</h2>
          <div class="flex items-center">
            <span class="text-sm mr-2">Global WR:</span>
            <span :class="getWinRateClass(playerStats.winRate)" class="text-xl">
              {{ (playerStats.winRate * 100).toFixed(1) }}%
            </span>
          </div>
        </div>
        
        <!-- Onglets -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="flex space-x-4">
            <button 
              @click="selectedTab = 'overview'" 
              class="px-3 py-2 text-sm font-medium transition-colors"
              :class="selectedTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
            >
              Aperçu
            </button>
            <button 
              @click="selectedTab = 'lanes'" 
              class="px-3 py-2 text-sm font-medium transition-colors"
              :class="selectedTab === 'lanes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
            >
              Lanes ({{ Object.keys(playerStats.statsByLane || {}).length || 0 }})
            </button>
            <button 
              @click="selectedTab = 'champions'" 
              class="px-3 py-2 text-sm font-medium transition-colors"
              :class="selectedTab === 'champions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
            >
              Champions ({{ Object.keys(playerStats.statsByChampion || {}).length || 0 }})
            </button>
          </nav>
        </div>
        
        <!-- Contenu des onglets -->
        <!-- Onglet Aperçu -->
        <div v-if="selectedTab === 'overview'" class="space-y-6">
          <!-- Statistiques globales -->
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Statistiques Globales</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white p-3 rounded shadow-sm">
                <p class="text-sm text-gray-600">Parties jouées</p>
                <p class="font-bold text-2xl text-gray-800">{{ playerStats.gamesPlayed || 0 }}</p>
              </div>
              
              <div class="bg-white p-3 rounded shadow-sm">
                <p class="text-sm text-gray-600">Win Rate</p>
                <div class="flex items-center">
                  <span :class="getWinRateClass(playerStats.winRate)" class="font-bold text-2xl mr-2">
                    {{ (playerStats.winRate * 100).toFixed(1) }}%
                  </span>
                  <span class="text-sm text-gray-500">
                    ({{ Math.round(playerStats.winRate * playerStats.gamesPlayed) }}W {{ playerStats.gamesPlayed - Math.round(playerStats.winRate * playerStats.gamesPlayed) }}L)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    :class="getWinRateBarClass(playerStats.winRate)" 
                    class="h-2 rounded-full"
                    :style="{width: `${Math.min(100, playerStats.winRate * 100)}%`}"
                  ></div>
                </div>
              </div>
              
              <div class="bg-white p-3 rounded shadow-sm">
                <p class="text-sm text-gray-600">KDA Global</p>
                <div class="flex items-center gap-1 mt-1">
                  <span class="font-medium">{{ playerStats.totalKills || 0 }}</span>
                  <span class="text-gray-500">/</span>
                  <span class="font-medium">{{ playerStats.totalDeaths || 0 }}</span>
                  <span class="text-gray-500">/</span>
                  <span class="font-medium">{{ playerStats.totalAssists || 0 }}</span>
                  <span class="ml-2 text-sm" :class="getKDAClass(calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0))">
                    ({{ calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0) }})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Champions les plus joués -->
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Champions les plus joués</h3>
            
            <div v-if="mostPlayedChampions.length > 0" class="space-y-3">
              <div v-for="[champion, stats] in mostPlayedChampions" :key="champion" class="bg-white p-3 rounded shadow-sm flex items-center">
                <img 
                  :src="getChampionImageUrl(champion)" 
                  :alt="champion" 
                  class="w-12 h-12 rounded-lg object-cover mr-4"
                  @error="handleImageError"
                >
                <div class="flex-grow">
                  <div class="flex justify-between">
                    <span class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</span>
                    <span :class="getWinRateClass(stats.winRate)">
                      {{ (stats.winRate * 100).toFixed(1) }}% WR
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ stats.gamesPlayed }} parties | 
                    <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))">
                      {{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }} ({{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA)
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      :class="getWinRateBarClass(stats.winRate)" 
                      class="h-1.5 rounded-full"
                      :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">Aucun champion joué</p>
          </div>
          
          <!-- Meilleurs Win Rates -->
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Meilleurs Win Rates (min. 3 parties)</h3>
            
            <div v-if="bestWinrateChampions.length > 0" class="space-y-3">
              <div v-for="[champion, stats] in bestWinrateChampions" :key="champion" class="bg-white p-3 rounded shadow-sm flex items-center">
                <img 
                  :src="getChampionImageUrl(champion)" 
                  :alt="champion" 
                  class="w-12 h-12 rounded-lg object-cover mr-4"
                  @error="handleImageError"
                >
                <div class="flex-grow">
                  <div class="flex justify-between">
                    <span class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</span>
                    <span :class="getWinRateClass(stats.winRate)" class="font-bold">
                      {{ (stats.winRate * 100).toFixed(1) }}% WR
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ stats.gamesPlayed }} parties | 
                    <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))">
                      {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      :class="getWinRateBarClass(stats.winRate)" 
                      class="h-1.5 rounded-full"
                      :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">Aucun champion avec au moins 3 parties</p>
          </div>
        </div>
        
        <!-- Onglet Lanes -->
        <div v-if="selectedTab === 'lanes'">
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance par lane</h3>
            
            <div v-if="sortedLanes.length > 0" class="space-y-4">
              <div v-for="[lane, stats] in sortedLanes" :key="lane" class="bg-white p-4 rounded shadow-sm">
                <div class="flex items-center gap-3 mb-3">
                  <img :src="getLaneIcon(lane)" :alt="lane" class="w-8 h-8">
                  <h4 class="text-lg font-medium text-gray-800 capitalize">{{ lane }}</h4>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-gray-50 p-3 rounded">
                    <p class="text-sm text-gray-600">Parties jouées</p>
                    <p class="font-bold text-xl">{{ stats.gamesPlayed }}</p>
                    <p class="text-xs text-gray-500">
                      {{ ((stats.gamesPlayed / playerStats.gamesPlayed) * 100).toFixed(1) }}% du total
                    </p>
                  </div>
                  
                  <div class="bg-gray-50 p-3 rounded">
                    <p class="text-sm text-gray-600">Win Rate</p>
                    <p :class="getWinRateClass(stats.winRate)" class="font-bold text-xl">
                      {{ (stats.winRate * 100).toFixed(1) }}%
                    </p>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        :class="getWinRateBarClass(stats.winRate)" 
                        class="h-2 rounded-full"
                        :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                      ></div>
                    </div>
                  </div>
                  
                  <div class="bg-gray-50 p-3 rounded">
                    <p class="text-sm text-gray-600">KDA</p>
                    <div class="text-sm">
                      <span class="font-medium">{{ stats.kills || 0 }}</span>
                      <span class="text-gray-500">/</span>
                      <span class="font-medium">{{ stats.deaths || 0 }}</span>
                      <span class="text-gray-500">/</span>
                      <span class="font-medium">{{ stats.assists || 0 }}</span>
                    </div>
                    <p :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))" class="font-bold">
                      {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">Aucune statistique par lane disponible</p>
          </div>
        </div>
        
        <!-- Onglet Champions -->
        <div v-if="selectedTab === 'champions'">
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance par champion</h3>
            
            <!-- Recherche de champion -->
            <div class="mb-4">
              <input 
                v-model="championsFilter" 
                type="text" 
                placeholder="Rechercher un champion..." 
                class="w-full p-2 border rounded-md shadow-sm"
              />
            </div>
            
            <div v-if="sortedChampions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="[champion, stats] in sortedChampions" :key="champion" class="bg-white p-3 rounded shadow-sm">
                <div class="flex items-start gap-3">
                  <img 
                    :src="getChampionImageUrl(champion)" 
                    :alt="champion" 
                    class="w-12 h-12 rounded-lg object-cover" 
                    @error="handleImageError"
                  >
                  <div class="flex-grow">
                    <div class="flex justify-between items-start">
                      <h4 class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</h4>
                      <span class="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {{ stats.gamesPlayed }} parties
                      </span>
                    </div>
                    
                    <div class="mt-1 flex justify-between">
                      <div>
                        <span class="text-xs text-gray-600">WR: </span>
                        <span :class="getWinRateClass(stats.winRate)" class="font-medium">
                          {{ (stats.winRate * 100).toFixed(1) }}%
                        </span>
                      </div>
                      <div>
                        <span class="text-xs text-gray-600">KDA: </span>
                        <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))" class="font-medium">
                          {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }}
                        </span>
                        <span class="text-xs text-gray-500 ml-1">
                          ({{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }})
                        </span>
                      </div>
                    </div>
                    
                    <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        :class="getWinRateBarClass(stats.winRate)" 
                        class="h-1.5 rounded-full"
                        :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p v-else-if="Object.keys(playerStats.statsByChampion || {}).length === 0" class="text-gray-500 text-sm">
              Aucune statistique par champion disponible
            </p>
            <p v-else class="text-gray-500 text-sm">
              Aucun champion ne correspond à votre recherche.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Amélioration de l'apparence au survol des éléments clickables */
.cursor-pointer:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Animation de pulsation pour les éléments sélectionnés */
@keyframes pulse {
  0%, 100% { border-color: rgba(59, 130, 246, 0.6); }
  50% { border-color: rgba(59, 130, 246, 1); }
}
</style>