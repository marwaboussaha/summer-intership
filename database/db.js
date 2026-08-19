import mongoose from "mongoose";

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI manquant dans le fichier .env");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connecté à MongoDB");
  } catch (err) {
    console.error("❌ Échec de connexion à MongoDB :", err.message);
    process.exit(1);
  }
}

export default connectDB;