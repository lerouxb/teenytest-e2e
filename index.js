'use strict';

const Assert = require('assert');
const Puppeteer = require('puppeteer');


const internals = {
    // Only wrap (and expose) some of puppeteer's page methods so that there is still a chance to port it to Firefox or IE.
    methods: ['goto', 'evaluate', '$', 'click', 'type', 'screenshot', 'url', 'waitFor']
};

internals.waitForAny = async function (page, good, bad, options) {

    if (!Array.isArray(good)) {
        good = [good];
    }

    if (!Array.isArray(bad)) {
        bad = [bad];
    }

    const allSelectors = [...good, ...bad].join(', ');
    await page.waitFor(allSelectors, options);

    if (good.length > 1) {
        for (const selector of good) {
            const element = await page.$(selector);
            console.log(selector, !!element);
        }
    }

    for (const selector of bad) {
        const element = await page.$(selector);
        Assert.ok(!element, `${selector} exists`);
    }
};

internals.jsHandleToText = async function (obj) {

    if (obj.jsonValue) {
        return JSON.stringify(await obj.jsonValue());
    }

    return obj;
};

internals.pause = (ms) => {

    return new Promise((resolve) => {

        setTimeout(resolve, ms);
    });
};

internals.wrapPage = function (page) {

    // will reject as soon as an error occurs in the page
    const pageErrorPromise = new Promise((resolve, reject) => {

        page.once('pageerror', (error) => {

            reject(error);
        });
    });

    page.on('console', (msg) => {

        // If you did something like console.log({ foo: 'bar' }), then the object comes through as the first item in msg.args(), but it is still a js handle. So all those have to be turned into something useful which involves promises.
        Promise.all(msg.args().map(internals.jsHandleToText)).then((args) => {

            // prepend a comment to keep this tap 13 compatible, output the type in case it was console.error, console.warn, console.dir...
            const toLog = ['# PAGE:', msg.type()];

            // If the first param sent to console.log() is an object, skip displaying 'JSHandle@object' because the real info is in args.
            if (msg.text() !== 'JSHandle@object') {
                toLog.push(msg.text());
            }

            toLog.push(...args);

            console.log(...toLog);
        });
    });

    const wrapped = {};
    for (const method of internals.methods) {
        // The command will fail if a page error occurrs before it completes or if there's already a page error.

        // NOTE: This has the side effect of making the handful of puppeteer page methods that don't return promises return promises too.
        wrapped[method] = (...args) => Promise.race([pageErrorPromise, page[method](...args)]);
    }

    wrapped.waitForAny = (good, bad, options) => {

        return Promise.race([pageErrorPromise, internals.waitForAny(page, good, bad, options)]);
    };

    wrapped.pause = (ms = 1000) => {

        return Promise.race([pageErrorPromise, internals.pause(ms)]);
    };

    return wrapped;
};


let browser;

exports.beforeAll = async function () {

    // TODO: make headless a CLI parameter, default to true
    browser = await Puppeteer.launch({ headless: false });

    global.newPage = async () => {

        const page = await browser.newPage();
        page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1
        });

        return internals.wrapPage(page);
    };
};

exports.afterEach = async function () {

    const pages = await browser.pages();

    // Close all the pages except the first empty one so we don't close the browser window after every test which can be annoying if you're trying to follow along with { headless: false }.
    for (const page of pages.slice(1)) {
        await page.close();
    }
};

exports.afterAll = async function () {

    await browser.close();
};

