<template>
  <header>
    <h1>League of Legends Stats Tracker</h1>
    <nav>
      <router-link to="/">🏆 Ajouter une game</router-link>
      <router-link to="/stats">📊 Voir les stats</router-link>
      <router-link to="/history">Historique</router-link>
    </nav>
  </header>
  <main>
    <router-view />
  </main>
</template>

<style scoped>
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2c3e50;
  color: white;
  padding: 15px 0;
}

h1 {
  margin: 0;
  font-size: 24px;
}

nav {
  margin-top: 10px;
  display: flex;
  gap: 20px;
}

nav a {
  text-decoration: none;
  color: white;
  font-weight: bold;
  padding: 8px 12px;
  border-radius: 5px;
  transition: background 0.3s;
}

nav a:hover {
  background: #34495e;
}

main {
  padding: 20px;
}
</style>