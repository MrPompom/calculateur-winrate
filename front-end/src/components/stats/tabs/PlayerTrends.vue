<script setup>
import { defineProps, computed } from 'vue';
import { getWinRateClass, getWinRateBarClass, getTrendClass, isBestPlayTime } from '../../../utils/styleUtils';
import { formatChampionDisplayName, getChampionImageUrl, formatDayName, formatHour, formatTrend } from '../../../utils/formatters';
import { calculateKDA } from '../../../utils/calculators';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  }
});

// Computed properties pour générer les données d'analyse si elles ne sont pas fournies par le backend
const bestChampSynergies = computed(() => {
  if (props.playerStats.bestChampSynergies) return props.playerStats.bestChampSynergies;
  if (!props.playerStats.champSynergies) return [];
  
  return Object.values(props.playerStats.champSynergies)
    .filter(synergy => synergy.games >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5); // Top 5
});

const worstChampSynergies = computed(() => {
  if (props.playerStats.worstChampSynergies) return props.playerStats.worstChampSynergies;
  if (!props.playerStats.champSynergies) return [];
  
  return Object.values(props.playerStats.champSynergies)
    .filter(synergy => synergy.games >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 5); // 5 pires
});

const bestCounters = computed(() => {
  if (props.playerStats.bestCounters) return props.playerStats.bestCounters;
  if (!props.playerStats.counterStats) return [];
  
  return Object.values(props.playerStats.counterStats)
    .filter(counter => counter.games >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5); // Top 5
});

const worstCounters = computed(() => {
  if (props.playerStats.worstCounters) return props.playerStats.worstCounters;
  if (!props.playerStats.counterStats) return [];
  
  return Object.values(props.playerStats.counterStats)
    .filter(counter => counter.games >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 5); // 5 pires
});

// Traitement de l'erreur d'image
const handleImageError = (event) => {
  // Fallback optional
};
</script>

