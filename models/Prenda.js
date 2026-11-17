// models/Prenda.js
const mongoose = require('mongoose');

const prendaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: { 
        type: String, 
        enum: ['superiores', 'inferiores', 'calzado', 'accesorios'], 
        required: true 
    },
    color: { type: String, required: true },
    imagen: { type: String, required: true } // Guardará la ruta, ej: "/img/17123456.jpg"
}, { timestamps: true });

module.exports = mongoose.model('Prenda', prendaSchema);