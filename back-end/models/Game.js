import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  // Données existantes
  players: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    champion: String,
    kills: Number,
    deaths: Number,
    assists: Number,
    side: String,
    won: Boolean,
    lane: { type: String, enum: ['top', 'mid', 'jungle', 'adc', 'support'], required: true }
  }],
  winningTeam: String,
  createdAt: { type: Date, default: Date.now },
  
  // Métadonnées du match
  gameId: { type: String, index: true },
  tournamentId: String,
  tournamentCode: String,
  platformId: String,
  gameMode: String,
  gameType: String,
  gameVersion: String,
  mapId: Number,
  gameDuration: Number,
  gameCreation: Date,
  
  // Données complètes des équipes
  teams: [{
    teamId: Number,
    win: Boolean,
    firstBlood: Boolean,
    firstTower: Boolean,
    firstInhibitor: Boolean,
    firstBaron: Boolean,
    firstDragon: Boolean,
    firstRiftHerald: Boolean,
    towerKills: Number,
    inhibitorKills: Number,
    baronKills: Number,
    dragonKills: Number,
    riftHeraldKills: Number,
    dominionVictoryScore: Number,
    bans: [{
      championId: Number,
      pickTurn: Number
    }]
  }],
  
  // Données complètes des participants
  participants: [{
    participantId: Number,
    teamId: Number,
    championId: Number,
    championName: String,
    spell1Id: Number,
    spell2Id: Number,
    
    // Stats finales
    stats: {
      win: Boolean,
      item0: Number,
      item1: Number,
      item2: Number,
      item3: Number,
      item4: Number,
      item5: Number,
      item6: Number,
      kills: Number,
      deaths: Number,
      assists: Number,
      largestKillingSpree: Number,
      largestMultiKill: Number,
      killingSprees: Number,
      longestTimeSpentLiving: Number,
      doubleKills: Number,
      tripleKills: Number,
      quadraKills: Number,
      pentaKills: Number,
      totalDamageDealt: Number,
      magicDamageDealt: Number,
      physicalDamageDealt: Number,
      trueDamageDealt: Number,
      totalDamageDealtToChampions: Number,
      magicDamageDealtToChampions: Number,
      physicalDamageDealtToChampions: Number,
      trueDamageDealtToChampions: Number,
      totalHeal: Number,
      totalUnitsHealed: Number,
      damageSelfMitigated: Number,
      damageDealtToObjectives: Number,
      damageDealtToTurrets: Number,
      visionScore: Number,
      timeCCingOthers: Number,
      totalDamageTaken: Number,
      magicalDamageTaken: Number,
      physicalDamageTaken: Number,
      trueDamageTaken: Number,
      goldEarned: Number,
      goldSpent: Number,
      turretKills: Number,
      inhibitorKills: Number,
      totalMinionsKilled: Number,
      neutralMinionsKilled: Number,
      neutralMinionsKilledTeamJungle: Number,
      neutralMinionsKilledEnemyJungle: Number,
      totalTimeCrowdControlDealt: Number,
      champLevel: Number,
      visionWardsBoughtInGame: Number,
      sightWardsBoughtInGame: Number,
      wardsPlaced: Number,
      wardsKilled: Number,
      firstBloodKill: Boolean,
      firstBloodAssist: Boolean,
      firstTowerKill: Boolean,
      firstTowerAssist: Boolean,
      firstInhibitorKill: Boolean,
      firstInhibitorAssist: Boolean,
      combatPlayerScore: Number,
      objectivePlayerScore: Number,
      totalPlayerScore: Number,
      totalScoreRank: Number,
      playerScore0: Number,
      playerScore1: Number,
      playerScore2: Number,
      playerScore3: Number,
      playerScore4: Number,
      playerScore5: Number,
      playerScore6: Number,
      playerScore7: Number,
      playerScore8: Number,
      playerScore9: Number,
      perk0: Number,
      perk0Var1: Number,
      perk0Var2: Number,
      perk0Var3: Number,
      perk1: Number,
      perk1Var1: Number,
      perk1Var2: Number,
      perk1Var3: Number,
      perk2: Number,
      perk2Var1: Number,
      perk2Var2: Number,
      perk2Var3: Number,
      perk3: Number,
      perk3Var1: Number,
      perk3Var2: Number,
      perk3Var3: Number,
      perk4: Number,
      perk4Var1: Number,
      perk4Var2: Number,
      perk4Var3: Number,
      perk5: Number,
      perk5Var1: Number,
      perk5Var2: Number,
      perk5Var3: Number,
      perkPrimaryStyle: Number,
      perkSubStyle: Number,
      statPerk0: Number,
      statPerk1: Number,
      statPerk2: Number
    },
    
    // Timeline du joueur
    timeline: {
      participantId: Number,
      lane: String,
      role: String,
      creepsPerMinDeltas: Map,
      xpPerMinDeltas: Map,
      goldPerMinDeltas: Map,
      csDiffPerMinDeltas: Map,
      xpDiffPerMinDeltas: Map,
      damageTakenPerMinDeltas: Map,
      damageTakenDiffPerMinDeltas: Map
    }
  }],
  
  // Identités des participants
  participantIdentities: [{
    participantId: Number,
    player: {
      platformId: String,
      accountId: String,
      summonerName: String,
      summonerId: String,
      currentPlatformId: String,
      currentAccountId: String,
      matchHistoryUri: String,
      profileIcon: Number
    }
  }],
  
  // Données brutes de Riot (pour avoir accès à tout en cas de modifications de l'API)
  rawData: { type: mongoose.Schema.Types.Mixed }
});

// Ajout d'index pour améliorer les requêtes
GameSchema.index({ 'participantIdentities.player.summonerName': 1 });
GameSchema.index({ 'participants.championId': 1 });
GameSchema.index({ createdAt: -1 });
GameSchema.index({ tournamentId: 1, gameId: 1 }, { unique: true });

export default mongoose.model('Game', GameSchema);