<template>
  <div class="space-y-6">
    <!-- Analyse des affinités avec les joueurs -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Affinités avec les autres joueurs</h3>
      
      <div v-if="playerStats.affinityStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Colonne "Avec" -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            Quand vous jouez avec
          </h4>
          
          <!-- Meilleurs winrates "avec" -->
          <div class="mb-4">
            <h5 class="text-sm font-medium text-gray-600 mb-2">Meilleurs winrates</h5>
            <div v-if="playerStats.affinityStats.with.best.length > 0" class="space-y-2">
              <div v-for="player in playerStats.affinityStats.with.best" :key="player.name" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="font-medium">{{ player.name }}</span>
                <div class="text-right">
                  <span :class="getWinRateClass(player.winrate/100)" class="font-bold">{{ player.winrate }}%</span>
                  <div class="text-xs text-gray-500">{{ player.wins }}W {{ player.games - player.wins }}L ({{ player.games }} parties)</div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 italic">Aucune donnée disponible</p>
          </div>
          
          <!-- Pires winrates "avec" -->
          <div>
            <h5 class="text-sm font-medium text-gray-600 mb-2">Pires winrates</h5>
            <div v-if="playerStats.affinityStats.with.worst.length > 0" class="space-y-2">
              <div v-for="player in playerStats.affinityStats.with.worst" :key="player.name" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="font-medium">{{ player.name }}</span>
                <div class="text-right">
                  <span :class="getWinRateClass(player.winrate/100)" class="font-bold">{{ player.winrate }}%</span>
                  <div class="text-xs text-gray-500">{{ player.wins }}W {{ player.games - player.wins }}L ({{ player.games }} parties)</div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 italic">Aucune donnée disponible</p>
          </div>
        </div>
        
        <!-- Colonne "Contre" -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            Quand vous jouez contre
          </h4>
          
          <!-- Meilleurs winrates "contre" -->
          <div class="mb-4">
            <h5 class="text-sm font-medium text-gray-600 mb-2">Meilleurs winrates</h5>
            <div v-if="playerStats.affinityStats.against.best.length > 0" class="space-y-2">
              <div v-for="player in playerStats.affinityStats.against.best" :key="player.name" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="font-medium">{{ player.name }}</span>
                <div class="text-right">
                  <span :class="getWinRateClass(player.winrate/100)" class="font-bold">{{ player.winrate }}%</span>
                  <div class="text-xs text-gray-500">{{ player.wins }}W {{ player.games - player.wins }}L ({{ player.games }} parties)</div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 italic">Aucune donnée disponible</p>
          </div>
          
          <!-- Pires winrates "contre" -->
          <div>
            <h5 class="text-sm font-medium text-gray-600 mb-2">Pires winrates</h5>
            <div v-if="playerStats.affinityStats.against.worst.length > 0" class="space-y-2">
              <div v-for="player in playerStats.affinityStats.against.worst" :key="player.name" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="font-medium">{{ player.name }}</span>
                <div class="text-right">
                  <span :class="getWinRateClass(player.winrate/100)" class="font-bold">{{ player.winrate }}%</span>
                  <div class="text-xs text-gray-500">{{ player.wins }}W {{ player.games - player.wins }}L ({{ player.games }} parties)</div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 italic">Aucune donnée disponible</p>
          </div>
        </div>
      </div>
      
      <p v-else class="text-gray-500 text-sm">Pas assez de données pour afficher les affinités</p>
    </div>
    
    <!-- Analyse des synergies de champions -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Synergies de champions</h3>
      
      <div v-if="playerStats.champSynergies && Object.keys(playerStats.champSynergies).length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Meilleures synergies -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Meilleures combinaisons</h4>
          <div class="space-y-3">
            <div v-for="(synergy, index) in bestChampSynergies" :key="index" class="flex items-center p-2 bg-gray-50 rounded">
              <div class="flex items-center gap-1 flex-grow">
                <img 
                  :src="getChampionImageUrl(synergy.playerChamp)" 
                  :alt="formatChampionDisplayName(synergy.playerChamp)"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="handleImageError"
                >
                <span class="text-gray-600 mx-1">+</span>
                <img 
                  :src="getChampionImageUrl(synergy.allyChamp)" 
                  :alt="formatChampionDisplayName(synergy.allyChamp)"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="handleImageError"
                >
                <span class="ml-2 font-medium text-sm">
                  {{ formatChampionDisplayName(synergy.playerChamp) }} + {{ formatChampionDisplayName(synergy.allyChamp) }}
                </span>
              </div>
              <div class="text-right">
                <span :class="getWinRateClass(synergy.winRate)" class="font-bold">
                  {{ (synergy.winRate * 100).toFixed(1) }}%
                </span>
                <div class="text-xs text-gray-500">{{ synergy.games }} parties</div>
              </div>
            </div>
          </div>
          <p v-if="!bestChampSynergies || bestChampSynergies.length === 0" class="text-sm text-gray-500 italic">
            Pas assez de données pour l'analyse
          </p>
        </div>
        
        <!-- Pires synergies -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Combinaisons à éviter</h4>
          <div class="space-y-3">
            <div v-for="(synergy, index) in worstChampSynergies" :key="index" class="flex items-center p-2 bg-gray-50 rounded">
              <div class="flex items-center gap-1 flex-grow">
                <img 
                  :src="getChampionImageUrl(synergy.playerChamp)" 
                  :alt="formatChampionDisplayName(synergy.playerChamp)"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="handleImageError"
                >
                <span class="text-gray-600 mx-1">+</span>
                <img 
                  :src="getChampionImageUrl(synergy.allyChamp)" 
                  :alt="formatChampionDisplayName(synergy.allyChamp)"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="handleImageError"
                >
                <span class="ml-2 font-medium text-sm">
                  {{ formatChampionDisplayName(synergy.playerChamp) }} + {{ formatChampionDisplayName(synergy.allyChamp) }}
                </span>
              </div>
              <div class="text-right">
                <span :class="getWinRateClass(synergy.winRate)" class="font-bold">
                  {{ (synergy.winRate * 100).toFixed(1) }}%
                </span>
                <div class="text-xs text-gray-500">{{ synergy.games }} parties</div>
              </div>
            </div>
          </div>
          <p v-if="!worstChampSynergies || worstChampSynergies.length === 0" class="text-sm text-gray-500 italic">
            Pas assez de données pour l'analyse
          </p>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Pas assez de données pour l'analyse de synergie</p>
    </div>
  
    <!-- Analyse par horaire -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance par horaire</h3>
      
      <div v-if="playerStats.timeStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Performance par jour de la semaine -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Jours de la semaine</h4>
          <div class="space-y-2">
            <div v-for="(stats, day) in playerStats.timeStats.byDay" :key="day" class="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span class="font-medium">{{ formatDayName(day) }}</span>
              <div class="flex items-center">
                <div class="mr-2 text-xs text-gray-500">{{ stats.games }} parties</div>
                <span :class="getWinRateClass(stats.winRate)" class="font-bold">
                  {{ (stats.winRate * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Performance par heure -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Heures de jeu</h4>
          <div class="space-y-2">
            <div v-for="(stats, hour) in playerStats.timeStats.byHour" :key="hour" 
                 class="flex justify-between items-center p-2 bg-gray-50 rounded"
                 :class="{'bg-blue-50': isBestPlayTime(stats)}">
              <span class="font-medium">{{ formatHour(hour) }}</span>
              <div class="flex items-center">
                <div class="mr-2 text-xs text-gray-500">{{ stats.games }} parties</div>
                <span :class="getWinRateClass(stats.winRate)" class="font-bold">
                  {{ (stats.winRate * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2 italic">Les périodes surlignées en bleu sont vos meilleurs moments pour jouer.</p>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Pas assez de données pour l'analyse temporelle</p>
    </div>

    <!-- Analyse des contre-picks -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Analyse des contre-picks</h3>
      
      <div v-if="playerStats.counterStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Champions difficiles à affronter -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Champions difficiles à affronter</h4>
          <div class="space-y-2">
            <div v-for="counter in worstCounters" :key="counter.champion" class="flex items-center p-2 bg-gray-50 rounded">
              <img 
                :src="getChampionImageUrl(counter.champion)" 
                :alt="formatChampionDisplayName(counter.champion)"
                class="w-10 h-10 rounded-full object-cover mr-3"
                @error="handleImageError"
              >
              <div class="flex-grow">
                <div class="font-medium">{{ formatChampionDisplayName(counter.champion) }}</div>
                <div class="text-xs text-gray-500">{{ counter.games }} parties</div>
              </div>
              <span :class="getWinRateClass(counter.winRate)" class="font-bold">
                {{ (counter.winRate * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
          <p v-if="!worstCounters || worstCounters.length === 0" class="text-sm text-gray-500 italic">
            Pas assez de données pour l'analyse
          </p>
        </div>
        
        <!-- Champions faciles à affronter -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Champions faciles à affronter</h4>
          <div class="space-y-2">
            <div v-for="counter in bestCounters" :key="counter.champion" class="flex items-center p-2 bg-gray-50 rounded">
              <img 
                :src="getChampionImageUrl(counter.champion)" 
                :alt="formatChampionDisplayName(counter.champion)"
                class="w-10 h-10 rounded-full object-cover mr-3"
                @error="handleImageError"
              >
              <div class="flex-grow">
                <div class="font-medium">{{ formatChampionDisplayName(counter.champion) }}</div>
                <div class="text-xs text-gray-500">{{ counter.games }} parties</div>
              </div>
              <span :class="getWinRateClass(counter.winRate)" class="font-bold">
                {{ (counter.winRate * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
          <p v-if="!bestCounters || bestCounters.length === 0" class="text-sm text-gray-500 italic">
            Pas assez de données pour l'analyse
          </p>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Pas assez de données pour l'analyse des contre-picks</p>
    </div>
    
    <!-- Évolution des performances -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Évolution des performances</h3>
      
      <div v-if="playerStats.performanceTrends" class="space-y-4">
        <!-- Tendance des 20 dernières parties -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-2">Tendance récente (20 dernières parties)</h4>
          
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="text-sm text-gray-600">Win Rate: </span>
              <span :class="getWinRateClass(playerStats.performanceTrends.recent.winRate)" class="font-bold">
                {{ (playerStats.performanceTrends.recent.winRate * 100).toFixed(1) }}%
              </span>
              <span class="text-sm text-gray-500 ml-1">
                ({{ playerStats.performanceTrends.recent.wins }}W {{ playerStats.performanceTrends.recent.games - playerStats.performanceTrends.recent.wins }}L)
              </span>
            </div>
            <div>
              <span :class="getTrendClass(playerStats.performanceTrends.recent.trend)" class="text-sm font-medium">
                {{ formatTrend(playerStats.performanceTrends.recent.trend) }}
              </span>
            </div>
          </div>
          
          <!-- Visualisation de la tendance -->
          <div class="h-8 flex items-center">
            <div v-for="(result, index) in playerStats.performanceTrends.results" :key="index" 
                 class="h-6 w-3 mx-0.5 rounded-sm transition-all"
                 :class="result ? 'bg-blue-500' : 'bg-red-400'">
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-1">Résultats des 20 dernières parties (de gauche à droite)</div>
        </div>
        
        <!-- Comparaison avec les performances passées -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Comparaison avec vos performances passées</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 rounded bg-gray-50">
              <div class="text-sm text-gray-600">Win Rate récent</div>
              <div :class="getWinRateClass(playerStats.performanceTrends.recent.winRate)" class="font-bold text-xl">
                {{ (playerStats.performanceTrends.recent.winRate * 100).toFixed(1) }}%
              </div>
              <div class="text-xs text-gray-500">20 dernières parties</div>
            </div>
            
            <div class="p-3 rounded bg-gray-50">
              <div class="text-sm text-gray-600">Win Rate global</div>
              <div :class="getWinRateClass(playerStats.winRate)" class="font-bold text-xl">
                {{ (playerStats.winRate * 100).toFixed(1) }}%
              </div>
              <div class="text-xs text-gray-500">Toutes parties ({{ playerStats.gamesPlayed }})</div>
            </div>
            
            <div class="p-3 rounded bg-gray-50">
              <div class="text-sm text-gray-600">KDA récent</div>
              <div :class="playerStats.performanceTrends.recent.kda ? 'text-blue-600 font-bold' : ''" class="font-bold">
                {{ playerStats.performanceTrends.recent.kda ? playerStats.performanceTrends.recent.kda.toFixed(2) : 'N/A' }}
              </div>
              <div class="text-xs text-gray-500">20 dernières parties</div>
            </div>
            
            <div class="p-3 rounded bg-gray-50">
              <div class="text-sm text-gray-600">KDA global</div>
              <div :class="calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0) === 'Perfect' ? 'text-purple-600 font-bold' : 'text-blue-600'" class="font-bold">
                {{ calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0) }}
              </div>
              <div class="text-xs text-gray-500">Toutes parties</div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Pas assez de données pour l'analyse des tendances</p>
    </div>
  </div>
</template>