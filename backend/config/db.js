import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dburl = process.env.DBURL;
export const connectDB = async () => {
  try {
    await mongoose.connect(dburl, {
   
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};
