require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Importar rutas
const productRoutes = require("./routes/productRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.get("/", (_, res) => {
    res.status(200).json({ message: "Exito" });
});
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
