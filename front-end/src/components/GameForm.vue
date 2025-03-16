<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { getAllPlayers, addGame, addPlayer } from '../services/api_service';
import championsData from '../data/champions.json';
import { ModelSelect } from 'vue-search-select';
import 'vue-search-select/dist/VueSearchSelect.css';
import { useToast } from 'vue-toastification';

// Toast pour les notifications
const toast = useToast();

// États réactifs
const playersList = ref([]);
const newPlayerName = ref('');
const newPlayerNameError = ref('');
const championsList = ref([]);
const isSubmitting = ref(false);
const isLoading = ref(true);
const errors = reactive({
  winningTeam: false,
  playerErrors: {},
  duplicatePlayers: []
});

// Constantes
const lanesList = [
  { value: 'top', label: 'Top', icon: 'top.webp' },
  { value: 'jungle', label: 'Jungle', icon: 'jungle.webp' },
  { value: 'mid', label: 'Mid', icon: 'mid.webp' },
  { value: 'adc', label: 'ADC', icon: 'adc.png' },
  { value: 'support', label: 'Support', icon: 'support.webp' }
];

// Initialiser l'état du formulaire
const initialPlayerState = {
  player: '',
  champion: '',
  kills: 0,
  deaths: 0,
  assists: 0,
  lane: '',
  won: false
};

const gameData = reactive({
  blueTeam: Array(5).fill().map(() => ({ ...initialPlayerState })),
  redTeam: Array(5).fill().map(() => ({ ...initialPlayerState })),
  winningTeam: ''
});

// Computed properties
const formIsValid = computed(() => {
  return !hasPlayerErrors.value && 
         !hasDuplicatePlayers.value && 
         gameData.winningTeam !== '' &&
         allRequiredFieldsFilled.value;
});

const hasPlayerErrors = computed(() => {
  return Object.values(errors.playerErrors).some(hasError => hasError);
});

const hasDuplicatePlayers = computed(() => {
  return errors.duplicatePlayers.length > 0;
});

const allPlayers = computed(() => {
  return [...gameData.blueTeam, ...gameData.redTeam];
});

const allRequiredFieldsFilled = computed(() => {
  // Vérifie que tous les champs nécessaires sont remplis
  return allPlayers.value.every(player => 
    player.player && player.champion && player.lane
  );
});

