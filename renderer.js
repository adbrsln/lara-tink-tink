// renderer.js (v9 - Robust Parser for Standard and Rich Output)

const projectPathInput = document.getElementById('project-path-input');
const codeInput = document.getElementById('code-input');
const runButton = document.getElementById('run-button');
const outputPre = document.getElementById('output-pre');
const closeBtn = document.getElementById('close-btn');

let debounceTimer;

// The createDumpHtml function is unchanged and still needed.
function createDumpHtml(data) { /* ... same as before ... */
    const container = document.createElement('div'); container.className = 'dump-container'; function buildNode(item) { if (!item || !item.type) return document.createTextNode(''); if (['string', 'number', 'boolean', 'null'].includes(item.type)) { const el = document.createElement('span'); el.className = `dump-value type-${item.type}`; el.textContent = String(item.value); if (item.type === 'string') { const meta = document.createElement('span'); meta.className = 'dump-meta'; meta.textContent = `(${item.length})`; el.appendChild(meta); } return el; } const node = document.createElement('div'); const header = document.createElement('div'); header.className = 'dump-header'; header.innerHTML = `<span class="toggle"></span><span class="title">${item.class || 'array'}</span> <span class="dump-meta">(${item.count !== undefined ? item.count : item.properties.length})</span>`; const list = document.createElement('ul'); list.style.display = 'none'; header.addEventListener('click', () => { const isExpanded = list.style.display === 'block'; list.style.display = isExpanded ? 'none' : 'block'; header.classList.toggle('expanded', !isExpanded); }); if (item.type === 'array') { item.values.forEach(entry => { const li = document.createElement('li'); const key = buildNode(entry.key); key.classList.add('dump-array-key'); li.appendChild(key); li.append(' => '); li.appendChild(buildNode(entry.value)); list.appendChild(li); }); } if (item.type === 'object') { item.properties.forEach(prop => { const li = document.createElement('li'); li.className = 'dump-property'; li.innerHTML = `<span class="prop-visibility">${prop.visibility}</span><span class="prop-name">${prop.name}</span>: `; li.appendChild(buildNode(prop.value)); list.appendChild(li); }); } node.appendChild(header); node.appendChild(list); return node; } container.appendChild(buildNode(data)); return container;
}

const runCode = async () => {
    const projectPath = projectPathInput.value;
    const userCode = codeInput.value;

    if (!projectPath || !userCode) {
        outputPre.innerHTML = '';
        return;
    }

    outputPre.innerHTML = '<div class="output-card">Running...</div>';
    runButton.disabled = true;

    const result = await window.electronAPI.runPhp(projectPath, userCode);
    outputPre.innerHTML = ''; // Clear loading message

    // --- NEW, SIMPLIFIED RENDERING LOGIC ---
    const outputContainer = document.createElement('div');
    outputContainer.className = 'output-card';
    
    if (result.error) {
        outputContainer.textContent = result.error;
    } else if (result.output) {
        // Regex to find our special tinker dump blocks
        const dumpRegex = /TINKER_DUMP_START(.*?)TINKER_DUMP_END\n?/gs;
        const parts = result.output.split(dumpRegex);

        parts.forEach(part => {
            if (!part) return;
            try {
                // If the part is valid JSON, it's a rich dump
                const jsonData = JSON.parse(part);
                outputContainer.appendChild(createDumpHtml(jsonData));
            } catch (e) {
                // Otherwise, it's plain text
                const pre = document.createElement('pre');
                pre.style.fontFamily = 'inherit';
                pre.style.margin = '0';
                pre.textContent = part;
                outputContainer.appendChild(pre);
            }
        });
    } else {
        outputContainer.textContent = 'Execution finished with no output. use td() to dump variables.';
    }

    outputPre.appendChild(outputContainer);
    runButton.disabled = false;
};

// Event listeners are unchanged
runButton.addEventListener('click', runCode);
codeInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runCode, 500);
});

closeBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
});