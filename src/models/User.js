import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// IMPORTANT: MongoDB automatically creates _id as ObjectId for all documents
// googleId field stores OAuth provider ID separately to avoid ID confusion
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  // IMPORTANT: googleId stores the OAuth provider ID separately from MongoDB _id
  // This prevents confusion between OAuth IDs and MongoDB ObjectIds
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  location: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    trim: true,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  books: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratings: [{
    raterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot be more than 500 characters'],
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalExchanges: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  level: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    default: 'Bronze'
  },
  badges: [{
    type: String,
    enum: ['First Exchange', 'Book Lover', 'Helpful Member', 'Top Reviewer', 'Community Leader']
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.isGoogleUser) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


userSchema.methods.calculateLevel = function() {
  const points = this.points || 0;
  
  if (points >= 1000) return 'Diamond';
  if (points >= 500) return 'Platinum';
  if (points >= 200) return 'Gold';
  if (points >= 50) return 'Silver';
  return 'Bronze';
};


userSchema.pre('save', function(next) {
  if (this.isModified('points')) {
    this.level = this.calculateLevel();
  }
  next();
});


userSchema.post(['findOneAndUpdate', 'updateOne', 'updateMany'], function(doc) {
  if (doc && doc.points !== undefined) {
    const newLevel = doc.calculateLevel();
    if (doc.level !== newLevel) {
      doc.level = newLevel;
      doc.save().catch(err => console.error('Error updating level:', err));
    }
  }
});


userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.models.User || mongoose.model('User', userSchema);
