import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }] // Référence aux games jouées
});

export const Player = mongoose.model('Player', PlayerSchema);
