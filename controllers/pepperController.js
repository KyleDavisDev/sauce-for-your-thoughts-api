const Pepper = require("mongoose").model("Pepper");

/** @description Method to find all possible peppers
 *  @extends req.response - semi 'global' object between middleware
 */
exports.getPeppers = async (req, res, next) => {
  try {
    const peppers = await Pepper.find({}).sort({ name: 1 });

    if (!peppers || peppers.length === 0) {
      const data = {
        isGood: false,
        msg: "Could not find any peppers."
      };
      res.status(400).send(data);
    }

    // Init req.response if need be
    if (req.response === undefined) req.response = {};

    // Add peppers to req.response
    req.response.peppers = peppers.map(x => x.toObject());

    next();
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "Something broke and we were unable to find any peppers. Please try again.",
      err
    };
    return res.status(401).send(data);
  }
};
