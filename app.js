// Importación del SDK modular de Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de tu proyecto Firebase: gallos-4b523
const firebaseConfig = {
  apiKey: "AIzaSyAraJtdb33Ja_erj_00ZUFD7i2qyyzpbFM",
  authDomain: "gallos-4b523.firebaseapp.com",
  projectId: "gallos-4b523",
  storageBucket: "gallos-4b523.firebasestorage.app",
  messagingSenderId: "888564309771",
  appId: "1:888564309771:web:f3d8866e599b974a368c0e"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado local
let roostersData = [];
let selectedRoosterId = null;

// Referencias del DOM
const dbStatus = document.getElementById("db-status");
const tabLive = document.getElementById("tab-live");
const tabLineage = document.getElementById("tab-lineage");
const sectionLive = document.getElementById("section-live");
const sectionLineage = document.getElementById("section-lineage");

/* ==========================================================================
   1. NAVEGACIÓN ENTRE PESTAÑAS Y STREAM EN VIVO
   ========================================================================== */
tabLive.addEventListener("click", () => {
  tabLive.classList.add("active");
  tabLineage.classList.remove("active");
  sectionLive.classList.add("active");
  sectionLineage.classList.remove("active");
});

tabLineage.addEventListener("click", () => {
  tabLineage.classList.add("active");
  tabLive.classList.remove("active");
  sectionLineage.classList.add("active");
  sectionLive.classList.remove("active");
});

document.getElementById("btn-set-stream").addEventListener("click", () => {
  const url = document.getElementById("stream-url-input").value.trim();
  if (url) {
    document.getElementById("stream-iframe").src = url;
  }
});

/* ==========================================================================
   2. MÓDULO DE CARTELERA Y COMBATES EN ARENA (COLECCIÓN: 'combates')
   ========================================================================== */
const matchForm = document.getElementById("match-form");
const matchRedSelect = document.getElementById("match-red");
const matchBlueSelect = document.getElementById("match-blue");

// Actualizar careo en vivo al cambiar selección o hacer clic en una pelea
function updateVersusBanner(redId, blueId, titleText = "Transmisión Oficial del Coliseo") {
  const redRooster = findById(redId);
  const blueRooster = findById(blueId);

  document.getElementById("current-fight-label").textContent = titleText;

  document.getElementById("live-red-name").textContent = redRooster ? redRooster.nombre : "Por definir";
  document.getElementById("live-red-meta").textContent = redRooster 
    ? `Anillo: ${redRooster.anillo} • ${redRooster.linea} • ${redRooster.peso} lbs`
    : "Anillo: -- • Línea: -- • Peso: --";

  document.getElementById("live-blue-name").textContent = blueRooster ? blueRooster.nombre : "Por definir";
  document.getElementById("live-blue-meta").textContent = blueRooster 
    ? `Anillo: ${blueRooster.anillo} • ${blueRooster.linea} • ${blueRooster.peso} lbs`
    : "Anillo: -- • Línea: -- • Peso: --";
}

matchRedSelect.addEventListener("change", () => {
  updateVersusBanner(matchRedSelect.value, matchBlueSelect.value);
});

matchBlueSelect.addEventListener("change", () => {
  updateVersusBanner(matchRedSelect.value, matchBlueSelect.value);
});

// Registrar combate en Firestore
matchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const numero = document.getElementById("match-number").value.trim();
  const rojoId = matchRedSelect.value;
  const azulId = matchBlueSelect.value;
  const resultado = document.getElementById("match-result").value;

  if (rojoId === azulId) {
    alert("Debes seleccionar dos ejemplares distintos para el combate.");
    return;
  }

  const galloRojo = findById(rojoId);
  const galloAzul = findById(azulId);

  try {
    await addDoc(collection(db, "combates"), {
      numero,
      rojoId,
      rojoNombre: galloRojo ? `${galloRojo.nombre} (${galloRojo.anillo})` : "Desconocido",
      azulId,
      azulNombre: galloAzul ? `${galloAzul.nombre} (${galloAzul.anillo})` : "Desconocido",
      resultado,
      creadoEn: serverTimestamp()
    });
    updateVersusBanner(rojoId, azulId, numero);
    matchForm.reset();
  } catch (error) {
    console.error("Error al registrar combate:", error);
    alert("No se pudo guardar el combate en Firebase.");
  }
});

