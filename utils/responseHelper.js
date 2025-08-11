const createSuccessResponse = (message, data = null) => {
  const response = { message };
  if (data !== null) {
    response.data = data;
  }
  return response;
};

const createErrorResponse = (error, details = null) => {
  const response = { error };
  if (details !== null) {
    response.details = details;
  }
  return response;
};

const createPaginationResponse = (data, pagination) => {
  return {
    data,
    pagination
  };
};

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createPaginationResponse
};