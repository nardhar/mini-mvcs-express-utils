const { sep } = require('path');
const { expect } = require('chai');
const rewiremock = require('rewiremock').default;
const Router = require('./mocks/router.mock');

rewiremock('readdir-sync').with((folder, ignore) => {
  return [
    'book.controller.js',
    'author.controller.js',
    'ignore.controller.js',
    'notacontroller.js',
  ]
  .map((file) => {
    return `${folder}${sep}${file}`;
  })
  .filter((file) => {
    return ignore.indexOf(file) < 0;
  });
});

rewiremock('../test/resource/srcSample/controllers/book.controller').with((router, services) => {
  router.get('/book', () => {
    return services.book.list();
  });

  router.get('/book/:id', () => {
    return services.book.list()
    .then((bookList) => {
      return bookList[0];
    });
  });

  router.post('/book', ['WRITER'], () => {
    return services.book.save();
  });

  router.put('/book/:id', () => {
    return services.book.save();
  });

  router.delete('/book/:id', ['ADMIN'], () => {
    return services.book.save();
  });
});

rewiremock('../test/resource/srcSample/controllers/author.controller').with((router) => {
  router.get('/author', () => {
    return Promise.resolve({ author: { name: 'john' } });
  });
});

rewiremock('../test/resource/srcSample/controllers/ignore.controller').with((router) => {
  router.get('/ignore', () => {
    return Promise.resolve({ sample: { no: 'john' } });
  });
});

let routerMock;
let result;
let resMock;

let routeLoader;

describe('Unit Testing Route Loader', () => {
  before(() => {
    rewiremock.enable();
    routeLoader = require('../src/route-loader');
  });

  after(() => { rewiremock.disable(); });

  beforeEach(() => {
    routerMock = new Router();
    result = {};
    resMock = {
      locals: {
        role: 'ADMIN',
      },
      headersSent: false,
      status(code) {
        result.code = code;
        return {
          json(data) {
            result.data = data;
          },
        };
      },
    };
  });

  describe('Loading of default controllers folder', () => {
    it('should execute a simple get action from a loaded controller', (done) => {
      routeLoader(
        routerMock,
        // since rewiremock only mocks existing modules we need to create the same file structure
        // for importing the dynamically called services with require, even though they will be
        // mocked here. Note: the path must be relative to src/route-loader
        '../test/resource/srcSample',
      );
      // the app should respond to the loaded controller paths
      routerMock.execute({ originalUrl: '/book', method: 'get' }, resMock)
      .then(() => {
        expect(result).to.have.property('data');
        expect(result).to.have.property('code', 200);
        expect(result.data).to.be.a('array');
        done();
      })
      .catch(done);
    });

    it('should execute a save action from a loaded controller', (done) => {
      routeLoader(routerMock, '../test/resource/srcSample');
      routerMock.execute({ originalUrl: '/book', method: 'post' }, resMock)
      .then(() => {
        expect(result).to.have.property('data');
        expect(result).to.have.property('code', 201);
        expect(result.data).to.have.property('title', 'sample');
        done();
      })
      .catch(done);
    });

    it('should add a template to the response body', (done) => {
      routeLoader(routerMock, '../test/resource/srcSample', {
        templater(req, res, body) {
          return {
            success: true,
            data: body,
          };
        },
      });
      routerMock.execute({ originalUrl: '/book', method: 'post' }, resMock)
      .then(() => {
        expect(result).to.have.property('data');
        expect(result).to.have.property('code', 201);
        expect(result.data).to.have.property('success', true);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('title', 'sample');
        done();
      })
      .catch(done);
    });

    it('should change the default status codes', (done) => {
      routeLoader(routerMock, '../test/resource/srcSample', {
        statusCode: {
          post: 200,
          delete: 200,
        },
      });
      routerMock.execute({ originalUrl: '/book', method: 'post' }, resMock)
      .then(() => {
        expect(result).to.have.property('data');
        expect(result).to.have.property('code', 200);
        expect(result.data).to.have.property('success', true);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('title', 'sample');
        done();
      })
      .catch(done);
    });

    it('should execute some callbacks for other types of middleware', (done) => {
      routeLoader(routerMock, '../test/resource/srcSample', {
        typeCallbacks: {
          // if its an array then checks for permissions
          array: ({ callback }) => {
            return (req, res, next) => {
              if (callback.includes(res.locals.role)) {
                next();
              } else {
                next(new Error('Forbidden'));
              }
            };
          },
        },
      });
      routerMock.execute({ originalUrl: '/book', method: 'post' }, resMock)
      .then(() => {
        expect(result).to.have.property('data');
        expect(result).to.have.property('code', 200);
        expect(result.data).to.have.property('success', true);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('title', 'sample');
        done();
      })
      .catch(done);
    });
  });
});
