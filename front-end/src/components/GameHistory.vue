<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { getAllGames, getTournamentTestGames, createTournamentProvider, createTournament, generateTournamentCode } from '../services/api_service';
import { useToast } from 'vue-toastification';

const gamesList = ref([]);
const filteredGames = ref([]);
const isLoading = ref(true);
const error = ref(null);
const expandedGames = ref({});
const searchQuery = ref('');
const filterWinner = ref('all'); // 'all', 'Blue', 'Red'
const selectedDate = ref(null);
const currentPage = ref(1);
const gamesPerPage = 5;
const toast = useToast();

// Mode d'affichage: normal ou tournoi test
const viewMode = ref('normal'); // 'normal' ou 'tournament'

// Paramètres de création de tournoi
const tournamentPanel = ref(false);
const providerId = ref('');
const tournamentId = ref('');
const tournamentName = ref('');
const tournamentCode = ref('');
const isCreatingProvider = ref(false);
const isCreatingTournament = ref(false);
const isGeneratingCode = ref(false);

// Options de tournoi
const teamSize = ref(5);
const spectatorTypes = ['ALL', 'LOBBYONLY', 'NONE'];
const spectatorType = ref('ALL');
const pickTypes = ['BLIND_PICK', 'DRAFT_MODE', 'TOURNAMENT_DRAFT', 'ALL_RANDOM'];
const pickType = ref('TOURNAMENT_DRAFT');
const mapTypes = ['SUMMONERS_RIFT', 'HOWLING_ABYSS'];
const mapType = ref('SUMMONERS_RIFT');

// Fonction pour formater les noms de champions pour les URL d'images
const formatChampionImageName = (champ) => {
  if (!champ) return 'Default';
  
  const specialCases = {
    'Wukong': 'MonkeyKing',
    "Vel'Koz": 'Velkoz',
    "Cho'Gath": 'Chogath',
    "Kai'Sa": 'Kaisa',
    "Kha'Zix": 'Khazix',
    "Kog'Maw": 'KogMaw',
    "Rek'Sai": 'RekSai',
    "Nunu & Willump": 'Nunu',
    "Renata Glasc": 'Renata'
  };

  // Vérifier si c'est un cas spécial
  if (specialCases[champ]) {
    return specialCases[champ];
  }

  // Sinon appliquer la logique standard
  return champ
    .replace(/\s+/g, '')   // Supprime les espaces
    .replace(/_/g, '')     // Supprime les underscores
    .replace(/'/g, '')     // Supprime les apostrophes
    .replace(/\./g, '')    // Supprime les points
    .replace(/&/g, '');    // Supprime les &
};

// Calcul des pages totales
const totalPages = computed(() => Math.ceil(filteredGames.value.length / gamesPerPage));

// Jeux à afficher sur la page actuelle
const currentGames = computed(() => {
  const startIndex = (currentPage.value - 1) * gamesPerPage;
  return filteredGames.value.slice(startIndex, startIndex + gamesPerPage);
});

// Statistiques globales
const stats = computed(() => {
  if (!gamesList.value.length) return { totalGames: 0, blueWins: 0, redWins: 0, mostPlayedChampion: '-' };
  
  const blueWins = gamesList.value.filter(game => game.winningTeam === 'Blue').length;
  
  // Calculer le champion le plus joué
  const championCounts = {};
  gamesList.value.forEach(game => {
    game.players.forEach(player => {
      if (player.champion) {
        championCounts[player.champion] = (championCounts[player.champion] || 0) + 1;
      }
    });
  });
  
  let mostPlayedChampion = '-';
  let maxCount = 0;
  
  for (const [champion, count] of Object.entries(championCounts)) {
    if (count > maxCount) {
      mostPlayedChampion = champion;
      maxCount = count;
    }
  }
  
  return {
    totalGames: gamesList.value.length,
    blueWins,
    redWins: gamesList.value.length - blueWins,
    blueWinRate: ((blueWins / gamesList.value.length) * 100).toFixed(1),
    mostPlayedChampion,
    playCount: maxCount
  };
});

// Filtre les jeux en fonction des critères
const filterGames = () => {
  let result = [...gamesList.value];
  
  // Filtre par recherche (nom de joueur ou champion)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(game => 
      game.players.some(player => 
        (player.playerId?.name?.toLowerCase().includes(query)) ||
        (player.champion?.toLowerCase().includes(query))
      )
    );
  }
  
  // Filtre par équipe gagnante
  if (filterWinner.value !== 'all') {
    result = result.filter(game => game.winningTeam === filterWinner.value);
  }
  
  // Filtre par date
  if (selectedDate.value) {
    const selectedDateStr = new Date(selectedDate.value).toLocaleDateString();
    result = result.filter(game => {
      const gameDate = new Date(game.createdAt).toLocaleDateString();
      return gameDate === selectedDateStr;
    });
  }
  
  filteredGames.value = result;
  currentPage.value = 1; // Réinitialiser à la première page après filtrage
};

