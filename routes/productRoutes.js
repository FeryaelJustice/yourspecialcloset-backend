const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const upload = require("../config/multer");
const setUploadFolder = require("../middleware/setUploadFolder");

// Obtener todos los productos
router.get("/", async (req, res) => {
    try {
        const [products] = await db.execute("SELECT * FROM products");

        for (const product of products) {
            const [media] = await db.execute(
                "SELECT id, product_id, file_url, file_type FROM product_media WHERE product_id = ?",
                [product.id]
            );
            const [category] = await db.execute("SELECT name, name_en FROM product_category WHERE id = ?", [product.category_id]);
            const [sizes] = await db.execute("SELECT id, product_id, size, quantity FROM product_sizes WHERE product_id = ?", [product.id]);
            product.media = media;
            product.category = category[0];
            product.sizes = sizes;
        }

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Obtener todas las categorias de productos
router.get("/categories", async (req, res) => {
    try {
        const [productCategories] = await db.execute("SELECT * FROM product_category");
        res.json(productCategories);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Obtener un producto por ID
router.get("/:id", async (req, res) => {
    try {
        const product = await db.execute(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );
        if (product.length === 0)
            return res.status(404).json({ error: "Producto no encontrado" });

        const [media] = await db.execute(
            "SELECT file_url, file_type FROM product_media WHERE product_id = ?",
            [req.params.id]
        );
        const [category] = await db.execute("SELECT name, name_en FROM product_category WHERE id = ?", [product[0][0].category_id]);
        const [sizes] = await db.execute("SELECT id, product_id, size, quantity FROM product_sizes WHERE product_id = ?", [product[0][0].id]);

        // Filtrar los tamaños con quantity > 0
        const filteredSizes = sizes.filter(size => size.quantity > 0);

        product[0][0].media = media;
        product[0][0].category = category[0];
        product[0][0].sizes = filteredSizes;

        res.json(product[0][0]);
    } catch (err) {
        res.status(500).json({ error: `Error al obtener el producto: ${err}` });
    }
});

// Obtener productos por categoria
router.get("/category/:id", async (req, res) => {
    try {
        const [product] = await db.execute(
            "SELECT * FROM products WHERE category_id = ?",
            [req.params.id]
        );
        if (product.length === 0)
            return res.status(404).json({ error: "Producto no encontrado" });

        const [media] = await db.execute(
            "SELECT file_url, file_type FROM product_media WHERE product_id = ?",
            [req.params.id]
        );
        const [category] = await db.execute("SELECT name, name_en FROM product_category WHERE id = ?", [product[0].category_id]);
        const [sizes] = await db.execute("SELECT id, product_id, size, quantity FROM product_sizes WHERE product_id = ?", [product[0].id]);
        product[0].media = media;
        product[0].category = category[0];
        product[0].sizes = sizes;

        res.json(product[0]);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener el producto" });
    }
});

// ✅ Crear un nuevo producto con categoría en español e inglés
router.post("/", setUploadFolder("products"), upload.array("files", 10), async (req, res) => {
    const { name, description, category_name, category_name_en, tags, brand, price, stock, sizes } = req.body;

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "Archivos requeridos" });

    try {
        // ✅ Validación y asignación de valores (nullables)
        const productData = {
            name: name?.trim() || null,
            description: description?.trim() || null,
            category_name: category_name?.trim() || null,
            category_name_en: category_name_en?.trim() || null,
            tags: tags?.trim() || null,
            brand: brand?.trim() || null,
            price: price ? parseFloat(price) : null,
            stock: stock ? parseInt(stock) : null
        };

        if (!productData.name || !productData.category_name || !productData.category_name_en) {
            return res.status(400).json({ error: "Name and category names are required." });
        }

        // ✅ Verificar o insertar categoría
        let [categoryResult] = await db.execute(
            "SELECT id FROM product_category WHERE name = ? AND name_en = ?",
            [productData.category_name, productData.category_name_en]
        );

        let categoryId;
        if (categoryResult.length === 0) {
            const [categoryInsert] = await db.execute(
                "INSERT INTO product_category (name, name_en) VALUES (?, ?)",
                [productData.category_name, productData.category_name_en]
            );
            categoryId = categoryInsert.insertId;
        } else {
            categoryId = categoryResult[0].id;
        }

        // ✅ Insertar el producto
        const [result] = await db.execute(
            "INSERT INTO products (name, description, category_id, tags, brand, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                productData.name,
                productData.description,
                categoryId,
                productData.tags || null,
                productData.brand || null,
                productData.price !== null ? productData.price : 0,
                productData.stock !== null ? productData.stock : 0
            ]
        );

        const productId = result.insertId;

        // ✅ Guardar archivos multimedia
        for (const file of req.files) {
            const fileType = file.mimetype.startsWith("image") ? "image" : "video";
            const fileUrl = `uploads/products/${file.filename}`;

            await db.execute(
                "INSERT INTO product_media (product_id, file_url, file_type) VALUES (?, ?, ?)",
                [productId, fileUrl, fileType]
            );
        }

        // ✅ Insertar tallas si existen
        if (sizes && Array.isArray(JSON.parse(sizes))) {
            const parsedSizes = JSON.parse(sizes);
            for (const size of parsedSizes) {
                await db.execute(
                    "INSERT INTO product_sizes (product_id, size, quantity) VALUES (?, ?, ?)",
                    [productId, size.size || null, size.quantity || 0]
                );
            }
        }

        res.json({ message: "Producto creado", id: productId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear el producto" });
    }
});

// ✅ Actualizar un producto y agregar o reemplazar archivos multimedia
router.put("/:id", setUploadFolder("products"), upload.array("files", 10), async (req, res) => {
    const { name, description, category_name, category_name_en, tags, brand, price, stock, sizes } = req.body;

    try {
        // ✅ Validación y asignación de valores (nullables)
        const productData = {
            name: name?.trim() || null,
            description: description?.trim() || null,
            category_name: category_name?.trim() || null,
            category_name_en: category_name_en?.trim() || null,
            tags: tags?.trim() || null,
            brand: brand?.trim() || null,
            price: price ? parseFloat(price) : null,
            stock: stock ? parseInt(stock) : null
        };

        if (!productData.name || !productData.category_name || !productData.category_name_en) {
            return res.status(400).json({ error: "Name and category names are required." });
        }

        // ✅ Verificar o insertar categoría
        let [categoryResult] = await db.execute(
            "SELECT id FROM product_category WHERE name = ? AND name_en = ?",
            [productData.category_name, productData.category_name_en]
        );

        let categoryId;
        if (categoryResult.length === 0) {
            const [categoryInsert] = await db.execute(
                "INSERT INTO product_category (name, name_en) VALUES (?, ?)",
                [productData.category_name, productData.category_name_en]
            );
            categoryId = categoryInsert.insertId;
        } else {
            categoryId = categoryResult[0].id;
        }

        // ✅ Actualizar el producto
        const [result] = await db.execute(
            "UPDATE products SET name=?, description=?, category_id=?, tags=?, brand=?, price=?, stock=? WHERE id=?",
            [
                productData.name,
                productData.description,
                categoryId,
                productData.tags || null,
                productData.brand || null,
                productData.price !== null ? productData.price : 0,
                productData.stock !== null ? productData.stock : 0,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: "Producto no encontrado" });

        // ✅ Eliminar archivos multimedia anteriores del sistema y BD
        const [mediaFiles] = await db.execute("SELECT file_url FROM product_media WHERE product_id = ?", [req.params.id]);

        if (mediaFiles.length > 0) {
            mediaFiles.forEach((media) => {
                const filePath = path.join(__dirname, "../uploads/products", path.basename(media.file_url));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });

            await db.execute("DELETE FROM product_media WHERE product_id = ?", [req.params.id]);
        }

        // ✅ Subir y registrar los nuevos archivos multimedia
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileType = file.mimetype.startsWith("image") ? "image" : "video";
                const fileUrl = `uploads/products/${file.filename}`;

                await db.execute(
                    "INSERT INTO product_media (product_id, file_url, file_type) VALUES (?, ?, ?)",
                    [req.params.id, fileUrl, fileType]
                );
            }
        }

        // ✅ Actualizar tallas
        if (sizes && Array.isArray(JSON.parse(sizes))) {
            await db.execute("DELETE FROM product_sizes WHERE product_id = ?", [req.params.id]);
            const parsedSizes = JSON.parse(sizes);
            for (const size of parsedSizes) {
                await db.execute(
                    "INSERT INTO product_sizes (product_id, size, quantity) VALUES (?, ?, ?)",
                    [req.params.id, size.size || null, size.quantity || 0]
                );
            }
        }

        res.json({ message: "Producto actualizado" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar el producto" });
    }
});

// ✅ Eliminar un producto y sus archivos multimedia
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.execute("DELETE FROM products WHERE id = ?", [req.params.id]);

        if (result.affectedRows === 0)
            return res.status(404).json({ error: "Producto no encontrado" });

        await db.execute("DELETE FROM product_media WHERE product_id = ?", [req.params.id]);
        await db.execute("DELETE FROM product_sizes WHERE product_id = ?", [req.params.id]);

        res.json({ message: "Producto eliminado" });
    } catch (err) {
        res.status(500).json({ error: `Error al eliminar el producto: ${err}` });
    }
});

module.exports = router;
