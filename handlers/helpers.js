exports.createNewRecord = obj => ({
  author: obj.user._id,
  sauce: obj.sauce._id,
  taste: {
    description: obj.review.taste.description || "",
    rating: obj.review.taste.rating || 0
  },
  aroma: {
    description: obj.review.aroma.description || "",
    rating: obj.review.aroma.rating || 0
  },
  label: {
    description: obj.review.label.description || "",
    rating: obj.review.label.rating || 0
  },
  overall: {
    description: obj.review.overall.description || "",
    rating: obj.review.overall.rating || 0
  },
  heat: {
    description: obj.review.heat.description || "",
    rating: obj.review.heat.rating || 0
  }
});
