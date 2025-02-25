const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Crear la carpeta si no existe
const createFolderIfNotExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// ✅ Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.folder || "others"; // Carpeta especificada en el middleware
        const folderPath = path.join(__dirname, "../uploads", folder);
        createFolderIfNotExists(folderPath);
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Mantiene la extensión original
        const productName = req.body.name ? req.body.name.trim().replace(/\s+/g, '') : 'file'; // ✅ Nombre sin espacios y trimmed
        const timestamp = Date.now();
        const uniqueName = `${productName}_${timestamp}${ext}`;
        cb(null, uniqueName);
    },
});

// ✅ Permitir cualquier tipo de archivo pero con límite de 10MB
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // ✅ Límite de 10MB
});

module.exports = upload;
