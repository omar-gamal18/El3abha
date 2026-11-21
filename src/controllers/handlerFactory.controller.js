const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const getModelName = (Model) =>
  Model.modelName.charAt(0).toLowerCase() + Model.modelName.slice(1);

exports.deleteOne = (Model) => async (req, res, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id);
  if (!doc) {
    return next(
      new AppError(`No ${getModelName(Model)} found with that ID`, 404),
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
};

exports.updateOne = (Model) => async (req, res, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  const modelName = getModelName(Model);

  if (!doc) {
    return next(new AppError(`No ${modelName} found with that ID`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      [modelName]: doc,
    },
  });
};

exports.createOne = (Model) => async (req, res, next) => {
  const newDocument = await Model.create(req.body);
  const modelName = getModelName(Model);
  res.status(201).json({
    status: 'success',
    data: {
      [modelName]: newDocument,
    },
  });
};

exports.getOne = (Model, popOptions) => async (req, res, next) => {
  let query = Model.findById(req.params.id);
  if (popOptions) query = query.populate(popOptions);

  const doc = await query;
  const modelName = getModelName(Model);

  if (!doc) {
    return next(new AppError(`No ${modelName} found with that ID`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      [modelName]: doc,
    },
  });
};

exports.getAll = (Model) => async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };
  const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .selectFields()
    .pagination();

  const docs = await features.query;
  const modelName = getModelName(Model);

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      [modelName]: docs,
      // docs,
    },
  });
};