// Récupération des joueurs
const fetchPlayers = async () => {
  isLoading.value = true;
  try {
    playersList.value = await getAllPlayers();
    if (playersList.value.length === 0) {
      toast.info("Aucun joueur trouvé. Créez de nouveaux joueurs pour commencer.");
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
    toast.error("Impossible de récupérer la liste des joueurs.");
  } finally {
    isLoading.value = false;
  }
};

// Chargement des champions
const loadChampions = () => {
  // Tri alphabétique
  const sortedChampions = [...championsData.champions].sort();
  championsList.value = sortedChampions.map(c => ({ 
    value: c, 
    text: c
  }));
};

// Création d'un nouveau joueur
const createPlayer = async () => {
  if (!newPlayerName.value.trim()) {
    newPlayerNameError.value = "Le nom du joueur est requis";
    return;
  }
  
  // Vérifier si le joueur existe déjà
  if (playersList.value.some(p => p.name.toLowerCase() === newPlayerName.value.toLowerCase())) {
    newPlayerNameError.value = "Ce joueur existe déjà";
    return;
  }
  
  try {
    isLoading.value = true;
    await addPlayer(newPlayerName.value);
    toast.success(`Joueur "${newPlayerName.value}" créé avec succès`);
    newPlayerName.value = '';
    newPlayerNameError.value = '';
    await fetchPlayers();
  } catch (error) {
    console.error('Erreur lors de la création du joueur', error);
    toast.error("Erreur lors de la création du joueur");
  } finally {
    isLoading.value = false;
  }
};

// Fonction pour l'icône de lane
const getLaneIcon = (lane) => {
  const laneObj = lanesList.find(l => l.value === lane);
  if (!laneObj) return '';
  
  try {
    return new URL(`../assets/${laneObj.icon}`, import.meta.url).href;
  } catch (error) {
    console.warn(`Icône de lane non trouvée pour ${lane}`);
    return '';
  }
};

// URL de l'image champion pour la prévisualisation
const getChampionImage = (championName) => {
  if (!championName) return '';
  
  // Format du nom pour l'URL (même logique que dans game-history)
  const formattedName = formatChampionName(championName);
  return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formattedName}.png`;
};

// Formatage du nom du champion pour les URL d'images
const formatChampionName = (championName) => {
  if (!championName) return 'Default';
  
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
  if (specialCases[championName]) {
    return specialCases[championName];
  }

  // Sinon appliquer la logique standard
  return championName
    .replace(/\s+/g, '')   // Supprime les espaces
    .replace(/_/g, '')     // Supprime les underscores
    .replace(/'/g, '')     // Supprime les apostrophes
    .replace(/\./g, '')    // Supprime les points
    .replace(/&/g, '');    // Supprime les &
};

// Validation et soumission du formulaire
const submitGame = async () => {
  // Vérifier si l'équipe gagnante est sélectionnée
  if (!gameData.winningTeam) {
    errors.winningTeam = true;
    toast.error("Veuillez sélectionner l'équipe gagnante");
    return;
  }
  
  // Vérifier les erreurs validées par watched computed
  if (!formIsValid.value) {
    toast.error("Veuillez corriger les erreurs avant de soumettre");
    return;
  }
  
  // Formater les données des joueurs
  const formattedPlayers = [
    ...gameData.blueTeam.map(player => ({
      name: player.player,
      champion: player.champion,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      side: "Blue",
      lane: player.lane,
      won: gameData.winningTeam === "Blue"
    })),
    ...gameData.redTeam.map(player => ({
      name: player.player,
      champion: player.champion,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      side: "Red",
      lane: player.lane,
      won: gameData.winningTeam === "Red"
    }))
  ];

  try {
    isSubmitting.value = true;
    await addGame({ players: formattedPlayers, winningTeam: gameData.winningTeam });
    toast.success('Game ajoutée avec succès !');
    resetForm();
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la game', error);
    toast.error('Erreur lors de l\'ajout de la game');
  } finally {
    isSubmitting.value = false;
  }
};

// Réinitialisation du formulaire
const resetForm = () => {
  gameData.blueTeam = Array(5).fill().map(() => ({ ...initialPlayerState }));
  gameData.redTeam = Array(5).fill().map(() => ({ ...initialPlayerState }));
  gameData.winningTeam = '';
  errors.winningTeam = false;
  errors.playerErrors = {};
  errors.duplicatePlayers = [];
};

// Initialiser avec les matchs précédents (dernière composition)
const useLastGame = () => {
  // Fonctionnalité à implémenter si on a accès aux games précédentes
  toast.info("Cette fonctionnalité sera disponible prochainement");
};

// Fonctions utilitaires
const ensurePositiveValue = (event, player, field) => {
  if (event.target.value < 0) {
    player[field] = 0;
  }
};

// Vérifier les doublons de joueurs entre les équipes
const checkDuplicatePlayers = () => {
  const playersMap = new Map();
  errors.duplicatePlayers = [];
  
  // Collecter tous les joueurs
  [...gameData.blueTeam, ...gameData.redTeam].forEach((player, index) => {
    if (player.player) {
      if (playersMap.has(player.player)) {
        errors.duplicatePlayers.push(player.player);
      } else {
        playersMap.set(player.player, true);
      }
    }
  });
};

// Préremplir les joueurs et les champions
const useQuickTemplate = () => {
  if (playersList.value.length < 10) {
    toast.warning("Vous avez besoin d'au moins 10 joueurs pour utiliser cette fonction");
    return;
  }
  
  // Shuffle et prendre les 10 premiers joueurs
  const shuffledPlayers = [...playersList.value].sort(() => Math.random() - 0.5).slice(0, 10);
  const shuffledChampions = [...championsList.value].sort(() => Math.random() - 0.5).slice(0, 10);
  
  // Distribuer aléatoirement les joueurs et champions dans les équipes
  for (let i = 0; i < 5; i++) {
    // Équipe bleue
    gameData.blueTeam[i].player = shuffledPlayers[i].name;
    gameData.blueTeam[i].champion = shuffledChampions[i].value;
    gameData.blueTeam[i].lane = lanesList[i].value;
    
    // Équipe rouge
    gameData.redTeam[i].player = shuffledPlayers[i+5].name;
    gameData.redTeam[i].champion = shuffledChampions[i+5].value;
    gameData.redTeam[i].lane = lanesList[i].value;
  }
  
  // Assigner des KDA aléatoires
  [...gameData.blueTeam, ...gameData.redTeam].forEach(player => {
    player.kills = Math.floor(Math.random() * 15);
    player.deaths = Math.floor(Math.random() * 10);
    player.assists = Math.floor(Math.random() * 20);
  });
  
  // Équipe gagnante aléatoire
  gameData.winningTeam = Math.random() > 0.5 ? 'Blue' : 'Red';
  
  toast.success("Modèle appliqué ! Vous pouvez maintenant ajuster les statistiques.");
};

// Contrôle de la molette sur les inputs numériques
const handleWheel = (event, player, field, increment) => {
  event.preventDefault();
  const newValue = Math.max(0, player[field] + increment);
  player[field] = newValue;
};

// Observer les changements pour la validation en temps réel
watch(allPlayers, () => {
  checkDuplicatePlayers();
}, { deep: true });

// Initialiser au chargement de la page
onMounted(() => {
  fetchPlayers();
  loadChampions();
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 bg-white shadow-md rounded-lg">
    <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">Ajouter une partie</h2>

    <!-- Barre d'outils supérieure -->
    <div class="flex flex-wrap gap-3 justify-between items-center mb-6 bg-gray-50 p-4 rounded-lg">
      <!-- Création de joueur -->
      <div class="flex flex-wrap gap-2 items-center flex-grow">
        <input
          v-model="newPlayerName"
          placeholder="Nom du joueur"
          class="p-2 border rounded-md shadow-sm flex-grow max-w-xs"
          :class="{'border-red-500': newPlayerNameError}"
        >
        <button
          @click="createPlayer"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
          <span>Créer</span>
        </button>
        <div v-if="newPlayerNameError" class="w-full text-red-500 text-sm mt-1">{{ newPlayerNameError }}</div>
      </div>

      <!-- Actions rapides -->
      <div class="flex gap-2">
        <button
          @click="useQuickTemplate"
          class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm flex items-center"
          title="Remplir automatiquement avec des données aléatoires"
        >
          <span>Remplissage rapide</span>
        </button>
        <button
          @click="resetForm"
          class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm flex items-center"
          title="Réinitialiser le formulaire"
        >
          <span>Réinitialiser</span>
        </button>
      </div>
    </div>

    <!-- Sélection du gagnant -->
    <div class="flex justify-center mb-6">
      <div class="relative">
        <label class="text-lg font-medium mr-4">Équipe Gagnante :</label>
        <select
          v-model="gameData.winningTeam"
          class="p-2 border rounded-md shadow-sm"
          :class="{'border-red-500': errors.winningTeam}"
        >
          <option value="">Sélectionner une équipe</option>
          <option value="Blue">Équipe Bleue</option>
          <option value="Red">Équipe Rouge</option>
        </select>
        <p v-if="errors.winningTeam" class="absolute text-red-500 text-sm mt-1">Veuillez sélectionner l'équipe gagnante</p>
      </div>
    </div>

    <!-- Doublons détectés -->
    <div v-if="errors.duplicatePlayers.length > 0" class="p-4 bg-yellow-50 border border-yellow-300 rounded-md mb-6">
      <p class="text-yellow-800 font-medium">Joueurs en double détectés :</p>
      <ul class="mt-1 text-yellow-700 text-sm">
        <li v-for="(player, index) in errors.duplicatePlayers" :key="index">
          {{ player }} apparaît plus d'une fois dans les équipes
        </li>
      </ul>
    </div>

    <!-- Équipes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Équipe Bleue -->
      <div class="bg-blue-50 p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-blue-700 mb-4 flex items-center">
          <span class="bg-blue-500 w-4 h-4 rounded-full mr-2"></span>
          Équipe Bleue
          <span v-if="gameData.winningTeam === 'Blue'" class="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Gagnant</span>
        </h3>
        
        <div 
          v-for="(player, index) in gameData.blueTeam" 
          :key="`blue-${index}`" 
          class="mb-4 bg-white p-3 rounded-md shadow-sm border-l-4 border-blue-500"
        >
          <div class="flex flex-wrap gap-2 mb-2">
            <!-- Sélecteur de joueur -->
            <div class="w-full sm:w-auto flex-grow">
              <label class="block text-xs text-gray-500 mb-1">Joueur</label>
              <ModelSelect 
                v-model="player.player" 
                :options="playersList.map(p => ({ value: p.name, text: p.name }))" 
                placeholder="Joueur" 
                class="w-full sm:min-w-[180px]"
                :class="{'border-red-500': errors.playerErrors[`blue-${index}-player`]}"
              />
            </div>
            
            <!-- Sélecteur de champion avec aperçu -->
            <div class="w-full sm:w-auto flex-grow">
              <label class="block text-xs text-gray-500 mb-1">Champion</label>
              <div class="flex gap-2 items-center">
                <ModelSelect 
                  v-model="player.champion" 
                  :options="championsList" 
                  placeholder="Champion" 
                  class="w-full sm:min-w-[180px]"
                  :class="{'border-red-500': errors.playerErrors[`blue-${index}-champion`]}"
                />
                <img 
                  v-if="player.champion" 
                  :src="getChampionImage(player.champion)" 
                  :alt="player.champion"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="$event.target.style.display = 'none'"
                />
              </div>
            </div>
            
            <!-- Sélecteur de lane -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">Lane</label>
              <div class="flex items-center gap-2">
                <select 
                  v-model="player.lane" 
                  class="p-2 border rounded-md shadow-sm"
                  :class="{'border-red-500': errors.playerErrors[`blue-${index}-lane`]}"
                >
                  <option value="">Lane</option>
                  <option v-for="lane in lanesList" :key="`blue-lane-${lane.value}`" :value="lane.value">
                    {{ lane.label }}
                  </option>
                </select>
                <img 
                  v-if="player.lane" 
                  :src="getLaneIcon(player.lane)" 
                  :alt="player.lane"
                  class="w-6 h-6"
                />
              </div>
            </div>
          </div>
          
          <!-- Statistiques KDA -->
          <div class="flex items-center gap-4 mt-3">
            <div class="flex items-end gap-1">
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Kills</label>
                <input 
                  type="number" 
                  v-model.number="player.kills" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'kills')" 
                  @wheel.prevent="handleWheel($event, player, 'kills', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
              <span class="text-lg text-gray-500">/</span>
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Deaths</label>
                <input 
                  type="number" 
                  v-model.number="player.deaths" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'deaths')" 
                  @wheel.prevent="handleWheel($event, player, 'deaths', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
              <span class="text-lg text-gray-500">/</span>
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Assists</label>
                <input 
                  type="number" 
                  v-model.number="player.assists" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'assists')" 
                  @wheel.prevent="handleWheel($event, player, 'assists', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Équipe Rouge -->
      <div class="bg-red-50 p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-red-700 mb-4 flex items-center">
          <span class="bg-red-500 w-4 h-4 rounded-full mr-2"></span>
          Équipe Rouge
          <span v-if="gameData.winningTeam === 'Red'" class="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Gagnant</span>
        </h3>
        
        <div 
          v-for="(player, index) in gameData.redTeam" 
          :key="`red-${index}`" 
          class="mb-4 bg-white p-3 rounded-md shadow-sm border-l-4 border-red-500"
        >
          <div class="flex flex-wrap gap-2 mb-2">
            <!-- Sélecteur de joueur -->
            <div class="w-full sm:w-auto flex-grow">
              <label class="block text-xs text-gray-500 mb-1">Joueur</label>
              <ModelSelect 
                v-model="player.player" 
                :options="playersList.map(p => ({ value: p.name, text: p.name }))" 
                placeholder="Joueur" 
                class="w-full sm:min-w-[180px]"
                :class="{'border-red-500': errors.playerErrors[`red-${index}-player`]}"
              />
            </div>
            
            <!-- Sélecteur de champion avec aperçu -->
            <div class="w-full sm:w-auto flex-grow">
              <label class="block text-xs text-gray-500 mb-1">Champion</label>
              <div class="flex gap-2 items-center">
                <ModelSelect 
                  v-model="player.champion" 
                  :options="championsList" 
                  placeholder="Champion" 
                  class="w-full sm:min-w-[180px]"
                  :class="{'border-red-500': errors.playerErrors[`red-${index}-champion`]}"
                />
                <img 
                  v-if="player.champion" 
                  :src="getChampionImage(player.champion)" 
                  :alt="player.champion"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="$event.target.style.display = 'none'"
                />
              </div>
            </div>
            
            <!-- Sélecteur de lane -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">Lane</label>
              <div class="flex items-center gap-2">
                <select 
                  v-model="player.lane" 
                  class="p-2 border rounded-md shadow-sm"
                  :class="{'border-red-500': errors.playerErrors[`red-${index}-lane`]}"
                >
                  <option value="">Lane</option>
                  <option v-for="lane in lanesList" :key="`red-lane-${lane.value}`" :value="lane.value">
                    {{ lane.label }}
                  </option>
                </select>
                <img 
                  v-if="player.lane" 
                  :src="getLaneIcon(player.lane)" 
                  :alt="player.lane"
                  class="w-6 h-6"
                />
              </div>
            </div>
          </div>
          
          <!-- Statistiques KDA -->
          <div class="flex items-center gap-4 mt-3">
            <div class="flex items-end gap-1">
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Kills</label>
                <input 
                  type="number" 
                  v-model.number="player.kills" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'kills')" 
                  @wheel.prevent="handleWheel($event, player, 'kills', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
              <span class="text-lg text-gray-500">/</span>
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Deaths</label>
                <input 
                  type="number" 
                  v-model.number="player.deaths" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'deaths')" 
                  @wheel.prevent="handleWheel($event, player, 'deaths', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
              <span class="text-lg text-gray-500">/</span>
              <div class="flex flex-col items-center">
                <label class="text-xs text-gray-500 mb-1">Assists</label>
                <input 
                  type="number" 
                  v-model.number="player.assists" 
                  min="0" 
                  @input="ensurePositiveValue($event, player, 'assists')" 
                  @wheel.prevent="handleWheel($event, player, 'assists', $event.deltaY > 0 ? -1 : 1)"
                  class="w-14 p-2 border rounded-md shadow-sm text-center"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bouton de soumission -->
    <div class="text-center mt-8">
      <button 
        @click="submitGame" 
        class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center mx-auto"
        :disabled="isSubmitting || !formIsValid"
        :class="{'opacity-50 cursor-not-allowed': isSubmitting || !formIsValid}"
      >
        <span v-if="isSubmitting" class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
        <span>{{ isSubmitting ? 'Ajout en cours...' : 'Ajouter la partie' }}</span>
      </button>
      <p v-if="!formIsValid && (!allRequiredFieldsFilled || hasPlayerErrors)" class="text-sm text-red-500 mt-2">
        Veuillez remplir tous les champs obligatoires (joueur, champion et lane) pour chaque joueur
      </p>
      <p v-else-if="!formIsValid && hasDuplicatePlayers" class="text-sm text-red-500 mt-2">
        Veuillez corriger les joueurs en double
      </p>
      <p v-else-if="!formIsValid && !gameData.winningTeam" class="text-sm text-red-500 mt-2">
        Veuillez sélectionner l'équipe gagnante
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Amélioration du style des inputs numériques */
input[type="number"] {
  -moz-appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Styles pour les transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>