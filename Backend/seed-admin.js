// seed-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function criarAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Defina aqui as credenciais do admin inicial
    const adminData = {
      username: 'iniciolento',
      password: '846696059.k',
      role: 'admin'
    };

    // Verifica se já existe um utilizador com esse username
    const exists = await User.findOne({ username: adminData.username });
    if (exists) {
      console.log(`O utilizador '${adminData.username}' já existe.`);
      process.exit(0);
    }

    // Cria e guarda o admin
    const admin = new User(adminData);
    await admin.save();

    console.log('Admin criado com sucesso:');
    console.log(`  username: ${admin.username}`);
    console.log(`  role:     ${admin.role}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar admin:', err);
    process.exit(1);
  }
}

criarAdmin();
