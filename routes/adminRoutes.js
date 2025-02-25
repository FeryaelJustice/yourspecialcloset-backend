const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Verify JWT token
router.post("/verify-token", (req, res) => {
    const token = req.body.token;
    if (!token) {
        return res.status(401).json({ error: "Token no proporcionado" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ valid: false, error: "Token inválido o expirado" });
    }
});


// ✅ Login Route
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findByUsername(username);
        if (!admin) return res.status(401).json({ error: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET || "default_secret", // ✅ Añadido valor por defecto para desarrollo
            { expiresIn: "1d" }
        );
        res.json({ message: "Login exitoso", token });
    } catch (err) {
        res.status(500).json({ error: `Error en el servidor: ${err.message}` });
    }
});

// ✅ Register Route
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });

        const existingAdmin = await Admin.findByUsername(username);
        if (existingAdmin) return res.status(400).json({ error: "El usuario ya existe" });

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10; // ✅ Control de número de rondas
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log(username, hashedPassword);
        const newAdmin = await Admin.createAdmin(username, hashedPassword);

        console.log(newAdmin);
        const token = jwt.sign(
            { id: newAdmin.id, username: newAdmin.username },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "1d" }
        );
        console.log(token);

        res.status(201).json({ message: "Usuario registrado con éxito", token });
    } catch (err) {
        res.status(500).json({ error: `Error en el servidor: ${err.message}` });
    }
});

module.exports = router;
