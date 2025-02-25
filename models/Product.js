const db = require("../config/db");

const Product = {
    getAll: async () => {
        try {
            const [rows] = await db.query("SELECT * FROM products");
            return rows;
        } catch (err) {
            throw err;
        }
    },

    create: async (data) => {
        try {
            const [result] = await db.query("INSERT INTO products SET ?", [
                data,
            ]);
            return { message: "Producto creado", id: result.insertId };
        } catch (err) {
            throw err;
        }
    },

    update: async (id, data) => {
        try {
            const [result] = await db.query(
                "UPDATE products SET ? WHERE id = ?",
                [data, id]
            );
            if (result.affectedRows === 0)
                throw new Error("Producto no encontrado");
            return { message: "Producto actualizado" };
        } catch (err) {
            throw err;
        }
    },

    delete: async (id) => {
        try {
            const [result] = await db.query(
                "DELETE FROM products WHERE id = ?",
                [id]
            );
            if (result.affectedRows === 0)
                throw new Error("Producto no encontrado");
            return { message: "Producto eliminado" };
        } catch (err) {
            throw err;
        }
    },
};

module.exports = Product;
