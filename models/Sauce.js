const mongoose = require("mongoose");
mongoose.Promise = global.Promise; // ES6 promise
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you

const sauceSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a sauce name!"
  },
  maker: {
    type: String,
    trim: true,
    required: "Sauce cannot be saved unless we know who made it."
  },
  slug: { type: String, trim: true, required: false },
  description: {
    type: String,
    trim: true,
    required: false
  },
  created: {
    type: Date,
    default: Date.now
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  },
  location: {
    country: {
      type: String,
      required: false,
      default: "United States"
    },
    state: {
      type: String,
      required: false
    },
    city: {
      type: String,
      required: false
    }
  },
  shu: {
    type: Number,
    required: false
  },
  ingrediants: {
    type: String,
    required: false
  },
  peppers: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Pepper"
    }
  ]
});

// index name and desc for faster lookups
sauceSchema.index({
  name: "text",
  description: "text"
});

sauceSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); // skip generating new slug
    return; // stop function
  }

  this.slug = slug(this.name); // take name and run slug function

  // find if any other sauces have the same slug and incriment number if there are any
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");
  try {
    const saucesWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (saucesWithSlug.length) {
      this.slug = `${this.slug}-${saucesWithSlug.length + 1}`;
    }
    next();
  } catch (err) {
    next({ message: err }, false);
  }

  next();
});

sauceSchema.statics.getTagsList = function() {
  // split each sauce into an instance with a single tag as it's "tag" property
  // group sauces by the tag id, create new key called "count" and +1 to the $sum property
  // sort by most popular descending
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Tells .toObject() to also not include __v
// which is a mongoose housekeeping thing
sauceSchema.set("toObject", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Sauce", sauceSchema);
