import mongoose from 'mongoose';

const playlistCoverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },           // display name e.g. "Tamil Mass"
    url: { type: String, required: true },             // Cloudinary secure_url
    cloudinaryPublicId: { type: String, default: '' }, // optional Cloudinary public_id
    tags: { type: [String], default: [] },             // optional tags e.g. ["tamil", "mass"]
    order: { type: Number, default: 0 },               // sort order
  },
  { timestamps: true }
);

export default mongoose.model('PlaylistCover', playlistCoverSchema);
