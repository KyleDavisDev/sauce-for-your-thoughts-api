const Hashids = require("hashids");
const hashids = new Hashids();
const { ObjectId } = require("mongoose").Types;

/** @description Checks whether an int/string is a valid mongoose object id or not
 *  @param {String|Number} id - what will be checked if is legit or not
 *  @returns {NULL|ObjectID} returns null if not legit and the object ID if it is legit
 */
exports.toObjectId = id => {
  const stringId = id.toString().toLowerCase();

  // This can throw false positives, for example if the string is the appropriate length
  if (!ObjectId.isValid(stringId)) {
    return null;
  }

  // A legit id will not change when casted as a new ObjectID but something that passes the .isValid check will
  const result = new ObjectId(stringId);
  if (result.toString() !== stringId) {
    return null;
  }

  // We could also be returning stringId at this point since they are the same
  return result;
};

// Used by encryptDecrypt
const keys = [
  "sauces",
  "sauce",
  "reviews",
  "review",
  "users",
  "user",
  "author",
  "hearts",
  "peppers",
  "pepper"
];
// TODO: Clean up the if chain
// TODO: Open ticket for issue regarding passing hashid.encodeHex as param
/** @description Recursive function that searches through object looking for any _id to encode
 *  @param {Object} obj - object to look through
 *  @param {string} type - either encode or decode to determine which action should be taken
 *  @param {String} fn - hashid's encode or decode function
 *  @returns {Object} obj - same object as above with encoded _id values
 */
exports.encryptDecrypt = (obj, type, fn) => {
  if (!obj) return;

  // Check if obj is an array and then loop through
  if (Object.prototype.toString.call(obj) === "[object Array]") {
    return obj.map(x => module.exports.encryptDecrypt(x, type, fn));
  }

  // Check if obj is an object
  if (Object.prototype.toString.call(obj) === "[object Object]") {
    // Check if obj has _id key
    if (obj._id !== undefined) {
      // This step is to prevent strings from being decoded if they are already mongoose objectIds
      // Only decode _id if type is decode AND _id is not already a mongoose object id
      if (type === "decode" && !module.exports.toObjectId(obj._id)) {
        obj._id = hashids.decodeHex(obj._id);
      }

      if (type === "encode") {
        obj._id = hashids.encodeHex(obj._id);
      }
    }

    // Loop through all keys to see if key is inside of obj
    keys.forEach(key => {
      if ([key] in obj) {
        obj[key] = module.exports.encryptDecrypt(obj[key], type, fn);
      }
    });

    return obj;
  }
};
