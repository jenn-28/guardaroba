// controllers/prendaController.js
const Prenda = require('../models/Prenda');
const Outfit = require('../models/Outfit');
const fs = require('fs');
const path = require('path');

// OBTENER PRENDAS DEL USUARIO
exports.obtenerPrendas = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: 'Usuario no identificado' });

        const prendas = await Prenda.find({ usuario: userId }).sort({ createdAt: -1 });
        res.json({ success: true, prendas });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener prendas' });
    }
};

// SUBIR PRENDA VINCULADA AL USUARIO
exports.crearPrenda = async (req, res) => {
    try {
        const { nombre, categoria, color, userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'Sesión no válida' });
        if (!req.file) return res.status(400).json({ success: false, message: 'Debes seleccionar una imagen' });

        const nuevaPrenda = new Prenda({
            usuario: userId,
            nombre,
            categoria,
            color: color.toLowerCase(),
            imagen: `/img/${req.file.filename}`
        });

        await nuevaPrenda.save();
        res.status(201).json({ success: true, message: 'Prenda añadida a tu clóset', prenda: nuevaPrenda });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar la prenda' });
    }
};

// MODIFICAR PRENDA
exports.actualizarPrenda = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            nombre: req.body.nombre,
            categoria: req.body.categoria,
            color: req.body.color?.toLowerCase()
        };
        if (req.file) datos.imagen = `/img/${req.file.filename}`;

        const prenda = await Prenda.findByIdAndUpdate(id, datos, { new: true });
        res.json({ success: true, message: 'Prenda actualizada', prenda });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar prenda' });
    }
};

// ELIMINAR PRENDA
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

// GUARDAR COMBINACIÓN (AUTO DRESS O FAVORITO)
exports.guardarOutfit = async (req, res) => {
    try {
        const { items, userId, tipo } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'Usuario no identificado' });
        if (!items || items.length < 2) {
            return res.status(400).json({ success: false, message: 'Se requieren al menos 2 prendas' });
        }

        const nuevoOutfit = new Outfit({
            usuario: userId,
            tipo: tipo || 'favorito',
            items
        });
        await nuevoOutfit.save();

        const msg = tipo === 'auto' ? 'Combinación guardada en historial ✨' : '¡Guardado en Favoritos! 💖';
        res.status(201).json({ success: true, message: msg, outfit: nuevoOutfit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar combinación' });
    }
};

// OBTENER OUTFITS DEL USUARIO (FILTRADOS POR TIPO)
exports.obtenerOutfits = async (req, res) => {
    try {
        const { userId, tipo } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: 'Usuario no identificado' });

        const filtro = { usuario: userId };
        if (tipo) filtro.tipo = tipo;

        const outfits = await Outfit.find(filtro).populate('items').sort({ createdAt: -1 });
        res.json({ success: true, outfits });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener combinaciones' });
    }
};

// ACTUALIZAR COMBINACIÓN EXISTENTE
exports.actualizarOutfit = async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;
        if (!items || items.length < 2) {
            return res.status(400).json({ success: false, message: 'Selecciona al menos 2 prendas' });
        }
        const outfit = await Outfit.findByIdAndUpdate(id, { items }, { new: true });
        res.json({ success: true, message: 'Combinación actualizada', outfit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar combinación' });
    }
};

// ELIMINAR COMBINACIÓN
exports.eliminarOutfit = async (req, res) => {
    try {
        await Outfit.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Combinación eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar combinación' });
    }
};