const Type = require("mongoose").model("Type");

/** @description Method to find all possible peppers
 *  @extends req.response - semi 'global' object between middleware
 */
exports.getTypes = async (req, res, next) => {
  try {
    const types = await Type.find({}).sort({ name: 1 });

    if (!types || types.length === 0) {
      const data = {
        isGood: false,
        msg: "Could not find any types."
      };
      res.status(400).send(data);
    }

    // Init req.response if need be
    if (req.response === undefined) req.response = {};

    // Add types to req.response
    req.response.types = types.map(x => x.toObject());

    next();
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "Something broke and we were unable to find any types. Please try again.",
      err
    };
    return res.status(401).send(data);
  }
};
