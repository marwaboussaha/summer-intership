import mongoose from "mongoose";

function buildUri() {
  if (process.env.DOCDB_HOST) {
    const user = encodeURIComponent(process.env.DOCDB_USER);
    const pass = encodeURIComponent(process.env.DOCDB_PASSWORD);
    return `mongodb://${user}:${pass}@${process.env.DOCDB_HOST}:${process.env.DOCDB_PORT}/voicecraft` +
           `?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authMechanism=SCRAM-SHA-1`;
  }
  return process.env.MONGODB_URI || "mongodb://localhost:27017/voicecraft";
}

export default async function connectDB() {
  const options = process.env.DOCDB_HOST ? { tlsCAFile: "/app/global-bundle.pem" } : {};
  await mongoose.connect(buildUri(), options);
  console.log("Base de donnees connectee");
}