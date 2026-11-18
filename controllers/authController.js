const User = require('../models/User');
const Prenda = require('../models/Prenda');
const Outfit = require('../models/Outfit');

// Controlador para Registrar Usuario
exports.registerUser = async (req, res) => {
    try {
        const { username, new_email, new_password } = req.body;

        const userExists = await User.findOne({ email: new_email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });
        }

        const newUser = new User({
            username: username || 'Usuario',
            email: new_email,
            password: new_password
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: '¡Usuario registrado con éxito!',
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
};

// Controlador para Iniciar Sesión
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        res.status(200).json({
            success: true,
            message: '¡Bienvenida de vuelta, ' + user.username + '!',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
};

// Actualizar Perfil
exports.actualizarPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        if (username) user.username = username;
        if (email) user.email = email;
        if (password && password.trim() !== '') user.password = password;

        await user.save();

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente.',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar perfil: ' + error.message });
    }
};

// Eliminar Perfil
exports.eliminarPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        await Prenda.deleteMany({ usuario: id });
        await Outfit.deleteMany({ usuario: id });
        await User.findByIdAndDelete(id);

        res.json({ success: true, message: 'Perfil eliminado permanentemente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar perfil: ' + error.message });
    }
};