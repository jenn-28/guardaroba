// models/Outfit.js
const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipo: { type: String, enum: ['auto', 'favorito'], default: 'favorito' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prenda', required: true }]
}, { timestamps: true });

module.exports = mongoose.model('Outfit', outfitSchema);