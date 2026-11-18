// routes/prendaRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prendaController = require('../controllers/prendaController');

const uploadDir = path.join(__dirname, '../public/img');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

router.get('/', prendaController.obtenerPrendas);
router.post('/', upload.single('imagen'), prendaController.crearPrenda);
router.put('/:id', upload.single('imagen'), prendaController.actualizarPrenda);
router.delete('/:id', prendaController.eliminarPrenda);

router.get('/outfits', prendaController.obtenerOutfits);
router.post('/outfits', prendaController.guardarOutfit);
router.put('/outfits/:id', prendaController.actualizarOutfit);
router.delete('/outfits/:id', prendaController.eliminarOutfit);

module.exports = router;