const setUploadFolder = (folder) => (req, res, next) => {
    req.folder = folder;// ✅ Define la carpeta de subida
    next();
};

module.exports = setUploadFolder;
