// models/Prenda.js
const mongoose = require('mongoose');

const prendaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nombre: { type: String, required: true },
    categoria: { 
        type: String, 
        enum: ['superiores', 'inferiores', 'calzado', 'accesorios'], 
        required: true 
    },
    color: { type: String, required: true },
    imagen: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Prenda', prendaSchema);