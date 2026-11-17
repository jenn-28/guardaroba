// controllers/prendaController.js
const Prenda = require('../models/Prenda');
const Outfit = require('../models/Outfit');
const fs = require('fs');
const path = require('path');

exports.obtenerPrendas = async (req, res) => {
    try {
        const prendas = await Prenda.find().sort({ createdAt: -1 });
        res.json({ success: true, prendas });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener prendas' });
    }
};

exports.crearPrenda = async (req, res) => {
    try {
        const { nombre, categoria, color } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar una imagen' });
        }

        const nuevaPrenda = new Prenda({
            nombre,
            categoria,
            color: color.toLowerCase(),
            imagen: `/img/${req.file.filename}`
        });

        await nuevaPrenda.save();
        res.status(201).json({ success: true, message: 'Prenda añadida al clóset', prenda: nuevaPrenda });
    } catch (error) {
        console.error('Error al crear prenda:', error);
        res.status(500).json({ success: false, message: 'Error al guardar la prenda' });
    }
};

exports.actualizarPrenda = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            nombre: req.body.nombre,
            categoria: req.body.categoria,
            color: req.body.color?.toLowerCase()
        };

        if (req.file) {
            datos.imagen = `/img/${req.file.filename}`;
        }

        const prenda = await Prenda.findByIdAndUpdate(id, datos, { new: true });
        res.json({ success: true, message: 'Prenda actualizada', prenda });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar prenda' });
    }
};

exports.eliminarPrenda = async (req, res) => {
    try {
        const { id } = req.params;
        const prenda = await Prenda.findByIdAndDelete(id);

        if (prenda && prenda.imagen) {
            const rutaImg = path.join(__dirname, '../public', prenda.imagen);
            if (fs.existsSync(rutaImg)) fs.unlinkSync(rutaImg);
        }

        res.json({ success: true, message: 'Prenda eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar prenda' });
    }
};

exports.guardarOutfit = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || items.length < 2) {
            return res.status(400).json({ success: false, message: 'Selecciona al menos 2 prendas' });
        }

        const nuevoOutfit = new Outfit({ items });
        await nuevoOutfit.save();
        res.status(201).json({ success: true, message: '¡Combinación guardada!', outfit: nuevoOutfit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar combinación' });
    }
};

exports.obtenerOutfits = async (req, res) => {
    try {
        const outfits = await Outfit.find().populate('items').sort({ createdAt: -1 });
        res.json({ success: true, outfits });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener combinaciones' });
    }
};