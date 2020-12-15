/**
 * Validation check in order to options.typeCallbacks have the correct format (so all routes will mount fine)
 */
const validateTypeCallbacks = (typeCallbacks) => {
  // if it is an object
  if (typeof typeCallbacks === 'object') {
    Object.keys(typeCallbacks).forEach((type) => {
      if (typeof typeCallbacks[type] !== 'function') {
        throw new Error(`options.typeCallbacks.${type} is not a function`);
      }
    });
  }
  // if it is an array
  if (Array.isArray(typeCallbacks)) {
    typeCallbacks.forEach((callbackConfiguration, i) => {
      // validating the conditions property
      if (!('conditions' in callbackConfiguration)) {
        throw new Error(`Conditions property not found in options.typeCallbacks[${i}]`);
      }
      if (typeof callbackConfiguration.conditions !== 'function') {
        throw new Error(`Conditions found in options.typeCallbacks[${i}] is not a function`);
      }
      // validating the callback property
      if (!('callback' in callbackConfiguration)) {
        throw new Error(`Callback property not found in options.typeCallbacks[${i}]`);
      }
      if (typeof callbackConfiguration.callback !== 'function') {
        throw new Error(`Callback found in options.typeCallbacks[${i}] is not a function`);
      }
    });
  }
};

const build = (callbackList, path, method, options) => {
  // build another array of callbacks in case options.typeCallbacks are set
  if (!options.typeCallbacks) {
    return callbackList;
  }

  return callbackList.map((callback) => {
    // usually the callback is a function,
    const typeofCallback = typeof callback;
    // but we are adding some options to build middlewares in case the callbacks are objects or arrays
    if (typeofCallback !== 'function') {
      if (typeof options.typeCallbacks === 'object') {
        // the execution of the callback should return a middleware function for express.Router
        if (!(typeofCallback in options.typeCallbacks)) {
          throw new Error(
            `Callback for "${typeofCallback}" not found when mounting "${method} ${path}"`,
          );
        }
        return options.typeCallbacks[typeofCallback]({ path, method, callback });
      }
      if (Array.isArray(options.typeCallbacks)) {
        // it searches which callback should be created in options.typeCallbacks
        // each element should provide a .conditions method that return a booleanish value
        // it also should provide a .callback method which is the actual callback
        const typeCallbackFound = options.typeCallbacks.find((tc) => {
          return tc.conditions({ type: typeofCallback, path, method });
        });
        // validating that a callback SHOULD be found
        if (!typeCallbackFound) {
          throw new Error(`Callback not found when mounting "${method} ${path}"`);
        }
        // the execution of the callback should return a middleware function for express.Router
        return typeCallbackFound.callback({ path, method, callback });
      }
    }
    return callback;
  })
  .filter((callback) => {
    // if in any case the callback is not a function, then it filters it out
    return typeof callback !== 'function';
  });
};

module.exports = {
  validateTypeCallbacks,
  build,
};