// Escuchar cartelera de combates en tiempo real
const matchesQuery = query(collection(db, "combates"), orderBy("creadoEn", "desc"));
onSnapshot(matchesQuery, (snapshot) => {
  dbStatus.textContent = "Conectado a Firebase (gallos-4b523)";
  const matchesList = document.getElementById("matches-list");
  const matchesCount = document.getElementById("matches-count");

  matchesList.innerHTML = "";

  if (snapshot.empty) {
    matchesList.innerHTML = `<p class="empty-msg">Sin combates programados en cartelera.</p>`;
  }

  snapshot.forEach((docSnap) => {
    const match = docSnap.data();
    const item = document.createElement("div");
    item.className = "match-item";
    item.innerHTML = `
      <div>
        <strong>${match.numero}</strong>
        <div class="node-meta">${match.rojoNombre} <strong>VS</strong> ${match.azulNombre}</div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="status-pill">${match.resultado}</span>
        <button class="icon-btn btn-del-match" title="Eliminar pelea"><i class="ph ph-trash"></i></button>
      </div>
    `;

    // Al hacer clic en un combate de la lista, se proyecta en el banner de la transmisión
    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-del-match")) return;
      updateVersusBanner(match.rojoId, match.azulId, match.numero);
    });

    item.querySelector(".btn-del-match").addEventListener("click", async () => {
      await deleteDoc(doc(db, "combates", docSnap.id));
    });

    matchesList.appendChild(item);
  });

  matchesCount.textContent = `${snapshot.size} peleas`;
});

/* ==========================================================================
   3. MÓDULO CRUD DE LINAJE Y TRAZABILIDAD (COLECCIÓN: 'gallos')
   ========================================================================== */
const roosterForm = document.getElementById("rooster-form");
const roosterIdInput = document.getElementById("rooster-id");
const sireSelect = document.getElementById("rooster-sire");
const damSelect = document.getElementById("rooster-dam");
const mateSelect = document.getElementById("rooster-mate");
const childrenSelect = document.getElementById("rooster-children");
const childrenCountBadge = document.getElementById("children-selected-count");
const cancelEditBtn = document.getElementById("btn-cancel-edit");
const searchRoosterInput = document.getElementById("search-rooster");

// Actualizar contador y opciones al interactuar con el formulario
childrenSelect.addEventListener("change", () => {
  const count = childrenSelect.selectedOptions.length;
  childrenCountBadge.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
});

document.getElementById("rooster-sex").addEventListener("change", () => {
  populateSelects(roosterIdInput.value || null);
});

// Escuchar colección 'gallos' en tiempo real
onSnapshot(collection(db, "gallos"), (snapshot) => {
  dbStatus.textContent = "Conectado a Firebase (gallos-4b523)";
  roostersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById("roosters-count").textContent = `${roostersData.length} registros`;

  populateSelects(roosterIdInput.value || null);
  renderRoostersList(searchRoosterInput.value);

  if (selectedRoosterId) {
    renderFamilyTree(selectedRoosterId);
  } else if (roostersData.length > 0) {
    selectedRoosterId = roostersData[0].id;
    renderFamilyTree(selectedRoosterId);
  }
});

