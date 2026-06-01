import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    photoURL: { type: String, default: null },
    avatarColor: { type: String, default: '#a855f7' },
    bio: { type: String, default: '' },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    playbackState: {
      currentTrackId: { type: String, default: null },
      currentTime: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      queue: { type: [mongoose.Schema.Types.Mixed], default: [] },
      queueIndex: { type: Number, default: -1 },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
