# teenytest-e2e

Use puppeteer for browser testing in teenytest.

## Basics

In your teenytest helper, call teenytest-e2e's beforeAll from beforeAll, afterEach from afterEach and afterAll from afterAll.

* beforeAll creates the browser and gives you a newPage() global
* afterEach will close any pages you created with newPage()
* afterAll closes the browser

If you want to take screenshots when tests fail, then also register teenytest-e2e as a teenytest plugin in your package.json. By default screenshots will be stored in a directory called `screenshots`. This can be configured by setting the environment variable `SCREENSHOT_DIR`.

global.newPage() creates a new wrapped page that has internals.methods wrapped and exposed. It only wraps a whitelist of methods to keep the API lean so other browsers can hopefully be supported in future.

## Killer features

* you don't have to create any browser pages but you can create as many as you want
* each page has a promise that will reject the moment an unhandled JavaScript exception occurs
* all supported page methods are wrapped with Promise.race with the above promise, so if an error occurs in the page the command will fail and rethrow that browser error
* all console output in the page is output with your tests
* page.waitForAny() waits for both good and bad selectors to appear in the page. Good ones resolve the promise, bad ones reject. Whichever comes first. So you can trigger an action and wait for the success state _and_ any possible errors, then fail fast rather than time out because the success state never appeared.
* page.pause() will similarly reject if an error occurs