// Crear o Actualizar ejemplar
roosterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const editId = roosterIdInput.value;
  const sexo = document.getElementById("rooster-sex").value;
  const newMateId = mateSelect.value || null;
  const selectedChildrenIds = Array.from(childrenSelect.selectedOptions).map(opt => opt.value);

  const previousDoc = editId ? findById(editId) : null;
  const oldMateId = previousDoc ? previousDoc.parejaId : null;

  const payload = {
    anillo: document.getElementById("rooster-ring").value.trim(),
    nombre: document.getElementById("rooster-name").value.trim(),
    sexo: sexo,
    linea: document.getElementById("rooster-line").value.trim(),
    peso: document.getElementById("rooster-weight").value.trim() || "S/P",
    record: document.getElementById("rooster-wins").value.trim() || "0V - 0D",
    padreId: sireSelect.value || null,
    madreId: damSelect.value || null,
    parejaId: newMateId
  };

  try {
    let currentId = editId;
    if (editId) {
      await updateDoc(doc(db, "gallos", editId), payload);
    } else {
      const docRef = await addDoc(collection(db, "gallos"), payload);
      currentId = docRef.id;
      selectedRoosterId = docRef.id;
    }

    // 1. Sincronizar Pareja (Bidireccional)
    if (oldMateId && oldMateId !== newMateId) {
      const oldMate = findById(oldMateId);
      if (oldMate && oldMate.parejaId === currentId) {
        await updateDoc(doc(db, "gallos", oldMateId), { parejaId: null });
      }
    }
    if (newMateId) {
      await updateDoc(doc(db, "gallos", newMateId), { parejaId: currentId });
    }

    // 2. Sincronizar Hijos
    const previousChildren = roostersData.filter(r => 
      (sexo === "M" && r.padreId === currentId) || 
      (sexo === "H" && r.madreId === currentId)
    );

    // Desvincular los que ya no están seleccionados
    for (const prevChild of previousChildren) {
      if (!selectedChildrenIds.includes(prevChild.id)) {
        const updateField = sexo === "M" ? { padreId: null } : { madreId: null };
        await updateDoc(doc(db, "gallos", prevChild.id), updateField);
      }
    }

    // Vincular los nuevos hijos seleccionados
    for (const childId of selectedChildrenIds) {
      const childDoc = findById(childId);
      if (childDoc) {
        const updateField = {};
        if (sexo === "M") {
          updateField.padreId = currentId;
          if (newMateId && !childDoc.madreId) {
            updateField.madreId = newMateId;
          }
        } else {
          updateField.madreId = currentId;
          if (newMateId && !childDoc.padreId) {
            updateField.padreId = newMateId;
          }
        }
        await updateDoc(doc(db, "gallos", childId), updateField);
      }
    }

    resetRoosterForm();
  } catch (error) {
    console.error("Error guardando ejemplar:", error);
    alert("No se pudo guardar el ejemplar en Firebase.");
  }
});

// Poblar selectores de Padre (M), Madre (H), Pareja, Hijos y Combate
function populateSelects(excludeId = null) {
  const currentSire = sireSelect.value;
  const currentDam = damSelect.value;
  const currentMate = mateSelect.value;
  const currentRed = matchRedSelect.value;
  const currentBlue = matchBlueSelect.value;
  const currentSelectedChildren = Array.from(childrenSelect.selectedOptions).map(o => o.value);
  const currentSex = document.getElementById("rooster-sex").value;

  sireSelect.innerHTML = `<option value="">-- Sin Registro / Fundador --</option>`;
  damSelect.innerHTML = `<option value="">-- Sin Registro / Fundadora --</option>`;
  mateSelect.innerHTML = `<option value="">-- Sin Pareja Asignada --</option>`;
  childrenSelect.innerHTML = "";
  matchRedSelect.innerHTML = `<option value="">-- Seleccionar Gallo --</option>`;
  matchBlueSelect.innerHTML = `<option value="">-- Seleccionar Gallo --</option>`;

  roostersData.forEach(r => {
    const optionHtml = `<option value="${r.id}">[${r.anillo}] ${r.nombre} (${r.linea})</option>`;
    
    // Para combates solo listamos machos
    if (r.sexo === "M") {
      matchRedSelect.innerHTML += optionHtml;
      matchBlueSelect.innerHTML += optionHtml;
    }

    if (r.id === excludeId) return;

    // Padre y Madre
    if (r.sexo === "M") sireSelect.innerHTML += optionHtml;
    if (r.sexo === "H") damSelect.innerHTML += optionHtml;

    // Pareja: filtrar preferentemente por el sexo opuesto
    const isOppositeSex = (currentSex === "M" && r.sexo === "H") || (currentSex === "H" && r.sexo === "M");
    if (isOppositeSex) {
      mateSelect.innerHTML += `<option value="${r.id}">[${r.anillo}] ${r.nombre} (${r.sexo === 'M' ? 'Gallo' : 'Gallina'} • ${r.linea})</option>`;
    }

    // Hijos: cualquier ejemplar excepto él mismo y sus padres directos
    const isDirectParent = (excludeId && (r.id === currentSire || r.id === currentDam));
    if (!isDirectParent) {
      const childOpt = document.createElement("option");
      childOpt.value = r.id;
      childOpt.textContent = `[${r.anillo}] ${r.nombre} (${r.sexo === 'M' ? 'Macho' : 'Hembra'} • ${r.linea})`;
      if (currentSelectedChildren.includes(r.id)) {
        childOpt.selected = true;
      }
      childrenSelect.appendChild(childOpt);
    }
  });

  sireSelect.value = currentSire;
  damSelect.value = currentDam;
  mateSelect.value = currentMate;
  matchRedSelect.value = currentRed;
  matchBlueSelect.value = currentBlue;

  const count = childrenSelect.selectedOptions.length;
  childrenCountBadge.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
}

