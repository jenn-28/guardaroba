// models/Outfit.js
const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prenda', required: true }]
}, { timestamps: true });

module.exports = mongoose.model('Outfit', outfitSchema);