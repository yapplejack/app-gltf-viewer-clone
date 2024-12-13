/**
 * The <select> element that allows the user to pick an item to translate.
 */
const $elemSelector = document.getElementById('elem-selector');

let isError = false;

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
