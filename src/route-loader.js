/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

const http = require('http');
const readdirSync = require('mini-mvcs-readdir-sync');

// getting all methods for a express.Router
const httpMethods = http.METHODS ? http.METHODS.map((method) => {
  // converting to lowercase since router.METHOD expects lowercase methods
  return method.toLowerCase();
}) : [];

// status codes
const defaultStatusCode = {
  get: 200,
  post: 201,
  put: 200,
  patch: 200,
  delete: 204,
  default: 200,
};

// templater function that does nothing
const defaultTemplater = (req, res, body) => {
  return body;
};

const createFakeRouter = (router, options) => {
  const templater = options.templater || defaultTemplater;
  const statusCode = {
    ...defaultStatusCode,
    ...options.statusCode,
  };

  // returning an object that has the same methods as a express.Router
  return {
    // returning the express router in case we would want to avoid all the templater stack
    expressRouter: router,
    // simple wrappers that just run the router
    ...['all', 'param', 'route', 'use'].reduce((otherMethods, method) => {
      return { ...otherMethods, [method]: (...args) => { return router[method](...args); } };
    }, {}),
    // actual METHOD wrappers that are expected to be formatted with the templater
    ...httpMethods.reduce((httpMethodsObject, method) => {
      return {
        ...httpMethodsObject,
        [method]: (pathParam, ...args) => {
          const callbackList = args.slice(0, args.length - 1)
          .map((callback) => {
            // usually the callback is not a function,
            const typeofCallback = typeof callback;
            // so in that case we run the callback per type so we run some additional code
            if (typeofCallback !== 'function') {
              if (typeof options.typeCallbacks === 'object') {
                // the execution of the callback should return a middleware function for express.Router
                return options.typeCallbacks[typeofCallback]({ path: pathParam, method, callback });
              }
              if (Array.isArray(options.typeCallbacks)) {
                // it searches which callback should be created in options
                const typeCallbackFound = options.typeCallbacks.find((tc) => {
                  return tc.conditions({ type: typeofCallback, path: pathParam, method });
                });
                if (typeCallbackFound) {
                  // the execution of the callback should return a middleware function for express.Router
                  return typeCallbackFound.callback({ path: pathParam, method, callback });
                }
              }
            }
            return callback;
          })
          .filter((callback) => {
            // if in any case the callback is not a function, then it filters it out
            return typeof callback !== 'function';
          })
          .concat((req, res, next) => {
            // wrapping last callback with a Promise in case its result is not a Promise
            return Promise.resolve(args[args.length - 1](req, res, next))
            .then((body) => {
              // will send data if no response was already sent
              if (!res.headersSent) {
                // we use the configured status code by the request method
                res.status(statusCode[req.method.toLowerCase()] || statusCode.default)
                .json(templater(req, res, body));
              }
            })
            .catch(next);
          });
          router[method](pathParam, ...callbackList);
        },
      };
    }, {}),
  };
};

module.exports = (router, routesPath, ignoreListParam, optionsParam) => {
  const options = typeof ignoreListParam === 'object'
    ? ignoreListParam
    : optionsParam;

  const ignoreList = Array.isArray(ignoreListParam)
    ? ignoreListParam
    : [];

  const fakeRouter = createFakeRouter(router, options);

  readdirSync(routesPath, ignoreList)
  .forEach((file) => {
    require(file.substr(0, file.lastIndexOf('.')))(fakeRouter);
  });
};
