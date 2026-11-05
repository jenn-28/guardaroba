const User = require('../models/User');

// Controlador para Registrar Usuario
exports.registerUser = async (req, res) => {
    try {
        const { username, new_email, new_password } = req.body;

        // Verificar si el usuario ya existe
        const userExists = await User.findOne({ email: new_email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });
        }

        // Crear nuevo usuario
        const newUser = new User({
            username: username || 'Usuario',
            email: new_email,
            password: new_password
        });

        await newUser.save();
        res.status(201).json({ success: true, message: '¡Usuario registrado con éxito!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
};

// Controlador para Iniciar Sesión
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por correo
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        // Validar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        res.status(200).json({ success: true, message: '¡Bienvenida de vuelta, ' + user.username + '!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
};