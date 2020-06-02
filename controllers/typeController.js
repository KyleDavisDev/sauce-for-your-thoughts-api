const Types = require("../models/Types");
const { Utility } = require("../utility/utility");

/** @description Get all active sauce types
 *  @returns {Object} data - container object
 *  @returns {Boolean} data.isGood - did everything go well?
 *  @returns {String[]} data.types - types of sauces
 *
 */
exports.getTypes = async (req, res, next) => {
  try {
    // 1) Get types of sauces
    const types = await Types.FindTypes();
    if (!types || types.length === 0) {
      const data = {
        isGood: false,
        msg: "Could not find any types."
      };
      const errCode = Utility.generateRequestStatusCode(data.msg);
      res.status(errCode).send(data);
    }

    // 2) return to client
    const data = {
      isGood: true,
      msg: "Found types",
      types
    };
    return res.status(200).send(data);
  } catch (err) {
    // TODO: Log error to database

    // Construct data obj
    const data = {
      isGood: false,
      msg:
        "Something broke and we were unable to find any types. Please try again."
    };
    const errCode = Utility.generateRequestStatusCode(data.msg);

    return res.status(errCode).send(data);
  }
};