// Renderizar lista del Padrón
function renderRoostersList(filterText = "") {
  const listEl = document.getElementById("roosters-list");
  listEl.innerHTML = "";

  const queryText = filterText.toLowerCase().trim();
  const filtered = roostersData.filter(r =>
    r.nombre.toLowerCase().includes(queryText) ||
    r.anillo.toLowerCase().includes(queryText) ||
    r.linea.toLowerCase().includes(queryText)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="empty-msg">No se encontraron ejemplares.</p>`;
    return;
  }

  filtered.forEach(r => {
    const item = document.createElement("div");
    item.className = `rooster-item ${r.id === selectedRoosterId ? "selected" : ""}`;
    const mate = r.parejaId ? findById(r.parejaId) : null;
    const mateText = mate ? ` • Pareja: ${mate.nombre}` : '';

    item.innerHTML = `
      <div class="rooster-info">
        <strong>${r.nombre} <small>(${r.anillo})</small></strong>
        <div class="node-meta">${r.linea} • ${r.sexo === 'M' ? 'Gallo' : 'Gallina'} • ${r.record}${mateText}</div>
      </div>
      <div class="rooster-actions">
        <button class="icon-btn btn-edit" title="Editar"><i class="ph ph-pencil-simple"></i></button>
        <button class="icon-btn btn-delete" title="Eliminar"><i class="ph ph-trash"></i></button>
      </div>
    `;

    item.addEventListener("click", (e) => {
      if (e.target.closest(".icon-btn")) return;
      selectedRoosterId = r.id;
      renderRoostersList(searchRoosterInput.value);
      renderFamilyTree(r.id);
    });

    item.querySelector(".btn-edit").addEventListener("click", () => loadRoosterIntoForm(r));

    item.querySelector(".btn-delete").addEventListener("click", async () => {
      if (confirm(`¿Eliminar a ${r.nombre} (${r.anillo}) del registro?`)) {
        if (r.parejaId) {
          const mate = findById(r.parejaId);
          if (mate && mate.parejaId === r.id) {
            await updateDoc(doc(db, "gallos", r.parejaId), { parejaId: null });
          }
        }
        await deleteDoc(doc(db, "gallos", r.id));
        if (selectedRoosterId === r.id) selectedRoosterId = null;
      }
    });

    listEl.appendChild(item);
  });
}

searchRoosterInput.addEventListener("input", (e) => renderRoostersList(e.target.value));

function loadRoosterIntoForm(r) {
  document.getElementById("crud-form-title").innerHTML = `<i class="ph ph-pencil-simple"></i> Editando: ${r.nombre}`;
  roosterIdInput.value = r.id;
  document.getElementById("rooster-ring").value = r.anillo;
  document.getElementById("rooster-name").value = r.nombre;
  document.getElementById("rooster-sex").value = r.sexo;
  document.getElementById("rooster-line").value = r.linea;
  document.getElementById("rooster-weight").value = r.peso;
  document.getElementById("rooster-wins").value = r.record;

  populateSelects(r.id);
  sireSelect.value = r.padreId || "";
  damSelect.value = r.madreId || "";
  mateSelect.value = r.parejaId || "";

  // Seleccionar automáticamente los hijos actuales de este ejemplar
  let selectedCount = 0;
  Array.from(childrenSelect.options).forEach(opt => {
    const child = findById(opt.value);
    const isChild = child && (
      (r.sexo === "M" && child.padreId === r.id) || 
      (r.sexo === "H" && child.madreId === r.id)
    );
    opt.selected = !!isChild;
    if (isChild) selectedCount++;
  });
  childrenCountBadge.textContent = `${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}`;

  cancelEditBtn.classList.remove("hidden");
}

function resetRoosterForm() {
  document.getElementById("crud-form-title").innerHTML = `<i class="ph ph-plus-circle"></i> Registrar Ejemplar`;
  roosterForm.reset();
  roosterIdInput.value = "";
  populateSelects();
  mateSelect.value = "";
  Array.from(childrenSelect.options).forEach(opt => opt.selected = false);
  childrenCountBadge.textContent = "0 seleccionados";
  cancelEditBtn.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", resetRoosterForm);

/* ==========================================================================
   4. VISUALIZADOR DEL ÁRBOL GENEALÓGICO (4 NIVELES)
   ========================================================================== */
function findById(id) {
  return roostersData.find(r => r.id === id) || null;
}

function createNodeHTML(rooster, roleLabel, isRoot = false) {
  if (!rooster) {
    return `
      <div class="tree-node unknown">
        <span class="node-role">${roleLabel}</span>
        <span class="node-name">Sin Registro</span>
        <div class="node-meta">Origen desconocido / Fundador</div>
      </div>
    `;
  }

  return `
    <div class="tree-node ${isRoot ? 'root-node' : ''}" data-id="${rooster.id}">
      <span class="node-role">${roleLabel} • ${rooster.anillo}</span>
      <span class="node-name">${rooster.nombre}</span>
      <div class="node-meta">${rooster.linea} | ${rooster.peso} lbs | ${rooster.record}</div>
    </div>
  `;
}

function renderFamilyTree(rootId) {
  const container = document.getElementById("tree-container");
  const subject = findById(rootId);

  if (!subject) {
    container.innerHTML = `<p class="empty-msg">Selecciona un ejemplar válido.</p>`;
    return;
  }

  // Nivel Padres
  const sire = findById(subject.padreId);
  const dam = findById(subject.madreId);

  // Nivel Abuelos
  const patGrandSire = sire ? findById(sire.padreId) : null;
  const patGrandDam = sire ? findById(sire.madreId) : null;
  const matGrandSire = dam ? findById(dam.padreId) : null;
  const matGrandDam = dam ? findById(dam.madreId) : null;

  // Nivel Descendencia (Hijos directos)
  const offspring = roostersData.filter(r => r.padreId === subject.id || r.madreId === subject.id);

  // Pareja asignada
  const mate = subject.parejaId ? findById(subject.parejaId) : null;

  container.innerHTML = `
    <!-- NIVEL 1: ABUELOS -->
    <div class="tree-level">
      <div class="level-title">1. Generación Abuelos (Ascendencia Abuelos)</div>
      <div class="nodes-grid cols-4">
        ${createNodeHTML(patGrandSire, "Abuelo Paterno")}
        ${createNodeHTML(patGrandDam, "Abuela Paterna")}
        ${createNodeHTML(matGrandSire, "Abuelo Materno")}
        ${createNodeHTML(matGrandDam, "Abuela Materna")}
      </div>
    </div>

    <!-- NIVEL 2: PADRES -->
    <div class="tree-level">
      <div class="level-title">2. Generación Padres (Reproductores Directos)</div>
      <div class="nodes-grid cols-2">
        ${createNodeHTML(sire, "Padre (Sire)")}
        ${createNodeHTML(dam, "Madre (Dam)")}
      </div>
    </div>

    <!-- NIVEL 3: EJEMPLAR SELECCIONADO Y PAREJA -->
    <div class="tree-level">
      <div class="level-title">3. Ejemplar en Inspección ${mate ? 'y Pareja Reproductora' : ''}</div>
      <div class="nodes-grid ${mate ? 'cols-2' : 'cols-1'}">
        ${createNodeHTML(subject, "Ejemplar Actual", true)}
        ${mate ? createNodeHTML(mate, "Pareja Reproductora") : ""}
      </div>
    </div>

    <!-- NIVEL 4: DESCENDENCIA (HIJOS) -->
    <div class="tree-level">
      <div class="level-title">4. Descendencia Registrada (${offspring.length} Hijos)</div>
      <div class="nodes-grid ${offspring.length > 1 ? 'cols-2' : 'cols-1'}">
        ${
          offspring.length > 0
            ? offspring.map(child => createNodeHTML(child, "Hijo/a Directo")).join("")
            : `<div class="node-meta" style="text-align:center;">Sin crías registradas para este ejemplar.</div>`
        }
      </div>
    </div>
  `;

  container.querySelectorAll(".tree-node[data-id]").forEach(node => {
    node.addEventListener("click", () => {
      const targetId = node.getAttribute("data-id");
      selectedRoosterId = targetId;
      renderRoostersList(searchRoosterInput.value);
      renderFamilyTree(targetId);
    });
  });
}

/* ==========================================================================
   5. CARGA DE DATOS DEMO (3 GENERACIONES DE PRUEBA)
   ========================================================================== */
document.getElementById("btn-seed-data").addEventListener("click", async () => {
  try {
    const abPaterno = await addDoc(collection(db, "gallos"), {
      anillo: "GEN1-001", nombre: "Patriarca Kelso", sexo: "M", linea: "Kelso Puro", peso: "4.15", record: "7V - 0D", padreId: null, madreId: null
    });
    const abPaterna = await addDoc(collection(db, "gallos"), {
      anillo: "GEN1-002", nombre: "Duquesa Albany", sexo: "H", linea: "Albany", peso: "3.60", record: "Reproductora", padreId: null, madreId: null
    });
    const abMaterno = await addDoc(collection(db, "gallos"), {
      anillo: "GEN1-003", nombre: "Sultán Sweater", sexo: "M", linea: "Sweater 5000", peso: "4.20", record: "5V - 1D", padreId: null, madreId: null
    });
    const abMaterna = await addDoc(collection(db, "gallos"), {
      anillo: "GEN1-004", nombre: "Reina Hatch", sexo: "H", linea: "Blueface Hatch", peso: "3.55", record: "Reproductora", padreId: null, madreId: null
    });

    // Enlazar parejas abuelos
    await updateDoc(doc(db, "gallos", abPaterno.id), { parejaId: abPaterna.id });
    await updateDoc(doc(db, "gallos", abPaterna.id), { parejaId: abPaterno.id });
    await updateDoc(doc(db, "gallos", abMaterno.id), { parejaId: abMaterna.id });
    await updateDoc(doc(db, "gallos", abMaterna.id), { parejaId: abMaterno.id });

    const padre = await addDoc(collection(db, "gallos"), {
      anillo: "GEN2-010", nombre: "Centella Roja", sexo: "M", linea: "Kelso x Albany", peso: "4.10", record: "5V - 0D", padreId: abPaterno.id, madreId: abPaterna.id
    });
    const madre = await addDoc(collection(db, "gallos"), {
      anillo: "GEN2-011", nombre: "Tormenta Dorada", sexo: "H", linea: "Sweater x Hatch", peso: "3.65", record: "Reproductora", padreId: abMaterno.id, madreId: abMaterna.id
    });

    // Enlazar pareja padres
    await updateDoc(doc(db, "gallos", padre.id), { parejaId: madre.id });
    await updateDoc(doc(db, "gallos", madre.id), { parejaId: padre.id });

    const hijo = await addDoc(collection(db, "gallos"), {
      anillo: "PER-2026-099", nombre: "Relámpago Imperial", sexo: "M", linea: "Cruce Estelar 4 Líneas", peso: "4.08", record: "3V - 0D", padreId: padre.id, madreId: madre.id
    });

    selectedRoosterId = hijo.id;
  } catch (err) {
    console.error("Error creando linaje demo:", err);
  }
});