// Gestionnaire de changement de page
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    // Remonter en haut de la liste
    nextTick(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

// Changer le mode d'affichage (normal/tournoi)
const switchViewMode = (mode) => {
  viewMode.value = mode;
  fetchGames();
};

// Récupération des games avec gestion des erreurs
const fetchGames = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Récupérer les games selon le mode
    if (viewMode.value === 'normal') {
      gamesList.value = await getAllGames();
    } else {
      gamesList.value = await getTournamentTestGames();
    }
    
    // Tri par date (la plus récente en premier)
    gamesList.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    filteredGames.value = [...gamesList.value];
    
    if (gamesList.value.length > 0) {
      toast.success(`${gamesList.value.length} parties chargées`);
    } else {
      toast.info(`Aucune partie ${viewMode.value === 'tournament' ? 'de tournoi' : ''} trouvée`);
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des games:', err);
    error.value = `Impossible de charger l'historique des parties ${viewMode.value === 'tournament' ? 'de tournoi' : ''}. Veuillez réessayer plus tard.`;
    toast.error("Erreur lors du chargement des parties");
  } finally {
    isLoading.value = false;
  }
};

// Fonctions pour le panneau de tournoi
const toggleTournamentPanel = () => {
  tournamentPanel.value = !tournamentPanel.value;
};

// Créer un fournisseur de tournoi
const handleCreateProvider = async () => {
  isCreatingProvider.value = true;
  try {
    const response = await createTournamentProvider();
    if (response.success) {
      providerId.value = response.providerId;
      toast.success(`Fournisseur de tournoi créé avec succès (ID: ${providerId.value})`);
    } else {
      toast.error("Échec de la création du fournisseur de tournoi");
    }
  } catch (error) {
    toast.error(`Erreur: ${error.message}`);
  } finally {
    isCreatingProvider.value = false;
  }
};

// Créer un tournoi
const handleCreateTournament = async () => {
  if (!providerId.value) {
    toast.warning("Veuillez d'abord créer un fournisseur de tournoi");
    return;
  }
  
  if (!tournamentName.value.trim()) {
    toast.warning("Veuillez saisir un nom de tournoi");
    return;
  }
  
  isCreatingTournament.value = true;
  try {
    const response = await createTournament(providerId.value, tournamentName.value);
    if (response.success) {
      tournamentId.value = response.tournamentId;
      toast.success(`Tournoi "${tournamentName.value}" créé avec succès (ID: ${tournamentId.value})`);
    } else {
      toast.error("Échec de la création du tournoi");
    }
  } catch (error) {
    toast.error(`Erreur: ${error.message}`);
  } finally {
    isCreatingTournament.value = false;
  }
};

// Générer un code de tournoi
const handleGenerateCode = async () => {
  if (!tournamentId.value) {
    toast.warning("Veuillez d'abord créer un tournoi");
    return;
  }
  
  isGeneratingCode.value = true;
  try {
    const options = {
      teamSize: parseInt(teamSize.value),
      spectatorType: spectatorType.value,
      pickType: pickType.value,
      mapType: mapType.value
    };
    
    const response = await generateTournamentCode(tournamentId.value, options);
    if (response.success && response.tournamentCodes && response.tournamentCodes.length > 0) {
      tournamentCode.value = response.tournamentCodes[0];
      toast.success("Code de tournoi généré avec succès");
    } else {
      toast.error("Échec de la génération du code de tournoi");
    }
  } catch (error) {
    toast.error(`Erreur: ${error.message}`);
  } finally {
    isGeneratingCode.value = false;
  }
};

