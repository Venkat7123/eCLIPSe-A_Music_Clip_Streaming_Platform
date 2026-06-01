import mongoose from 'mongoose';

const clipSchema = new mongoose.Schema(
  {
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track',
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: 'My Clip',
      maxlength: 100,
    },
    start: {
      type: Number,
      required: true,
      min: 0,
    },
    end: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

clipSchema.pre('save', function (next) {
  this.duration = this.end - this.start;
  next();
});

const Clip = mongoose.model('Clip', clipSchema);
export default Clip;
