import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceKey,
  { auth: { persistSession: false } }
);

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

export { cloudinary };

export const geminiAI = new GoogleGenAI({
  apiKey: env.geminiApiKey,
});
