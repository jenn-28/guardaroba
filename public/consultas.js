// public/consultas.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/prendas';
    const AUTH_URL = '/api/auth';
    const LIMITE_PRENDAS_INVITADO = 3; // Máximo 3 prendas por categoría en modo invitado

    // Detectar Rol Activo ('user' registrado o 'guest' invitado)
    let usuarioActual = JSON.parse(localStorage.getItem('user') || 'null');
    const esInvitado = !usuarioActual && sessionStorage.getItem('guestMode') === 'true';

    if (!usuarioActual && !esInvitado) {
        window.location.href = '/index.html';
        return;
    }

    const rolActual = esInvitado ? 'guest' : 'user';

    // En modo invitado, este arreglo vive únicamente en RAM (al recargar o cerrar se borra todo)
    let todasLasPrendas = [];
    let colorFiltroActivo = null;
    let categoriasFiltroGrid = new Set();
    let vistaActual = 'armario';
    let idPrendaEditando = null;
    let idOutfitEditando = null;

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

    const vistas = {
        armario: document.querySelector('.closet-display-area'),
        addItem: document.querySelector('.closet-display-arena.addItem'),
        prendas: document.querySelector('.closet-display-arena.savedOutfits'),
        favoritos: document.querySelector('.closet-display-arena.favoriteOutfits'),
        configuracion: document.querySelector('.closet-display-arena.profileSettings')
    };

    const displayOriginalArmario = window.getComputedStyle(vistas.armario).display || 'flex';

    // Inicializar
    aplicarPermisosPorRol();
    cargarDatosUsuarioEnUI();
    mostrarVista('armario');
    cargarPrendas();
    configurarNavegacionMenu();
    configurarFormularioPrenda();
    configurarFormularioPerfil();
    configurarSidebarDerecho();
    configurarFlechasCarrusel();
    configurarBotonesOutfit();
    configurarLogout();

    // ==========================================
    // 0. CONTROL DE ROLES Y PERMISOS
    // ==========================================
    function aplicarPermisosPorRol() {
        if (rolActual === 'guest') {
            document.querySelectorAll('.window-menu-bar .menu-link').forEach(link => {
                const texto = link.textContent.trim().toLowerCase();
                if (!texto.includes('armario')) {
                    link.style.display = 'none';
                }
            });

            const btnFav = document.getElementById('like-outfit-btn');
            if (btnFav) {
                btnFav.classList.add('disabled-role');
                btnFav.title = 'Inicia sesión o regístrate para guardar outfits en Favoritos';
            }

            const btnLogoutFooter = document.getElementById('logout-btn-footer');
            if (btnLogoutFooter) btnLogoutFooter.textContent = 'Salir del modo invitado / Registrarse';
        }
    }

    function contarPrendasPorCategoria(categoria) {
        return todasLasPrendas.filter(p => p.categoria === categoria).length;
    }

    function verificarLimitesInvitado() {
        if (rolActual !== 'guest') return false;

        const categorias = ['superiores', 'inferiores', 'calzado', 'accesorios'];
        const todasLlenas = categorias.every(cat => contarPrendasPorCategoria(cat) >= LIMITE_PRENDAS_INVITADO);

        const btnAddSidebar = document.querySelector('.inventory-sidebar .btn_add-item');
        const btnAddEmpty = document.querySelector('.no-items-message .btn-add-item');

        if (btnAddSidebar) {
            btnAddSidebar.classList.toggle('disabled-limit', todasLlenas);
            btnAddSidebar.title = todasLlenas
                ? 'Límite de prueba alcanzado (3/3 en todas las categorías). Regístrate para espacio ilimitado.'
                : 'Añadir Item';
        }
        if (btnAddEmpty) {
            btnAddEmpty.classList.toggle('disabled-limit', todasLlenas);
        }

        const selectCat = document.getElementById('item-category');
        if (selectCat) {
            Array.from(selectCat.options).forEach(opt => {
                if (!opt.value) return;
                const cantidad = contarPrendasPorCategoria(opt.value);
                const nombreBase = opt.value.charAt(0).toUpperCase() + opt.value.slice(1);

                const esCategoriaDeEdicion = idPrendaEditando &&
                    todasLasPrendas.find(p => p._id === idPrendaEditando)?.categoria === opt.value;

                if (cantidad >= LIMITE_PRENDAS_INVITADO && !esCategoriaDeEdicion) {
                    opt.disabled = true;
                    opt.textContent = `${nombreBase} (${cantidad}/${LIMITE_PRENDAS_INVITADO} - Lleno)`;
                } else {
                    opt.disabled = false;
                    opt.textContent = `${nombreBase} (${cantidad}/${LIMITE_PRENDAS_INVITADO})`;
                }
            });
        }

        return todasLlenas;
    }

    // ==========================================
    // 1. DATOS DE USUARIO Y AJUSTES DE PERFIL
    // ==========================================
    function cargarDatosUsuarioEnUI() {
        const saludo = document.querySelector('.menu-user-info span');
        const footerTag = document.getElementById('welcome-user-tag');

        if (rolActual === 'guest') {
            if (saludo) saludo.innerHTML = `<span class="guest-badge">MODO INVITADO (Máx. 3 por categoría)</span>`;
            if (footerTag) footerTag.textContent = `Rol: Invitado (Los datos se borran al cerrar o recargar)`;
            return;
        }

        if (saludo) saludo.textContent = `Hola, ¡${usuarioActual.username}!`;
        if (footerTag) footerTag.textContent = `Usuario: ${usuarioActual.username} (${usuarioActual.email})`;

        const inputUser = document.getElementById('username');
        const inputEmail = document.getElementById('email');
        const inputPass = document.getElementById('password');
        if (inputUser) inputUser.value = usuarioActual.username || '';
        if (inputEmail) inputEmail.value = usuarioActual.email || '';
        if (inputPass) {
            inputPass.value = '';
            inputPass.required = false;
            inputPass.placeholder = 'Dejar en blanco para mantener la actual';
        }
    }

    function configurarFormularioPerfil() {
        if (rolActual === 'guest') return;

        const formPerfil = document.getElementById('profile-settings-form');
        const btnEliminarPerfil = document.getElementById('btn-delete-profile') || document.querySelector('.btn-delete');

        if (formPerfil) {
            formPerfil.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                try {
                    const res = await fetch(`${AUTH_URL}/profile/${usuarioActual._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password })
                    });
                    const data = await res.json();
                    showNotification(data.message, data.success ? 'success' : 'error');

                    if (data.success && data.user) {
                        usuarioActual = data.user;
                        localStorage.setItem('user', JSON.stringify(usuarioActual));
                        cargarDatosUsuarioEnUI();
                    }
                } catch (error) {
                    showNotification('Error al actualizar perfil', 'error');
                }
            });
        }

        if (btnEliminarPerfil) {
            btnEliminarPerfil.addEventListener('click', async (e) => {
                e.preventDefault();
                // MODAL PERSONALIZADO: Confirmar eliminación de cuenta
                const confirmado = await mostrarConfirmacionY2K({
                    titulo: '¿Eliminar tu cuenta?',
                    texto: 'Se borrarán todas tus prendas y outfits favoritos permanentemente. Esta acción no se puede deshacer.',
                    icono: '🚨',
                    textoConfirmar: 'Sí, borrar todo',
                    textoCancelar: 'Cancelar'
                });
                if (!confirmado) return;

                try {
                    const res = await fetch(`${AUTH_URL}/profile/${usuarioActual._id}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    showNotification(data.message, data.success ? 'success' : 'error');

                    if (data.success) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setTimeout(() => window.location.href = '/index.html', 1500);
                    }
                } catch (error) {
                    showNotification('Error al eliminar perfil', 'error');
                }
            });
        }
    }

    // ==========================================
    // 2. GESTIÓN DE VISTAS
    // ==========================================
    function ocultarTodasLasVistas() {
        Object.values(vistas).forEach(v => { if (v) v.style.display = 'none'; });
    }

    function mostrarVista(nombreVista) {
        if (rolActual === 'guest' && ['prendas', 'favoritos', 'configuracion'].includes(nombreVista)) {
            showNotification('Regístrate para desbloquear esta sección 🔒', 'error');
            return;
        }

        vistaActual = nombreVista;
        ocultarTodasLasVistas();

        if (nombreVista === 'armario') {
            vistas.armario.style.display = displayOriginalArmario;
            sincronizarClasesSidebar();
        } else if (vistas[nombreVista]) {
            vistas[nombreVista].style.display = 'block';
        }

        const titulosOS = {
            armario: rolActual === 'guest' ? 'Guardaroba_OS - [Modo_Invitado.exe]' : 'Guardaroba_OS - [Mi_Armario.exe]',
            addItem: 'Guardaroba_OS - [Añadir_Prenda.exe]',
            prendas: 'Guardaroba_OS - [Mis_Prendas.exe]',
            favoritos: 'Guardaroba_OS - [Favoritos.exe]',
            configuracion: 'Guardaroba_OS - [Configuracion.exe]'
        };
        const titleEl = document.querySelector('.window-title');
        if (titleEl && titulosOS[nombreVista]) titleEl.textContent = titulosOS[nombreVista];

        document.querySelectorAll('.window-menu-bar .menu-link').forEach(link => {
            const texto = link.textContent.trim().toLowerCase();
            const activo =
                (nombreVista === 'armario' && texto.includes('armario')) ||
                (nombreVista === 'prendas' && texto.includes('prendas')) ||
                (nombreVista === 'favoritos' && texto.includes('favoritos')) ||
                (nombreVista === 'configuracion' && texto.includes('configuración'));
            link.classList.toggle('active', activo);
        });

        if (nombreVista === 'prendas') {
            sincronizarClasesSidebar();
            renderizarGridPrendas();
        }
        if (nombreVista === 'favoritos') cargarFavoritos();
        if (nombreVista === 'configuracion') cargarDatosUsuarioEnUI();
    }

    function configurarNavegacionMenu() {
        document.querySelectorAll('.window-menu-bar .menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const texto = link.textContent.trim().toLowerCase();
                if (texto.includes('armario')) mostrarVista('armario');
                else if (texto.includes('prendas')) mostrarVista('prendas');
                else if (texto.includes('favoritos')) mostrarVista('favoritos');
                else if (texto.includes('configuración')) mostrarVista('configuracion');
            });
        });

        document.querySelector('.no-items-message .btn-add-item')?.addEventListener('click', (e) => {
            e.preventDefault();
            abrirFormularioNuevaPrenda();
        });
    }

    // ==========================================
    // 3. CONSULTAS Y FORMULARIO DE PRENDAS
    // ==========================================
    async function cargarPrendas() {
        if (rolActual === 'guest') {
            verificarLimitesInvitado();
            actualizarVistaPrincipal();
            return;
        }

        try {
            const res = await fetch(`${API_URL}?userId=${usuarioActual._id}`);
            const data = await res.json();
            if (data.success) {
                todasLasPrendas = data.prendas;
                actualizarVistaPrincipal();
                if (vistaActual === 'prendas') renderizarGridPrendas();
            }
        } catch (error) {
            console.error('Error al cargar prendas:', error);
        }
    }

    async function eliminarPrendaDB(id) {
        if (rolActual === 'guest') {
            todasLasPrendas = todasLasPrendas.filter(p => p._id !== id);
            verificarLimitesInvitado();
            actualizarVistaPrincipal();
            showNotification('Prenda eliminada (cupo liberado)', 'success');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const data = await res.json();
            showNotification(data.message, data.success ? 'success' : 'error');
            if (data.success) await cargarPrendas();
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }

    function abrirFormularioNuevaPrenda() {
        if (rolActual === 'guest' && verificarLimitesInvitado()) {
            showNotification('Has alcanzado el límite de 3 prendas en todas las categorías. Crea una cuenta para guardar sin límites ✨', 'error');
            return;
        }

        const form = document.getElementById('add-item-form');
        idPrendaEditando = null;
        form.reset();
        form.querySelector('h3').textContent = 'Añadir Item';
        form.querySelector('.btn-submit').textContent = 'Añadir';
        form.querySelector('#imagePreview').classList.add('hidden');
        form.querySelector('#uploadContent').classList.remove('hidden');

        verificarLimitesInvitado();
        mostrarVista('addItem');
    }

    function configurarFormularioPrenda() {
        const form = document.getElementById('add-item-form');
        if (!form) return;

        const imageInput = form.querySelector('#imageInput');
        const imagePreview = form.querySelector('#imagePreview');
        const uploadContent = form.querySelector('#uploadContent');

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.classList.remove('hidden');
                uploadContent.classList.add('hidden');
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = form.querySelector('#item-name').value.trim();
            const categoria = form.querySelector('#item-category').value;
            const color = form.querySelector('#item-color').value.toLowerCase();

            // Flujo en memoria RAM para Rol Invitado
            if (rolActual === 'guest') {
                const esMismaCategoria = idPrendaEditando &&
                    todasLasPrendas.find(p => p._id === idPrendaEditando)?.categoria === categoria;

                if (!esMismaCategoria && contarPrendasPorCategoria(categoria) >= LIMITE_PRENDAS_INVITADO) {
                    showNotification(`Límite de ${LIMITE_PRENDAS_INVITADO} prendas alcanzado en ${categoria}`, 'error');
                    return;
                }

                if (!imageInput.files[0] && !idPrendaEditando) {
                    showNotification('Selecciona una imagen para la prenda', 'error');
                    return;
                }

                if (idPrendaEditando) {
                    const idx = todasLasPrendas.findIndex(p => p._id === idPrendaEditando);
                    if (idx !== -1) {
                        todasLasPrendas[idx] = {
                            ...todasLasPrendas[idx],
                            nombre,
                            categoria,
                            color,
                            imagen: imageInput.files[0] ? URL.createObjectURL(imageInput.files[0]) : todasLasPrendas[idx].imagen
                        };
                    }
                    showNotification('Prenda actualizada en modo invitado', 'success');
                } else {
                    todasLasPrendas.push({
                        _id: 'guest_' + Date.now(),
                        nombre,
                        categoria,
                        color,
                        imagen: URL.createObjectURL(imageInput.files[0]),
                        createdAt: new Date().toISOString()
                    });
                    const restantes = LIMITE_PRENDAS_INVITADO - contarPrendasPorCategoria(categoria);
                    showNotification(`Prenda añadida (${restantes} espacios libres en ${categoria})`, 'success');
                }

                form.reset();
                idPrendaEditando = null;
                verificarLimitesInvitado();
                mostrarVista('armario');
                actualizarVistaPrincipal();
                return;
            }

            // Flujo normal con MongoDB para Usuario Registrado
            const formData = new FormData();
            formData.append('userId', usuarioActual._id);
            formData.append('nombre', nombre);
            formData.append('categoria', categoria);
            formData.append('color', color);

            if (imageInput.files[0]) {
                formData.append('imagen', imageInput.files[0]);
            } else if (!idPrendaEditando) {
                showNotification('Selecciona una imagen para la prenda', 'error');
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
                    mostrarVista('armario');
                    await cargarPrendas();
                }
            } catch (error) {
                showNotification('Error al guardar la prenda', 'error');
            }
        });
    }

    function prepararEdicionPrenda(prenda) {
        const form = document.getElementById('add-item-form');
        idPrendaEditando = prenda._id;

        form.querySelector('h3').textContent = 'Modificar Item';
        form.querySelector('.btn-submit').textContent = 'Guardar Cambios';
        form.querySelector('#item-name').value = prenda.nombre;
        form.querySelector('#item-category').value = prenda.categoria;
        form.querySelector('#item-color').value = prenda.color;

        const imagePreview = form.querySelector('#imagePreview');
        imagePreview.src = prenda.imagen;
        imagePreview.classList.remove('hidden');
        form.querySelector('#uploadContent').classList.add('hidden');

        verificarLimitesInvitado();
        mostrarVista('addItem');
    }

    // ==========================================
    // 4. NUEVA VISTA "PRENDAS" (SOLO USUARIOS)
    // ==========================================
    function renderizarGridPrendas() {
        const contenedor = document.getElementById('prendas-grid-container')
            || vistas.prendas?.querySelector('.outfits-grid')
            || vistas.prendas;
        if (!contenedor) return;

        const filtradas = todasLasPrendas.filter(p => {
            const matchColor = colorFiltroActivo ? p.color === colorFiltroActivo : true;
            const matchCat = categoriasFiltroGrid.size > 0 ? categoriasFiltroGrid.has(p.categoria) : true;
            return matchColor && matchCat;
        });

        if (filtradas.length === 0) {
            contenedor.innerHTML = '<p>No hay prendas que coincidan con los filtros seleccionados 👚</p>';
            return;
        }

        contenedor.innerHTML = '';
        filtradas.forEach(prenda => {
            const card = document.createElement('div');
            card.className = 'outfit-card';

            const fecha = new Date(prenda.createdAt || Date.now()).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short'
            });

            card.innerHTML = `
                <div class="outfit-card-actions">
                    <button class="btn-edit-outfit" title="Editar prenda">✏️</button>
                    <button class="btn-del-outfit" title="Eliminar prenda">🗑️</button>
                </div>
                <div class="outfit-items-preview single-item-preview">
                    <img src="${prenda.imagen}" alt="${prenda.nombre}">
                </div>
                <div class="outfit-card-footer">
                    <span title="${prenda.nombre}">${prenda.nombre}</span>
                    <span>${fecha}</span>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.outfit-card-actions')) return;
                card.classList.toggle('expanded');
            });

            card.querySelector('.btn-edit-outfit').addEventListener('click', (e) => {
                e.stopPropagation();
                prepararEdicionPrenda(prenda);
            });

            // MODAL PERSONALIZADO: Eliminar prenda desde Mis Prendas
            card.querySelector('.btn-del-outfit').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmado = await mostrarConfirmacionY2K({
                    titulo: '¿Eliminar prenda?',
                    texto: `Se borrará "${prenda.nombre}" de tu guardarropa.`,
                    icono: '🗑️',
                    textoConfirmar: 'Sí, eliminar',
                    textoCancelar: 'Conservar'
                });
                if (confirmado) {
                    await eliminarPrendaDB(prenda._id);
                }
            });

            contenedor.appendChild(card);
        });
    }

    // ==========================================
    // 5. ARMARIO PRINCIPAL, CARRUSELES Y PALETA
    // ==========================================
    function actualizarVistaPrincipal() {
        const msgNoItems = document.querySelector('.no-items-message');
        const contenedorCarrusel = document.querySelector('.closet-carrusel');

        if (todasLasPrendas.length === 0) {
            msgNoItems.style.display = 'block';
            contenedorCarrusel.style.display = 'none';
        } else {
            msgNoItems.style.display = 'none';
            contenedorCarrusel.style.display = 'flex';
            vistas.armario.classList.remove('initial-state');
        }

        renderizarPaletaColores();
        Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
    }

    function aplicarFiltrosEnVistaActiva() {
        renderizarPaletaColores();
        Object.keys(mapaCarruseles).forEach(cat => renderizarCarrusel(cat));
        if (vistaActual === 'prendas') renderizarGridPrendas();
    }

    function renderizarPaletaColores() {
        const paleta = document.querySelector('.color-palette-mini.filtro');
        if (!paleta) return;
        paleta.innerHTML = '';

        const coloresUnicos = [...new Set(todasLasPrendas.map(p => p.color))];
        if (coloresUnicos.length > 0) {
            const btnReset = document.createElement('div');
            btnReset.className = 'color-swatch';
            btnReset.textContent = '✖';
            btnReset.title = 'Quitar filtro de color';
            btnReset.style.cssText = 'background:#fff; display:flex; align-items:center; justify-content:center; font-size:11px;';
            btnReset.addEventListener('click', () => {
                colorFiltroActivo = null;
                aplicarFiltrosEnVistaActiva();
            });
            paleta.appendChild(btnReset);
        }

        coloresUnicos.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.background = color;
            if (colorFiltroActivo === color) {
                swatch.style.outline = '2px solid #000';
                swatch.style.transform = 'scale(1.15)';
            }
            swatch.addEventListener('click', () => {
                colorFiltroActivo = (colorFiltroActivo === color) ? null : color;
                aplicarFiltrosEnVistaActiva();
            });
            paleta.appendChild(swatch);
        });
    }

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

        const etiquetaLimite = rolActual === 'guest'
            ? ` (${contarPrendasPorCategoria(categoria)}/${LIMITE_PRENDAS_INVITADO})`
            : '';

        if (prendas.length === 0) {
            slot.innerHTML = `<span class="slot-tag">${categoria.toUpperCase()}${etiquetaLimite}</span><div class="item-card-mini">Sin prendas</div>`;
            return;
        }

        if (indicesCarrusel[categoria] >= prendas.length) indicesCarrusel[categoria] = 0;
        const prenda = prendas[indicesCarrusel[categoria]];

        slot.innerHTML = `
            <span class="slot-tag">${prenda.nombre}${etiquetaLimite}</span>
            <div class="item-card-mini" style="position:relative;">
                <img src="${prenda.imagen}" alt="${prenda.nombre}">
                <div style="position:absolute; top:2px; right:2px; display:flex; gap:4px;">
                    <button class="btn-edit-item" title="Editar">✏️</button>
                    <button class="btn-del-item" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;

        slot.querySelector('.btn-edit-item').addEventListener('click', () => prepararEdicionPrenda(prenda));

        // MODAL PERSONALIZADO: Eliminar prenda desde Mi Armario
        slot.querySelector('.btn-del-item').addEventListener('click', async () => {
            const confirmado = await mostrarConfirmacionY2K({
                titulo: '¿Eliminar prenda?',
                texto: `Se borrará "${prenda.nombre}" de tu guardarropa.`,
                icono: '🗑️',
                textoConfirmar: 'Sí, eliminar',
                textoCancelar: 'Conservar'
            });
            if (confirmado) eliminarPrendaDB(prenda._id);
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

    // ==========================================
    // 6. SIDEBAR DERECHO
    // ==========================================
    function sincronizarClasesSidebar() {
        document.querySelectorAll('.inventory-sidebar .inv-item').forEach(item => {
            const texto = item.textContent.toLowerCase();
            let cat = null;
            if (texto.includes('superiores')) cat = 'superiores';
            else if (texto.includes('inferiores')) cat = 'inferiores';
            else if (texto.includes('calzado')) cat = 'calzado';
            else if (texto.includes('accesorios')) cat = 'accesorios';

            if (!cat) return;

            if (vistaActual === 'prendas') {
                const inactivo = categoriasFiltroGrid.size > 0 && !categoriasFiltroGrid.has(cat);
                item.classList.toggle('inactive-category', inactivo);
            } else {
                const carrusel = document.querySelector(mapaCarruseles[cat]);
                item.classList.toggle('inactive-category', carrusel.style.display === 'none');
            }
        });
    }

    function configurarSidebarDerecho() {
        document.querySelectorAll('.inventory-sidebar .inv-item').forEach(item => {
            const texto = item.textContent.toLowerCase();

            if (item.classList.contains('btn_add-item')) {
                item.addEventListener('click', () => {
                    vistas.addItem.style.display === 'block' ? mostrarVista('armario') : abrirFormularioNuevaPrenda();
                });
                return;
            }

            if (item.classList.contains('special')) {
                item.addEventListener('click', ejecutarAutoDress);
                return;
            }

            let cat = null;
            if (texto.includes('superiores')) cat = 'superiores';
            else if (texto.includes('inferiores')) cat = 'inferiores';
            else if (texto.includes('calzado')) cat = 'calzado';
            else if (texto.includes('accesorios')) cat = 'accesorios';

            if (cat) {
                item.addEventListener('click', () => {
                    if (vistaActual === 'prendas') {
                        if (categoriasFiltroGrid.has(cat)) {
                            categoriasFiltroGrid.delete(cat);
                        } else {
                            categoriasFiltroGrid.add(cat);
                        }
                        sincronizarClasesSidebar();
                        renderizarGridPrendas();
                    } else {
                        mostrarVista('armario');
                        const carrusel = document.querySelector(mapaCarruseles[cat]);
                        const oculto = carrusel.style.display === 'none';
                        carrusel.style.display = oculto ? 'flex' : 'none';
                        sincronizarClasesSidebar();
                    }
                });
            }
        });
    }

    // ==========================================
    // 7. AUTO DRESS Y FAVORITOS
    // ==========================================
    function obtenerIdsActivosEnCarrusel() {
        const ids = [];
        Object.entries(mapaCarruseles).forEach(([cat, selector]) => {
            const carrusel = document.querySelector(selector);
            const visible = carrusel.style.display !== 'none';
            const prendas = obtenerFiltradas(cat);
            if (visible && prendas.length > 0) {
                ids.push(prendas[indicesCarrusel[cat]]._id);
            }
        });
        return ids;
    }

    function ejecutarAutoDress() {
        mostrarVista('armario');
        colorFiltroActivo = null;
        renderizarPaletaColores();

        Object.entries(mapaCarruseles).forEach(([cat, selector]) => {
            const carrusel = document.querySelector(selector);
            if (carrusel.style.display !== 'none') {
                const prendas = obtenerFiltradas(cat);
                if (prendas.length) {
                    indicesCarrusel[cat] = Math.floor(Math.random() * prendas.length);
                }
            }
            renderizarCarrusel(cat);
        });
        showNotification('¡Combinación aleatoria generada! ✨', 'success');
    }

    function configurarBotonesOutfit() {
        const btnAutoDressVCR = document.querySelector('.vcr-btn.active-play');
        if (btnAutoDressVCR) {
            btnAutoDressVCR.addEventListener('click', ejecutarAutoDress);
        }

        const btnFav = document.getElementById('like-outfit-btn');
        if (btnFav) {
            btnFav.addEventListener('click', async () => {
                if (rolActual === 'guest') {
                    showNotification('Función exclusiva para usuarios registrados. ¡Crea tu cuenta gratis! 💖', 'error');
                    return;
                }

                const idsSeleccionados = obtenerIdsActivosEnCarrusel();
                if (idsSeleccionados.length < 2) {
                    showNotification('Debes tener al menos 2 categorías visibles con prendas para guardar en Favoritos', 'error');
                    return;
                }

                // MODAL PERSONALIZADO: Pedir nombre o etiqueta del outfit (RF08)
                const nombreIngresado = await mostrarPromptY2K({
                    titulo: idOutfitEditando ? 'Actualizar Outfit' : 'Guardar en Favoritos',
                    texto: 'Asigna un nombre o etiqueta a esta combinación:',
                    placeholder: 'Ej. Casual Otoño, Fiesta, Oficina...',
                    icono: '💖',
                    textoConfirmar: 'Guardar Outfit',
                    textoCancelar: 'Cancelar'
                });
                if (nombreIngresado === null) return;

                const nombreOutfit = nombreIngresado.trim() || `Outfit (${idsSeleccionados.length} prendas)`;

                try {
                    const url = idOutfitEditando ? `${API_URL}/outfits/${idOutfitEditando}` : `${API_URL}/outfits`;
                    const method = idOutfitEditando ? 'PUT' : 'POST';

                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: usuarioActual._id,
                            nombre: nombreOutfit,
                            items: idsSeleccionados,
                            tipo: 'favorito'
                        })
                    });
                    const data = await res.json();
                    showNotification(data.message, data.success ? 'success' : 'error');

                    if (data.success) {
                        idOutfitEditando = null;
                        btnFav.textContent = '💖';
                        btnFav.style.background = '#f8bbd0';
                        setTimeout(() => {
                            btnFav.textContent = '🤍';
                            btnFav.style.background = '#e0e0e0';
                        }, 1500);
                    }
                } catch (error) {
                    showNotification('Error al guardar en Favoritos', 'error');
                }
            });
        }
    }

    async function cargarFavoritos() {
        if (rolActual === 'guest') return;

        const contenedor = document.getElementById('favorite-outfits-container') || vistas.favoritos;
        try {
            const res = await fetch(`${API_URL}/outfits?userId=${usuarioActual._id}&tipo=favorito`);
            const data = await res.json();

            if (!data.success || !data.outfits.length) {
                contenedor.innerHTML = '<p>Aún no tienes outfits favoritos 💖</p>';
                return;
            }

            contenedor.innerHTML = '';
            data.outfits.forEach(outfit => {
                const card = document.createElement('div');
                card.className = 'outfit-card';
                const fecha = new Date(outfit.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

                card.innerHTML = `
                    <div class="outfit-card-actions">
                        <button class="btn-edit-outfit" title="Editar outfit">✏️</button>
                        <button class="btn-del-outfit" title="Eliminar outfit">🗑️</button>
                    </div>
                    <div class="outfit-items-preview">
                        ${outfit.items.map(item => `<img src="${item.imagen}" alt="${item.nombre}" title="${item.nombre}">`).join('')}
                    </div>
                    <div class="outfit-card-footer">
                        <span title="${outfit.nombre || ''}">${outfit.nombre || `${outfit.items.length} prendas`}</span>
                        <span>${fecha}</span>
                    </div>
                `;

                card.addEventListener('click', (e) => {
                    if (e.target.closest('.outfit-card-actions')) return;
                    card.classList.toggle('expanded');
                });

                card.querySelector('.btn-edit-outfit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    idOutfitEditando = outfit._id;
                    colorFiltroActivo = null;

                    Object.values(mapaCarruseles).forEach(selector => {
                        document.querySelector(selector).style.display = 'none';
                    });

                    outfit.items.forEach(itemOutfit => {
                        const listaCat = obtenerFiltradas(itemOutfit.categoria);
                        const idx = listaCat.findIndex(p => p._id === itemOutfit._id);
                        if (idx !== -1) {
                            indicesCarrusel[itemOutfit.categoria] = idx;
                            document.querySelector(mapaCarruseles[itemOutfit.categoria]).style.display = 'flex';
                        }
                    });

                    actualizarVistaPrincipal();
                    mostrarVista('armario');
                    showNotification('Modo edición: ajusta las prendas y pulsa 🤍 para guardar cambios', 'success');
                });

                // MODAL PERSONALIZADO: Eliminar outfit de Favoritos
                card.querySelector('.btn-del-outfit').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmado = await mostrarConfirmacionY2K({
                        titulo: '¿Quitar de Favoritos?',
                        texto: `Se eliminará "${outfit.nombre || 'este outfit'}" de tus favoritos.`,
                        icono: '💔',
                        textoConfirmar: 'Sí, quitar',
                        textoCancelar: 'Cancelar'
                    });
                    if (!confirmado) return;

                    const resDel = await fetch(`${API_URL}/outfits/${outfit._id}`, { method: 'DELETE' });
                    const dataDel = await resDel.json();
                    showNotification(dataDel.message, dataDel.success ? 'success' : 'error');
                    if (dataDel.success) cargarFavoritos();
                });

                contenedor.appendChild(card);
            });
        } catch (error) {
            console.error('Error al cargar favoritos:', error);
        }
    }

    // ==========================================
    // 8. LOGOUT, MODALES Y NOTIFICACIONES
    // ==========================================
    function configurarLogout() {
        const logoutAction = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('guestMode');
            todasLasPrendas = [];
            window.location.href = '/index.html';
        };
        document.getElementById('logout-btn')?.addEventListener('click', logoutAction);
        document.getElementById('logout-btn-footer')?.addEventListener('click', logoutAction);
    }

    function mostrarConfirmacionY2K({
        titulo = '¿Estás segura?',
        texto = '',
        icono = '⚠️',
        textoConfirmar = 'Sí, eliminar',
        textoCancelar = 'Cancelar',
        peligro = true
    }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'y2k-swal-overlay';

            overlay.innerHTML = `
                <div class="y2k-swal-box">
                    <span class="y2k-swal-icon">${icono}</span>
                    <h4 class="y2k-swal-title">${titulo}</h4>
                    <p class="y2k-swal-text">${texto}</p>
                    <div class="y2k-swal-actions">
                        <button type="button" class="y2k-swal-btn cancel">${textoCancelar}</button>
                        <button type="button" class="y2k-swal-btn confirm ${peligro ? 'danger' : ''}">${textoConfirmar}</button>
                    </div>
                </div>
            `;

            const cerrar = (resultado) => {
                overlay.remove();
                resolve(resultado);
            };

            overlay.querySelector('.cancel').addEventListener('click', () => cerrar(false));
            overlay.querySelector('.confirm').addEventListener('click', () => cerrar(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cerrar(false);
            });

            document.body.appendChild(overlay);
        });
    }

    function mostrarPromptY2K({
        titulo = 'Guardar Outfit',
        texto = 'Escribe un nombre o etiqueta para este outfit:',
        placeholder = 'Ej. Casual Otoño, Oficina...',
        valorInicial = '',
        icono = '💖',
        textoConfirmar = 'Guardar',
        textoCancelar = 'Cancelar'
    }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'y2k-swal-overlay';

            overlay.innerHTML = `
                <div class="y2k-swal-box">
                    <span class="y2k-swal-icon">${icono}</span>
                    <h4 class="y2k-swal-title">${titulo}</h4>
                    <p class="y2k-swal-text">${texto}</p>
                    <input type="text" class="y2k-swal-input" placeholder="${placeholder}" value="${valorInicial}">
                    <div class="y2k-swal-actions">
                        <button type="button" class="y2k-swal-btn cancel">${textoCancelar}</button>
                        <button type="button" class="y2k-swal-btn confirm">${textoConfirmar}</button>
                    </div>
                </div>
            `;

            const input = overlay.querySelector('.y2k-swal-input');
            const cerrar = (valor) => {
                overlay.remove();
                resolve(valor);
            };

            overlay.querySelector('.cancel').addEventListener('click', () => cerrar(null));
            overlay.querySelector('.confirm').addEventListener('click', () => cerrar(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') cerrar(input.value);
                if (e.key === 'Escape') cerrar(null);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cerrar(null);
            });

            document.body.appendChild(overlay);
            input.focus();
        });
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