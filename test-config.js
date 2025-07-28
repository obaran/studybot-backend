// =============================================================================
// SCRIPT DE TEST CONFIGURATION WIDGET
// =============================================================================

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testConfiguration() {
  console.log('🧪 Test de la configuration widget...\n');

  try {
    // 1. Récupérer la configuration actuelle
    console.log('1️⃣ Récupération configuration actuelle...');
    const currentConfig = await axios.get(`${API_BASE}/admin/configuration`);
    console.log('✅ Configuration actuelle:', {
      token: currentConfig.data.token,
      welcomeMessage: currentConfig.data.welcomeMessage,
      primaryColor: currentConfig.data.primaryColor,
      position: currentConfig.data.position
    });

    // 2. Modifier la configuration
    console.log('\n2️⃣ Modification de la configuration...');
    const updates = {
      welcomeMessage: `Test de configuration - ${new Date().toLocaleTimeString()}`,
      primaryColor: '#ff6b35',
      secondaryColor: '#f7931e',
      position: 'bottom-left'
    };

    const updatedConfig = await axios.put(`${API_BASE}/admin/configuration`, updates);
    console.log('✅ Configuration mise à jour:', {
      welcomeMessage: updatedConfig.data.welcomeMessage,
      primaryColor: updatedConfig.data.primaryColor,
      position: updatedConfig.data.position
    });

    // 3. Vérifier que la configuration publique est mise à jour
    console.log('\n3️⃣ Vérification configuration publique...');
    const publicConfig = await axios.get(`${API_BASE}/widget/config/${updatedConfig.data.token}`);
    console.log('✅ Configuration publique:', {
      welcomeMessage: publicConfig.data.welcomeMessage,
      primaryColor: publicConfig.data.primaryColor,
      position: publicConfig.data.position
    });

    // 4. Générer les liens d'intégration
    console.log('\n4️⃣ Génération des liens d\'intégration...');
    const integrationLinks = await axios.post(`${API_BASE}/admin/configuration/integration-links`);
    console.log('✅ Liens générés:');
    console.log('🔗 Lien direct:', integrationLinks.data.directLink);
    console.log('📱 Widget popup disponible dans le dashboard pour test');

    // 5. Restaurer la configuration originale
    console.log('\n5️⃣ Restauration configuration originale...');
    const originalConfig = {
      welcomeMessage: currentConfig.data.welcomeMessage,
      primaryColor: currentConfig.data.primaryColor,
      secondaryColor: currentConfig.data.secondaryColor,
      position: currentConfig.data.position
    };

    await axios.put(`${API_BASE}/admin/configuration`, originalConfig);
    console.log('✅ Configuration restaurée');

    console.log('\n🎉 Test de configuration terminé avec succès !');
    console.log('💡 Conseil: Ouvrez le dashboard et testez le widget popup pour voir les changements en temps réel');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
  }
}

// Exécuter le test
testConfiguration();
