import mongoose from 'mongoose';

const clipSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    duration: { type: Number, required: true },
  },
  { _id: false }
);

const playlistTrackSchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', required: true },
    order: { type: Number, required: true },
    clip: { type: clipSchema, default: null },
    clipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clip', default: null },
  },
  { _id: true }
);

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    creator: { type: String, required: true, index: true },
    artwork: { type: String, default: '' },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Playlist', playlistSchema);
