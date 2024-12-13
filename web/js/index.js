import { WEBGL } from 'three/examples/jsm/WebGL.js'; 
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

/**
 * The <select> element that allows the user to pick an item to translate.
 */
const $elemSelector = document.getElementById('elem-selector');

let isError = false;

/**
 * Execute a polling action until a particular outcome is achieved.
 * 
 * @param {number} intervalInSeconds The number of seconds between each poll request.
 * @param {Function<void,Promise>} promiseProducer The function which when called will perform the HTTP request and return a Promise.
 * @param {Function<Response,boolean>} stopCondFunc The function to be called on the result of `promiseProducer`; return true to stop polling.
 * @param {Function<string,void>} then The function to be called with the response body of the last polling request.
 */
const poll = (intervalInSeconds, promiseProducer, stopCondFunc, then) => {
    /**
     * Call `promiseProducer`, check if we should stop polling, and either call `then` with
     * the result, or call `setTimeout` to execute again in `intervalInSeconds` seconds.
     */
    const pollAndCheck = async () => {
        const res = await promiseProducer();
        if (stopCondFunc(res)) {
            const body = await res.text();
            then(body);
        } else {
            setTimeout(pollAndCheck, intervalInSeconds * 1000);
        }
    }
    // Start polling...
    pollAndCheck();
};

/**
 * Display an error message to the user.
 * 
 * @param {string} msg The error message to be displayed.
 */
const displayError = (msg) => {
    isError = true;
    console.log('Error:', msg);
    const $viewport = document.getElementById('gltf-viewport');
    let $msgElem = document.getElementById('error-div');
    if (!$msgElem) $msgElem = document.createElement('p');
    $msgElem.id = 'error-div'
    $msgElem.style.color = 'red';
    $msgElem.style.font = 'italic';
    $msgElem.innerText = msg;
    $viewport.insertBefore($msgElem, $viewport.firstChild);
}

/**
 * Remove an error message that was shown.
 */
const removeError = () => {
    isError = false;
    const $viewport = document.getElementById('gltf-viewport');
    let $msgElem = document.getElementById('error-div');
    if ($msgElem) $viewport.removeChild($msgElem);
}

if (!WEBGL.isWebGLAvailable()) {
    console.error('WebGL is not supported in this browser');
    document.getElementById('gltf-viewport').appendChild(WEBGL.getWebGLErrorMessage());
}

const { loadGltf, clearGltfCanvas, exportGltf } = initThreeJsElements();

$elemSelector.addEventListener('change', async (evt) => {
    // Trigger translation by getting /api/gltf
    const selectedOption = evt.target.options[event.target.selectedIndex];
    clearGltfCanvas();
    if (selectedOption.innerText !== 'Select an Element') {
        try {
            document.body.style.cursor = 'progress';
            const resp = await fetch(`/api/gltf${evt.target.options[event.target.selectedIndex].getAttribute('href')}`);
            const json = await resp.json();
            poll(5, () => fetch(`/api/gltf/${json.id}`), (resp) => resp.status !== 202, (resp) => {
                let respJson = JSON.parse(resp);
                if (respJson.error) {
                    displayError('There was an error translating the model to GLTF: ' + respJson.error);
                } else {
                    console.log('Loading GLTF data...');
                    loadGltf(resp);
                }
            });
        } catch (err) {
            displayError(`Error requesting GLTF data translation: ${err}`);
        }
    }
});

// Get the Elements for the dropdown
fetch(`/api/elements${window.location.search}`, { headers: { 'Accept': 'application/json' } })
    .then((resp) => resp.json())
    .then(async (json) => {
        for (const elem of json) {
            if (elem.elementType === 'PARTSTUDIO') {
                const child = document.createElement('option');
                child.setAttribute('href', `${window.location.search}&gltfElementId=${elem.id}`);
                child.innerText = `Element - ${elem.name}`;
                $elemSelector.appendChild(child);
                // Get the Parts of each element for the dropdown
                try {
                    const partsResp = await fetch(`/api/elements/${elem.id}/parts${window.location.search}`, { headers: { 'Accept': 'application/json' } });
                    const partsJson = await partsResp.json();
                    for (const part of partsJson) {
                        const partChild = document.createElement('option');
                        partChild.setAttribute('href', `${window.location.search}&gltfElementId=${part.elementId}&partId=${part.partId}`);
                        partChild.innerText = `Part - ${elem.name} - ${part.name}`;
                        $elemSelector.appendChild(partChild);
                    }
                } catch (err) {
                    displayError(`Error while requesting element parts: ${err}`);
                }
            } else if (elem.elementType === 'ASSEMBLY') {
                const child = document.createElement('option');
                child.setAttribute('href', `${window.location.search}&gltfElementId=${elem.id}`);
                child.innerText = `Assembly - ${elem.name}`;
                $elemSelector.appendChild(child);
            }
        }
    }).catch((err) => {
        displayError(`Error while requesting document elements: ${err}`);
    });
