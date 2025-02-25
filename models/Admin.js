const db = require("../config/db");
const bcrypt = require("bcryptjs");

const Admin = {
    findByUsername: async (username) => {
        const [rows] = await db.execute(
            "SELECT * FROM admins WHERE username = ?",
            [username]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    createAdmin: async (username, password) => {
        await db.execute(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            [username, password]
        );
        return { message: "Admin creado correctamente" };
    },
};

module.exports = Admin;
