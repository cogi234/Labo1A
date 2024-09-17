import { createServer } from 'http';
import Repository from './repository.js';

function accessControlConfig(req, res) {
    if (req.headers['sec-fetch-mode'] == 'cors') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        console.log("Client browser CORS check request");
    }
}

function preflight(req, res) {
    accessControlConfig(req, res);
    if (req.method === "OPTIONS") {
        console.log("CORS preflight verifications");
        res.end();
        return true;
    }
    return false;
}

function getPayload(req, res) {
    return new Promise(async (resolve) => {
        let body = [];
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            if (body.length > 0) {
                if (req.headers['content-type'] == "application/json") {
                    try { resolve(JSON.parse(body)); }
                    catch (error) { console.log(error); }
                }
            }
            resolve(null);
        });
    });
}

function response(res, status, data = null, omitContentType = false) {
    if (data != null && !omitContentType)
        res.writeHead(status, { 'Content-Type': 'application/json' });
    else
        res.writeHead(status);
    res.end(data);
    return true;
}

function extractIdFromRequest(req, url) {
    let parts = req.url.split('/');
    let baseParts = url.split('/');
    return parseInt(parts[baseParts.length]);
}

/**
 * @param req Request
 * @param res Response
 * @param {string} resourceName The singular name of the resource ex: contact, bookmark
 * @param {Function} validator The function to validate a resource. By default, everything is valid
 */
async function handleCRUDRequest(req, res, resourceName, validator = (object) => '') {
    let repository = new Repository(`./${resourceName}s.json`);
    let url = `/api/${resourceName}s`;
    if (req.url == url) {
        switch (req.method) {
            case "GET":
                return response(res, 200, JSON.stringify(repository.getAll()));
            case "POST": {
                let resourceObject = await getPayload(req, res);
                let validationStatus = validator(resourceObject);
                if (resourceObject != null && validationStatus == '') {
                    resourceObject = repository.add(resourceObject);
                    return response(res, 201, JSON.stringify(resourceObject));
                } else
                    return response(res, 400, validationStatus, true); // Post with no or invalid payload
            }
            case "PUT": {
                let resourceObject = await getPayload(req, res);
                let validationStatus = validator(resourceObject);
                if (resourceObject != null && validationStatus == '')
                    if (repository.update(resourceObject))
                        return response(res, 204);
                    else
                        return response(res, 404);
                else
                    return response(res, 400, validationStatus, true); // Put with no or invalid payload
            }
            default:
                return response(res, 501, req.method + " method not supported by this service.")
        }
    } else if (req.url.startsWith(url + "/")) {
        let id = extractIdFromRequest(req, url);
        if (isNaN(id))
            return response(res, 404);
        switch (req.method) {
            case "GET": {
                let resourceObject = repository.get(id);
                if (resourceObject !== null)
                    return response(res, 200, JSON.stringify(resourceObject));
                else
                    return response(res, 404, `${resourceName} ${id} not found`)
            }
            case "DELETE": {
                if (repository.remove(id))
                    return response(res, 202);
                else
                    return response(res, 404, `${resourceName} ${id} not found`);
            }
            default:
                return response(res, 501, req.method + " method not supported by this service.")
        }
    }
    return false; //request not handled
}

function validateContact(contact) {
    if (!('Name' in contact)) return 'Name is missing';
    if (!('Phone' in contact)) return 'Phone is missing';
    if (!('Email' in contact)) return 'Email is missing';
    return '';
}

function validateBookmark(bookmark) {
    if (!('Title' in bookmark)) return 'Title is missing';
    if (!('Url' in bookmark)) return 'Url is missing';
    if (!('Category' in bookmark)) return 'Category is missing';
    return '';
}

async function handleRequest(req, res) {
    if (await handleCRUDRequest(req, res, "contact", validateContact))
        return true;
    if (await handleCRUDRequest(req, res, "bookmark", validateBookmark))
        return true;
    return false; // request not handled
}

const server = createServer(async (req, res) => {
    //Handle requests
    console.log(req.method, req.url);
    //If the preflight returns false, this is not OPTIONS and we continue
    if (!preflight(req, res)) {
        if (! await handleRequest(req, res)) {
            response(res, 404);
        }
    }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));