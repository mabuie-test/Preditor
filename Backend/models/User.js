// models/User.js

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

// Definição do Schema para utilizador
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,       // Garante que não haja dois utilizadores com o mesmo username
    required: true,
    trim: true,         // Remove espaços antes e depois
    lowercase: true      // Converte para minúsculas para evitar duplicação (Ex.: “Admin” vs “admin”)
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'], // Apenas estes dois perfis
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Antes de salvar o utilizador, faz o hash da password se ela tiver sido modificada ou for nova
userSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) {
    return next();
  }

  try {
    // Geração do salt e hash da password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// Método para comparar password plain text com o hash guardado
userSchema.methods.comparePassword = async function(candidatePassword) {
  // `this.password` é o hash
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
