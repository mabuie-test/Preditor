const mongoose = require('mongoose');

const partidaSchema = new mongoose.Schema({
  valor:   { type: String, required: true },
  data:    { type: Date, default: Date.now },
  fonte:   { type: String, default: 'screenshot' }
});

module.exports = mongoose.model('Partida', partidaSchema);
