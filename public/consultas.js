// public/consultas.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/prendas';
    let todasLasPrendas = [];
    let colorFiltroActivo = null;
    let idPrendaEditando = null;

    const indicesCarrusel = {
        superiores: 0,
        inferiores: 0,
        calzado: 0,
        accesorios: 0
    };

    const mapaCarruseles = {
        superiores: '.top-carousel',
        inferiores: '.bottom-carousel',
        calzado: '.shoes-carousel',
        accesorios: '.accessories-carousel'
    };

    // Referencias a todas las vistas <main>
    const vistas = {
        armario: document.querySelector('.closet-display-area'),
        addItem: document.querySelector('.closet-display-arena.addItem'),
        combinaciones: document.querySelector('.closet-display-arena.savedOutfits'),
        favoritos: document.querySelector('.closet-display-arena.favoriteOutfits'),
        configuracion: document.querySelector('.closet-display-arena.profileSettings')
    };

    // Guardar el display original del main principal (ej. flex o block según tu CSS)
    const displayOriginalArmario = window.getComputedStyle(vistas.armario).display || 'flex';

    // Inicializar todo
    ocultarTodasLasVistas();
    mostrarVista('armario');
    cargarPrendas();
    configurarNavegacionMenu();
    configurarFormularioPrenda();
    configurarSidebarDerecho();
    configurarFlechasCarrusel();
    configurarGuardarOutfit();
    configurarLogout();

    // ==========================================
    // 1. GESTOR CENTRALIZADO DE VISTAS
    // ==========================================
    function ocultarTodasLasVistas() {
        Object.values(vistas).forEach(vista => {
            if (vista) vista.style.display = 'none';
        });
    }

    function mostrarVista(nombreVista) {
        ocultarTodasLasVistas();

        if (nombreVista === 'armario' && vistas.armario) {
            vistas.armario.style.display = displayOriginalArmario;
        } else if (vistas[nombreVista]) {
            vistas[nombreVista].style.display = 'block';
        }

        // Actualizar título de la ventana estilo OS
        const titulosOS = {
            armario: 'Guardaroba_OS - [Mi_Armario.exe]',
            addItem: 'Guardaroba_OS - [Añadir_Prenda.exe]',
            combinaciones: 'Guardaroba_OS - [Combinaciones.exe]',
            favoritos: 'Guardaroba_OS - [Favoritos.exe]',
            configuracion: 'Guardaroba_OS - [Configuracion.exe]'
        };
        const titleEl = document.querySelector('.window-title');
        if (titleEl && titulosOS[nombreVista]) {
            titleEl.textContent = titulosOS[nombreVista];
        }

        // Actualizar clase active en el menú superior
        document.querySelectorAll('.window-menu-bar .menu-link').forEach(link => {
            const target = link.dataset.view || link.textContent.trim().toLowerCase();
            const coincide =
                (nombreVista === 'armario' && target.includes('armario')) ||
                (nombreVista === 'combinaciones' && target.includes('combinaciones')) ||
                (nombreVista === 'favoritos' && target.includes('favoritos')) ||
                (nombreVista === 'configuracion' && target.includes('configuración'));

            link.classList.toggle('active', coincide);
        });

        // Si entra a Combinaciones o Favoritos, cargarlos desde MongoDB
        if (nombreVista === 'combinaciones' || nombreVista === 'favoritos') {
            cargarOutfitsGuardados(nombreVista);
        }
    }

    function configurarNavegacionMenu() {
        document.querySelectorAll('.window-menu-bar .menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const texto = link.textContent.trim().toLowerCase();

                if (texto.includes('armario')) mostrarVista('armario');
                else if (texto.includes('combinaciones')) mostrarVista('combinaciones');
                else if (texto.includes('favoritos')) mostrarVista('favoritos');
                else if (texto.includes('configuración')) mostrarVista('configuracion');
            });
        });

        // Botón "Añadir Item" que aparece cuando no hay prendas
        const btnAddEmpty = document.querySelector('.no-items-message .btn-add-item');
        if (btnAddEmpty) {
            btnAddEmpty.addEventListener('click', (e) => {
                e.preventDefault();
                abrirFormularioNuevaPrenda();
            });
        }
    }

    function abrirFormularioNuevaPrenda() {
        const form = document.getElementById('add-item-form');
        idPrendaEditando = null;
        form.reset();
        form.querySelector('h3').textContent = 'Añadir Item';
        form.querySelector('.btn-submit').textContent = 'Añadir';

        const imagePreview = form.querySelector('#imagePreview');
        const uploadContent = form.querySelector('#uploadContent');
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
        if (uploadContent) uploadContent.classList.remove('hidden');

        mostrarVista('addItem');
    }

    // ==========================================
    // 2. CONSULTAS A LA BASE DE DATOS (PRENDAS)
    // ==========================================
    async function cargarPrendas() {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if (data.success) {
                todasLasPrendas = data.prendas;
                actualizarVistaPrincipal();
            }
        } catch (error) {
            console.error('Error al cargar prendas:', error);
        }
    }

    async function eliminarPrendaDB(id) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const data = await res.json();
            showNotification(data.message, data.success ? 'success' : 'error');
            if (data.success) await cargarPrendas();
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }

    // ==========================================
    // 3. FORMULARIO (SUBIR Y MODIFICAR PRENDAS)
    // ==========================================
    function configurarFormularioPrenda() {
        const form = document.getElementById('add-item-form');
        if (!form) return;

        const imageInput = form.querySelector('#imageInput');
        const imagePreview = form.querySelector('#imagePreview');
        const uploadContent = form.querySelector('#uploadContent');

        // Vista previa de imagen
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.classList.remove('hidden');
                uploadContent.classList.add('hidden');
            }
        });

        // Envío del formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('nombre', form.querySelector('#item-name').value.trim());
            formData.append('categoria', form.querySelector('#item-category').value);
            formData.append('color', form.querySelector('#item-color').value);

            if (imageInput.files[0]) {
                formData.append('imagen', imageInput.files[0]);
            } else if (!idPrendaEditando) {
                showNotification('Por favor selecciona una imagen para la prenda', 'error');
                return;
            }

            try {
                const url = idPrendaEditando ? `${API_URL}/${idPrendaEditando}` : API_URL;
                const method = idPrendaEditando ? 'PUT' : 'POST';

                const res = await fetch(url, { method, body: formData });
                const data = await res.json();

                showNotification(data.message, data.success ? 'success' : 'error');

                if (data.success) {
                    form.reset();
                    idPrendaEditando = null;
                    imagePreview.src = '';
                    imagePreview.classList.add('hidden');
                    uploadContent.classList.remove('hidden');

                    mostrarVista('armario');
                    await cargarPrendas();
                }
            } catch (error) {
                console.error('Error al guardar:', error);
                showNotification('Error de conexión con el servidor', 'error');
            }
        });
    }

    function prepararEdicion(prenda) {
        const form = document.getElementById('add-item-form');
        idPrendaEditando = prenda._id;

        form.querySelector('h3').textContent = 'Modificar Item';
        form.querySelector('.btn-submit').textContent = 'Guardar Cambios';
        form.querySelector('#item-name').value = prenda.nombre;
        form.querySelector('#item-category').value = prenda.categoria;
        form.querySelector('#item-color').value = prenda.color;

        const imagePreview = form.querySelector('#imagePreview');
        const uploadContent = form.querySelector('#uploadContent');
        imagePreview.src = prenda.imagen;
        imagePreview.classList.remove('hidden');
        uploadContent.classList.add('hidden');

        mostrarVista('addItem');
    }

    // ==========================================
    // 4. RENDERIZADO DE ARMARIOS Y PALETA DE COLORES
    // ==========================================
    function actualizarVistaPrincipal() {
        const msgNoItems = document.querySelector('.no-items-message');
        const contenedorCarrusel = document.querySelector('.closet-carrusel');

        if (todasLasPrendas.length === 0) {
            msgNoItems.style.display = 'block';
            contenedorCarrusel.style.display = 'none';
        } else {
            msgNoItems.style.display = 'none';
            contenedorCarrusel.style.display = 'block';
            vistas.armario.classList.remove('initial-state');
        }

        renderizarPaletaColores();
        Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
    }

    function renderizarPaletaColores() {
        const paleta = document.querySelector('.color-palette-mini.filtro');
        if (!paleta) return;
        paleta.innerHTML = '';

        const coloresUnicos = [...new Set(todasLasPrendas.map(p => p.color))];

        if (coloresUnicos.length > 0) {
            const btnReset = document.createElement('div');
            btnReset.className = 'color-swatch';
            btnReset.title = 'Quitar filtro';
            btnReset.textContent = '✖';
            btnReset.style.cssText = 'background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px;';
            btnReset.addEventListener('click', () => {
                colorFiltroActivo = null;
                renderizarPaletaColores();
                Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
            });
            paleta.appendChild(btnReset);
        }

        coloresUnicos.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.background = color;
            swatch.style.cursor = 'pointer';
            if (colorFiltroActivo === color) {
                swatch.style.outline = '2px solid #000';
                swatch.style.transform = 'scale(1.15)';
            }

            swatch.addEventListener('click', () => {
                colorFiltroActivo = (colorFiltroActivo === color) ? null : color;
                renderizarPaletaColores();
                Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
            });

            paleta.appendChild(swatch);
        });
    }

    // ==========================================
    // 5. CARRUSELES Y SIDEBAR DERECHO
    // ==========================================
    function obtenerFiltradas(categoria) {
        return todasLasPrendas.filter(p => {
            const matchCat = p.categoria === categoria;
            const matchColor = colorFiltroActivo ? p.color === colorFiltroActivo : true;
            return matchCat && matchColor;
        });
    }

    function renderizarCarrusel(categoria) {
        const carrusel = document.querySelector(mapaCarruseles[categoria]);
        const slot = carrusel.querySelector('.clothing-preview-slot');
        const prendas = obtenerFiltradas(categoria);

        if (prendas.length === 0) {
            slot.innerHTML = `
                <span class="slot-tag">${categoria.toUpperCase()}</span>
                <div class="item-card-mini">Sin prendas</div>
            `;
            return;
        }

        if (indicesCarrusel[categoria] >= prendas.length) indicesCarrusel[categoria] = 0;
        const prenda = prendas[indicesCarrusel[categoria]];

        slot.innerHTML = `
            <span class="slot-tag">${prenda.nombre}</span>
            <div class="item-card-mini" style="position:relative;">
                <img src="${prenda.imagen}" alt="${prenda.nombre}" style="max-height:110px; object-fit:contain;">
                <div style="position:absolute; top:2px; right:2px; display:flex; gap:4px;">
                    <button class="btn-edit-item" title="Editar" style="cursor:pointer; font-size:10px;">✏️</button>
                    <button class="btn-del-item" title="Eliminar" style="cursor:pointer; font-size:10px;">🗑️</button>
                </div>
            </div>
        `;

        slot.querySelector('.btn-edit-item').addEventListener('click', () => prepararEdicion(prenda));
        slot.querySelector('.btn-del-item').addEventListener('click', () => {
            if (confirm(`¿Eliminar "${prenda.nombre}"?`)) eliminarPrendaDB(prenda._id);
        });
    }

    function configurarFlechasCarrusel() {
        Object.entries(mapaCarruseles).forEach(([categoria, selector]) => {
            const btns = document.querySelectorAll(`${selector} .carousel-arrow`);
            btns[0].addEventListener('click', () => {
                const prendas = obtenerFiltradas(categoria);
                if (!prendas.length) return;
                indicesCarrusel[categoria] = (indicesCarrusel[categoria] - 1 + prendas.length) % prendas.length;
                renderizarCarrusel(categoria);
            });
            btns[1].addEventListener('click', () => {
                const prendas = obtenerFiltradas(categoria);
                if (!prendas.length) return;
                indicesCarrusel[categoria] = (indicesCarrusel[categoria] + 1) % prendas.length;
                renderizarCarrusel(categoria);
            });
        });
    }

    function configurarSidebarDerecho() {
        document.querySelectorAll('.inventory-sidebar .inv-item').forEach(item => {
            const texto = item.textContent.toLowerCase();

            // Botón Añadir Item
            if (item.classList.contains('btn_add-item')) {
                item.addEventListener('click', () => {
                    const estaAbierto = vistas.addItem.style.display === 'block';
                    if (estaAbierto) {
                        mostrarVista('armario');
                    } else {
                        abrirFormularioNuevaPrenda();
                    }
                });
                return;
            }

            // Botón Dress Me
            if (item.classList.contains('special')) {
                item.addEventListener('click', () => {
                    mostrarVista('armario');
                    Object.keys(indicesCarrusel).forEach(cat => {
                        const prendas = obtenerFiltradas(cat);
                        if (prendas.length) indicesCarrusel[cat] = Math.floor(Math.random() * prendas.length);
                    });
                    Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
                });
                return;
            }

            // Toggle de categorías (1 clic muestra carrusel, 2do clic oculta)
            let cat = null;
            if (texto.includes('superiores')) cat = 'superiores';
            else if (texto.includes('inferiores')) cat = 'inferiores';
            else if (texto.includes('calzado')) cat = 'calzado';
            else if (texto.includes('accesorios')) cat = 'accesorios';

            if (cat) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => {
                    mostrarVista('armario');
                    const carrusel = document.querySelector(mapaCarruseles[cat]);
                    const oculto = carrusel.style.display === 'none';
                    carrusel.style.display = oculto ? 'flex' : 'none';
                    item.classList.toggle('inactive-category', !oculto);
                });
            }
        });
    }

    // ==========================================
    // 6. COMBINACIONES Y FAVORITOS
    // ==========================================
    function configurarGuardarOutfit() {
        const btnFav = document.getElementById('like-outfit-btn');
        if (!btnFav) return;

        btnFav.addEventListener('click', async () => {
            const idsSeleccionados = [];

            Object.entries(mapaCarruseles).forEach(([cat, selector]) => {
                const carrusel = document.querySelector(selector);
                const visible = carrusel.style.display !== 'none';
                const prendas = obtenerFiltradas(cat);

                if (visible && prendas.length > 0) {
                    idsSeleccionados.push(prendas[indicesCarrusel[cat]]._id);
                }
            });

            if (idsSeleccionados.length < 2) {
                showNotification('Debes tener al menos 2 categorías visibles con prendas para guardar', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/outfits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: idsSeleccionados })
                });
                const data = await res.json();
                showNotification(data.message, data.success ? 'success' : 'error');

                if (data.success) {
                    btnFav.textContent = '💖';
                    btnFav.style.background = '#f8bbd0';
                    setTimeout(() => {
                        btnFav.textContent = '🤍';
                        btnFav.style.background = '#e0e0e0';
                    }, 1500);
                }
            } catch (error) {
                console.error('Error al guardar outfit:', error);
            }
        });
    }

    async function cargarOutfitsGuardados(vistaDestino) {
        const contenedor = vistaDestino === 'favoritos'
            ? document.getElementById('favorite-outfits-container') || vistas.favoritos
            : document.getElementById('saved-outfits-container') || vistas.combinaciones;

        try {
            const res = await fetch(`${API_URL}/outfits`);
            const data = await res.json();
            if (!data.success || !data.outfits.length) {
                contenedor.innerHTML = '<p>Aún no tienes combinaciones guardadas.</p>';
                return;
            }

            contenedor.innerHTML = data.outfits.map(outfit => `
                <div class="outfit-card" style="border:1px solid #ccc; padding:10px; margin:8px; display:inline-block;">
                    <div style="display:flex; gap:6px;">
                        ${outfit.items.map(item => `<img src="${item.imagen}" alt="${item.nombre}" style="width:60px; height:60px; object-fit:contain;">`).join('')}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error al cargar outfits:', error);
        }
    }

    // ==========================================
    // 7. LOGOUT Y NOTIFICACIONES
    // ==========================================
    function configurarLogout() {
        const logoutAction = () => {
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        };
        document.getElementById('logout-btn')?.addEventListener('click', logoutAction);
        document.getElementById('logout-btn-footer')?.addEventListener('click', logoutAction);
    }

    function showNotification(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return alert(message);

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});