const fs = require('node:fs');
const path = require('node:path');

const STATE_PATH = path.join(__dirname, 'state.json');

function getState() {
    if (!fs.existsSync(STATE_PATH)) return null;
    try {
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    } catch {
        return null;
    }
}

/**
 * Récupère les étudiants d'un onglet donné du Google Sheet (ex: PASS, LAS 1, LAS 2, LAS 3)
 */
async function getStudentsFromSheet(sheetName) {
    const state = getState();
    if (!state || !state.sheetId) {
        throw new Error('Le Google Sheet n\'est pas encore configuré via /setup.');
    }

    // URL de l'API de visualisation Google en CSV
    const url = `https://docs.google.com/spreadsheets/d/${state.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Impossible d'accéder à l'onglet "${sheetName}". Vérifie que le Google Sheet est partagé en "Tous les utilisateurs disposant du lien : Lecteur".`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    // Nettoyage des en-têtes (enlève guillemets, espaces et accents)
    const rawHeaders = lines[0].split(',').map(h => 
        h.replace(/^"|"$/g, '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    );

    const students = [];

    for (let i = 1; i < lines.length; i++) {
        // Découpage propre des cellules CSV gérant les virgules internes
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        if (!row[0]) continue;

        const student = {};
        rawHeaders.forEach((header, idx) => {
            student[header] = row[idx] || '';
        });

        students.push({
            DOSSIER: student['DOSSIER'] || '',
            NOM: student['NOM'] || '',
            PRENOM: student['PRENOM'] || student['PRÉNOM'] || ''
        });
    }

    return students;
}

module.exports = { getState, getStudentsFromSheet };