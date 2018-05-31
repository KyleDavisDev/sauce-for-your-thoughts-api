exports.createNewRecord = obj => ({
  author: obj.user._id,
  taste: {
    txt: obj.review.taste.txt || "",
    rating: obj.review.taste.rating || 0
  },
  aroma: {
    txt: obj.review.aroma.txt || "",
    rating: obj.review.aroma.rating || 0
  },
  label: {
    txt: obj.review.label.txt || "",
    rating: obj.review.label.rating || 0
  },
  overall: {
    txt: obj.review.overall.txt || "",
    rating: obj.review.overall.rating || 0
  },
  heat: {
    txt: obj.review.heat.txt || "",
    rating: obj.review.heat.rating || 0
  },
  note: {
    txt: obj.review.note.txt || ""
  }
});
