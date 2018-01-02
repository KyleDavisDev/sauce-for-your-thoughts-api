const mongoose = require("mongoose");
mongoose.Promise = global.Promise; //ES6 promise
const slug = require("slugs"); //Hi there! How are you! --> hi-there-how-are-you

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a store name!"
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [
      {
        type: Number,
        required: "You must supply longitude and latitude"
      }
    ],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  }
});

//index name and desc for faster lookups
storeSchema.index({
  name: "text",
  description: "text"
});

//index location for easier geosearching
storeSchema.index({ location: "2dsphere" });

storeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); //skip generating new slug
    return; //stop function
  }

  this.slug = slug(this.name); //take name and run slug function

  //find if any other stores have the same slug and incriment number if there are any
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");
  try {
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (storesWithSlug.length) {
      this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }
    next();
  } catch (err) {
    next({ message: err }, false);
  }

  next();
});

storeSchema.statics.getTagsList = function() {
  //split each store into an instance with a single tag as it's "tag" property
  //group stores by the tag id, create new key called "count" and +1 to the $sum property
  //sort by most popular descending
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model("Store", storeSchema);
