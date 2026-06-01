import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String, default: 'Single' },
    genre: { type: String, default: '' },
    duration: { type: Number, required: true },
    artwork: { type: String, default: '' },
    audioFile: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    peaks: { type: [Number], default: [] },
    mimeType: { type: String, default: 'audio/mpeg' },
    cloudinaryAudioId: { type: String, default: null },
    cloudinaryArtworkId: { type: String, default: null },
  },
  { timestamps: true }
);

// Text index for search
trackSchema.index({ title: 'text', artist: 'text', album: 'text', genre: 'text' });

export default mongoose.model('Track', trackSchema);