// Copier le code de tournoi dans le presse-papier
const copyTournamentCode = () => {
  if (!tournamentCode.value) return;
  
  navigator.clipboard.writeText(tournamentCode.value).then(() => {
    toast.success("Code de tournoi copié dans le presse-papier");
  }, () => {
    toast.error("Impossible de copier le code");
  });
};

// Gestion des erreurs de chargement d'image
const handleImageError = (event, type) => {
  if (type === 'champion') {
    //event.target.src = new URL('../assets/default-champion.png', import.meta.url).href;
  } else if (type === 'lane') {
    //event.target.src = new URL('../assets/default-lane.png', import.meta.url).href;
  }
};

// Fonction pour récupérer les icônes des champions avec gestion d'erreur
const getChampionIcon = (champion) => {
  if (!champion) return null;
  const formattedName = formatChampionImageName(champion);
  return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formattedName}.png`;
};

// Fonction pour récupérer les icônes des lanes
const getLaneIcon = (lane) => {
  if (!lane) return new URL('../assets/default-lane.png', import.meta.url).href;
  const extension = lane === 'adc' ? 'png' : 'webp';
  try {
    return new URL(`../assets/${lane}.${extension}`, import.meta.url).href;
  } catch (error) {
    console.warn(`Lane icon not found for ${lane}`);
    return new URL('../assets/default-lane.png', import.meta.url).href;
  }
};

// Basculer l'affichage des détails d'une game
const toggleGameDetails = (gameId) => {
  expandedGames.value[gameId] = !expandedGames.value[gameId];
};

// Fonction pour formater la date
const formatDate = (dateString) => {
  if (!dateString) return 'Date inconnue';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
           ' - ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return 'Date invalide';
  }
};

// Calculer le score KDA pour affichage
const calculateKDA = (player) => {
  if (!player) return '0.0';
  const kills = player.kills || 0;
  const deaths = player.deaths || 0;
  const assists = player.assists || 0;
  
  if (deaths === 0) return 'Perfect';
  
  const kda = ((kills + assists) / deaths).toFixed(1);
  return kda;
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

// Effacer tous les filtres
const clearFilters = () => {
  searchQuery.value = '';
  filterWinner.value = 'all';
  selectedDate.value = null;
  filteredGames.value = [...gamesList.value];
  currentPage.value = 1;
};

// Surveiller les changements de filtres et mettre à jour les résultats
watch([searchQuery, filterWinner, selectedDate], () => {
  filterGames();
}, { debounce: 300 });

onMounted(fetchGames);
</script>

<template>
  <div class="game-history max-w-5xl mx-auto p-4">
    <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">Historique des Games</h2>

    <!-- Sélecteur de mode d'affichage -->
    <div class="mb-4 flex justify-center">
      <div class="bg-white shadow-md rounded-lg p-1 inline-flex">
        <button 
          @click="switchViewMode('normal')" 
          class="px-4 py-2 rounded-md transition-colors" 
          :class="viewMode === 'normal' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'"
        >
          Parties normales
        </button>
        <button 
          @click="switchViewMode('tournament')" 
          class="px-4 py-2 rounded-md transition-colors" 
          :class="viewMode === 'tournament' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'"
        >
          Parties de tournoi
        </button>
      </div>
    </div>
    
    <!-- Panneau de gestion des tournois (visible uniquement en mode tournoi) -->
    <div v-if="viewMode === 'tournament'" class="mb-6">
      <div class="bg-white p-4 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">Gestion des tournois de test</h3>
          <button 
            @click="toggleTournamentPanel" 
            class="text-sm px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
          >
            {{ tournamentPanel ? "Masquer" : "Afficher" }}
          </button>
        </div>
        
        <transition name="expand">
          <div v-if="tournamentPanel" class="space-y-4">
            <!-- Étape 1: Créer un fournisseur -->
            <div class="p-3 border rounded-md bg-gray-50">
              <h4 class="font-medium mb-2">1. Créer un fournisseur de tournoi</h4>
              <div class="flex items-center">
                <button 
                  @click="handleCreateProvider" 
                  class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  :disabled="isCreatingProvider"
                >
                  <span v-if="isCreatingProvider" class="inline-block animate-spin mr-1">⟳</span>
                  Créer un fournisseur
                </button>
                <span v-if="providerId" class="ml-3">
                  ID: <span class="font-mono bg-gray-200 px-1 rounded">{{ providerId }}</span>
                </span>
              </div>
            </div>
            
            <!-- Étape 2: Créer un tournoi -->
            <div class="p-3 border rounded-md bg-gray-50">
              <h4 class="font-medium mb-2">2. Créer un tournoi</h4>
              <div class="mb-2">
                <input 
                  v-model="tournamentName" 
                  type="text" 
                  placeholder="Nom du tournoi" 
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div class="flex items-center">
                <button 
                  @click="handleCreateTournament" 
                  class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  :disabled="isCreatingTournament || !providerId"
                >
                  <span v-if="isCreatingTournament" class="inline-block animate-spin mr-1">⟳</span>
                  Créer un tournoi
                </button>
                <span v-if="tournamentId" class="ml-3">
                  ID: <span class="font-mono bg-gray-200 px-1 rounded">{{ tournamentId }}</span>
                </span>
              </div>
            </div>
            
            <!-- Étape 3: Générer un code de tournoi -->
            <div class="p-3 border rounded-md bg-gray-50">
              <h4 class="font-medium mb-2">3. Générer un code de tournoi</h4>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Taille d'équipe</label>
                  <select 
                    v-model="teamSize" 
                    class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option v-for="n in 5" :key="`team-${n}`" :value="n">{{ n }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Type de spectateurs</label>
                  <select 
                    v-model="spectatorType" 
                    class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option v-for="type in spectatorTypes" :key="`spec-${type}`" :value="type">{{ type }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Type de sélection</label>
                  <select 
                    v-model="pickType" 
                    class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option v-for="type in pickTypes" :key="`pick-${type}`" :value="type">{{ type }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Map</label>
                  <select 
                    v-model="mapType" 
                    class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option v-for="type in mapTypes" :key="`map-${type}`" :value="type">{{ type }}</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center">
                <button 
                  @click="handleGenerateCode" 
                  class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  :disabled="isGeneratingCode || !tournamentId"
                >
                  <span v-if="isGeneratingCode" class="inline-block animate-spin mr-1">⟳</span>
                  Générer un code
                </button>
              </div>
            </div>
            
            <!-- Affichage du code de tournoi -->
            <div v-if="tournamentCode" class="p-3 border-2 border-green-500 rounded-md bg-green-50">
              <h4 class="font-medium text-green-700 mb-2">Code de tournoi généré :</h4>
              <div class="flex items-center">
                <code class="bg-white p-2 border rounded font-mono text-lg flex-grow">{{ tournamentCode }}</code>
                <button 
                  @click="copyTournamentCode" 
                  class="ml-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  title="Copier le code"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Statistiques globales -->
    <div v-if="!isLoading && !error && gamesList.length > 0" class="mb-6 bg-gray-100 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Statistiques {{ viewMode === 'tournament' ? 'des tournois' : '' }}</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-3 rounded shadow-sm">
          <p class="text-sm text-gray-600">Total</p>
          <p class="font-bold text-lg">{{ stats.totalGames }} parties</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <p class="text-sm text-gray-600">Victoires</p>
          <div class="flex justify-between items-center">
            <span class="text-blue-600 font-medium">Bleue: {{ stats.blueWinRate }}%</span>
            <span class="text-red-600 font-medium">Rouge: {{ (100 - stats.blueWinRate).toFixed(1) }}%</span>
          </div>
        </div>
        <div class="bg-white p-3 rounded shadow-sm col-span-2">
          <p class="text-sm text-gray-600">Champion le plus joué</p>
          <div class="flex items-center mt-1">
            <img :src="getChampionIcon(stats.mostPlayedChampion)" class="w-8 h-8 mr-2 rounded" 
                 :alt="stats.mostPlayedChampion" @error="e => handleImageError(e, 'champion')">
            <span class="font-medium">{{ stats.mostPlayedChampion }}</span>
            <span class="text-sm text-gray-500 ml-2">({{ stats.playCount }} fois)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-md">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Joueur ou champion..."
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Équipe gagnante</label>
          <select
            v-model="filterWinner"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes</option>
            <option value="Blue">Équipe Bleue</option>
            <option value="Red">Équipe Rouge</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            v-model="selectedDate"
            type="date"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <button 
          @click="clearFilters" 
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
        >
          Effacer les filtres
        </button>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="isLoading" class="p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
      <p class="text-gray-600">Chargement des parties{{ viewMode === 'tournament' ? ' de tournoi' : '' }}...</p>
    </div>

    <!-- Message d'erreur -->
    <div v-else-if="error" class="p-8 text-center bg-red-50 rounded-lg border border-red-200">
      <p class="text-red-600">{{ error }}</p>
      <button @click="fetchGames" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Réessayer
      </button>
    </div>

    <!-- Pas de résultats -->
    <div v-else-if="filteredGames.length === 0" class="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
      <p v-if="gamesList.length === 0">
        <span v-if="viewMode === 'tournament'">Aucune partie de tournoi disponible.</span>
        <span v-else>Aucune partie disponible.</span>
      </p>
      <p v-else class="text-gray-600">Aucune partie ne correspond à vos critères de recherche.</p>
      <div class="mt-4 space-x-3">
        <button v-if="searchQuery || filterWinner !== 'all' || selectedDate" @click="clearFilters" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Effacer les filtres
        </button>
        <button v-if="viewMode === 'tournament' && !tournamentPanel" @click="toggleTournamentPanel" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Créer un tournoi de test
        </button>
      </div>
    </div>

    <!-- Liste des games -->
    <div v-else>
      <transition-group name="game-list" tag="div" class="space-y-4">
        <div v-for="game in currentGames" :key="game._id" class="border rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
          <!-- En-tête de la partie -->
          <div class="p-4 flex flex-col sm:flex-row justify-between gap-2 items-center" 
               :class="{'bg-blue-50': game.winningTeam === 'Blue', 'bg-red-50': game.winningTeam === 'Red'}">
            <p class="text-gray-700 font-semibold">{{ formatDate(game.createdAt) }}</p>
            <p class="text-sm font-bold" :class="{'text-blue-600': game.winningTeam === 'Blue', 'text-red-600': game.winningTeam === 'Red'}">
              Victoire: {{ game.winningTeam === 'Blue' ? 'Équipe Bleue' : 'Équipe Rouge' }}
            </p>
            <button @click="toggleGameDetails(game._id)" class="text-sm px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">
              {{ expandedGames[game._id] ? "Masquer" : "Voir détails" }}
            </button>
          </div>

          <!-- Information de tournoi si disponible -->
          <div v-if="game.isTournamentMatch && viewMode === 'tournament'" class="px-4 py-2 bg-purple-50 border-b border-purple-100">
            <p class="text-sm text-purple-700">
              <span class="font-semibold">Tournoi:</span> 
              ID: {{ game.tournamentId || 'N/A' }}
              <span v-if="game.tournamentCode" class="ml-2">
                Code: <span class="font-mono">{{ game.tournamentCode }}</span>
              </span>
            </p>
          </div>

          <!-- Aperçu (toujours visible) -->
          <div class="p-3 bg-white flex flex-wrap justify-center gap-2">
            <div class="flex -space-x-2">
              <template v-for="(player, index) in game.players.filter(p => p.side === 'Blue')" :key="`blue-${index}`">
                <img 
                  :src="getChampionIcon(player.champion)" 
                  :alt="player.champion"
                  @error="e => handleImageError(e, 'champion')" 
                  class="w-8 h-8 rounded-full border-2 border-blue-500 bg-gray-100" 
                  :title="`${player.playerId?.name || 'Joueur'} - ${player.champion || 'Champion inconnu'}`"
                />
              </template>
            </div>
            <div class="text-sm font-bold">VS</div>
            <div class="flex -space-x-2">
              <template v-for="(player, index) in game.players.filter(p => p.side === 'Red')" :key="`red-${index}`">
                <img 
                  :src="getChampionIcon(player.champion)" 
                  :alt="player.champion"
                  @error="e => handleImageError(e, 'champion')" 
                  class="w-8 h-8 rounded-full border-2 border-red-500 bg-gray-100" 
                  :title="`${player.playerId?.name || 'Joueur'} - ${player.champion || 'Champion inconnu'}`"
                />
              </template>
            </div>
          </div>

          <!-- Détails de la partie (masqué par défaut) -->
          <transition name="expand">
            <div v-if="expandedGames[game._id]" class="bg-white border-t">
              <!-- Équipe Bleue -->
              <div class="p-4 border-b" :class="{'bg-blue-50': game.winningTeam === 'Blue'}">
                <h3 class="text-lg font-semibold text-blue-600 mb-3">Équipe Bleue</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div v-for="player in game.players.filter(p => p.side === 'Blue')" :key="`blue-detail-${player._id}`" 
                       class="flex items-center p-3 bg-white rounded-md shadow-sm border-l-4 border-blue-500">
                    <img 
                      :src="getChampionIcon(player.champion)" 
                      :alt="player.champion" 
                      @error="e => handleImageError(e, 'champion')"
                      class="w-12 h-12 object-cover rounded-lg"
                    >
                    <div class="flex flex-col ml-3 flex-grow">
                      <span class="font-semibold text-gray-800">{{ player.playerId?.name || 'Joueur inconnu' }}</span>
                      <span class="text-sm text-gray-600">{{ player.champion || 'Champion inconnu' }}</span>
                      <span class="text-xs">
                        KDA: 
                        <span :class="getKDAClass(calculateKDA(player))">
                          {{ player.kills || 0 }}/{{ player.deaths || 0 }}/{{ player.assists || 0 }}
                          ({{ calculateKDA(player) }})
                        </span>
                      </span>
                    </div>
                    <img 
                      :src="getLaneIcon(player.lane)" 
                      :alt="player.lane" 
                      @error="e => handleImageError(e, 'lane')"
                      class="w-6 h-6 ml-auto"
                    >
                  </div>
                </div>
              </div>

              <!-- Équipe Rouge -->
              <div class="p-4" :class="{'bg-red-50': game.winningTeam === 'Red'}">
                <h3 class="text-lg font-semibold text-red-600 mb-3">Équipe Rouge</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div v-for="player in game.players.filter(p => p.side === 'Red')" :key="`red-detail-${player._id}`" 
                       class="flex items-center p-3 bg-white rounded-md shadow-sm border-l-4 border-red-500">
                    <img 
                      :src="getChampionIcon(player.champion)" 
                      :alt="player.champion" 
                      @error="e => handleImageError(e, 'champion')"
                      class="w-12 h-12 object-cover rounded-lg"
                    >
                    <div class="flex flex-col ml-3 flex-grow">
                      <span class="font-semibold text-gray-800">{{ player.playerId?.name || 'Joueur inconnu' }}</span>
                      <span class="text-sm text-gray-600">{{ player.champion || 'Champion inconnu' }}</span>
                      <span class="text-xs">
                        KDA: 
                        <span :class="getKDAClass(calculateKDA(player))">
                          {{ player.kills || 0 }}/{{ player.deaths || 0 }}/{{ player.assists || 0 }}
                          ({{ calculateKDA(player) }})
                        </span>
                      </span>
                    </div>
                    <img 
                      :src="getLaneIcon(player.lane)" 
                      :alt="player.lane" 
                      @error="e => handleImageError(e, 'lane')"
                      class="w-6 h-6 ml-auto"
                    >
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition-group>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <nav class="flex items-center space-x-2">
          <button 
            @click="changePage(currentPage - 1)" 
            :disabled="currentPage === 1"
            :class="{'opacity-50 cursor-not-allowed': currentPage === 1}"
            class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            &lt;
          </button>
          
          <template v-for="page in totalPages" :key="page">
            <button 
              v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
              @click="changePage(page)" 
              :class="{'bg-blue-600 text-white': page === currentPage, 'bg-gray-200 hover:bg-gray-300 text-gray-700': page !== currentPage}"
              class="px-3 py-1 rounded"
            >
              {{ page }}
            </button>
            <span v-else-if="page === 2 || page === totalPages - 1" class="text-gray-500">...</span>
          </template>
          
          <button 
            @click="changePage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            :class="{'opacity-50 cursor-not-allowed': currentPage === totalPages}"
            class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            &gt;
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-list-enter-active,
.game-list-leave-active {
  transition: all 0.5s ease;
}

.game-list-enter-from,
.game-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-out;
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>