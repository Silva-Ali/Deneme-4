        const firebaseConfig = {
            apiKey: "AIzaSyASCeVzpEOhDCHyWTeza7Rnbm4U8EUc5QE",
            authDomain: "stokdepo-52630.firebaseapp.com",
            databaseURL: "https://stokdepo-52630-default-rtdb.firebaseio.com",
            projectId: "stokdepo-52630",
            storageBucket: "stokdepo-52630.firebasestorage.app",
            messagingSenderId: "698156957113",
            appId: "1:698156957113:web:632e25ada3a3bfdc9e0a68",
            measurementId: "G-45QFTCYQJF"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();
        const productsRef = db.ref('products');
        const logsRef = db.ref('logs');

        document.addEventListener('DOMContentLoaded', async () => {
            // Element References
            const navButtons = document.querySelectorAll('.nav-btn');
            const pages = document.querySelectorAll('.page-content');
            const addProductForm = document.getElementById('add-product-form');
            const formTitle = document.getElementById('form-title');
            const submitBtn = document.getElementById('submit-btn');
            const cancelEditBtn = document.getElementById('cancel-edit-btn');
            const editProductIdInput = document.getElementById('edit-product-id');
            const productNameInput = document.getElementById('product-name');
            const productPriceInput = document.getElementById('product-price');
            const priceCurrencySelect = document.getElementById('price-currency');
            const productQuantityInput = document.getElementById('product-quantity');
            const criticalStockLevelInput = document.getElementById('critical-stock-level');
            const productStatusSelect = document.getElementById('product-status');
            const productListDiv = document.getElementById('product-list');
            const logListDiv = document.getElementById('log-list');
            const toastContainer = document.getElementById('toast-container');
            const searchBox = document.getElementById('search-box');
            const filterButtonsContainer = document.querySelector('.filter-buttons');
            const exportCsvBtn = document.getElementById('export-csv-btn');
            const sortBySelect = document.getElementById('sort-by');
            const deleteModal = document.getElementById('delete-modal');
            const modalCancelBtn = document.getElementById('modal-cancel-btn');
            const modalConfirmBtn = document.getElementById('modal-confirm-btn');
            const productSkuInput = document.getElementById('product-sku');
            const productDateInput = document.getElementById('product-date');
            const pieChartCanvas = document.getElementById('pieChart');
            const lineChartCanvas = document.getElementById('lineChart');
            
            // State Variables
            let allProducts = [];
            let allLogs = [];
            let searchTerm = '';
            let activeFilter = 'Tümü';
            let activeSort = 'createdAt_desc';
            let usdToTryRate = 35.0; // Fallback
            let productToDeleteId = null;
            let pieChartInstance = null;
            let lineChartInstance = null;

            // Set default date to today
            productDateInput.value = new Date().toISOString().split('T')[0];

            const switchToPage = (pageId) => {
                pages.forEach(page => page.classList.toggle('hidden', page.id !== pageId));
                navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));
            };

            navButtons.forEach(btn => {
                btn.addEventListener('click', () => switchToPage(btn.dataset.page));
            });


            const showToast = (message, type = 'success') => {
                const toast = document.createElement('div');
                toast.className = `toast toast-${type}`;
                const icons = { success: '✅', info: '🗑️', warning: '✏️', rate: 'ℹ️' };
                toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
                toastContainer.appendChild(toast);
                setTimeout(() => toast.classList.add('show'), 10);
                setTimeout(() => {
                    toast.classList.remove('show');
                    toast.addEventListener('transitionend', () => toast.remove());
                }, 4000);
            };

            const formatCurrency = (amount, currency = 'TRY') => {
                const options = { style: 'currency', currency: currency, maximumFractionDigits: 2 };
                if (amount % 1 === 0) {
                    options.minimumFractionDigits = 0;
                    options.maximumFractionDigits = 0;
                }
                return new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', options).format(amount);
            };

            const fetchAndUpdateRate = async () => {
                try {
                    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                    if (!response.ok) throw new Error('Network response failed.');
                    const data = await response.json();
                    if (data && data.rates && data.rates.TRY) {
                        usdToTryRate = data.rates.TRY;
                        showToast(`Güncel kur: 1 USD = ${usdToTryRate.toFixed(2)} TL`, 'rate');
                    }
                } catch (error) {
                    console.error("Could not fetch exchange rate, using fallback.", error);
                    showToast(`Kur alınamadı, yaklaşık değer kullanılıyor.`, 'info');
                }
            };

            const logAction = (action, details) => {
                const logEntry = {
                    action,
                    details,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                logsRef.push(logEntry);
            };

            const updateSummary = () => {
                const activeProducts = allProducts.filter(p => p.status !== 'Satıldı');
                const soldProducts = allProducts.filter(p => p.status === 'Satıldı');

                const totalOrders = allProducts.length;
                const totalStock = activeProducts.reduce((sum, p) => sum + p.quantity, 0);
                const inStock = activeProducts.filter(p => p.status === 'Stokta').reduce((sum, p) => sum + p.quantity, 0);
                const onShip = activeProducts.filter(p => p.status === 'Gemide').reduce((sum, p) => sum + p.quantity, 0);
                const onPlane = activeProducts.filter(p => p.status === 'Uçakta').reduce((sum, p) => sum + p.quantity, 0);
                const criticalStockCount = allProducts.filter(p => p.status === 'Stokta' && p.criticalStock && p.quantity < p.criticalStock).length;
                const totalValueTL = activeProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
                const totalValueUSD = totalValueTL / usdToTryRate;
                const totalSold = soldProducts.reduce((sum, p) => sum + p.quantity, 0);

                document.querySelector('#total-orders .main-value').textContent = totalOrders;
                document.querySelector('#total-stock .main-value').textContent = totalStock;
                document.querySelector('#in-stock .main-value').textContent = inStock;
                document.querySelector('#on-ship .main-value').textContent = onShip;
                document.querySelector('#on-plane .main-value').textContent = onPlane;
                document.querySelector('#sold .main-value').textContent = totalSold;
                document.querySelector('#critical-stock .main-value').textContent = criticalStockCount;
                document.querySelector('#total-value-tl').textContent = formatCurrency(totalValueTL, 'TRY');
                document.querySelector('#total-value-usd').textContent = formatCurrency(totalValueUSD, 'USD');
            };
            
            const renderPieChart = () => {
                const statusCounts = allProducts.reduce((acc, product) => {
                    if (product && product.status) {
                        acc[product.status] = (acc[product.status] || 0) + product.quantity;
                    }
                    return acc;
                }, {});

                const labels = Object.keys(statusCounts);
                const data = Object.values(statusCounts);
                const colors = labels.map(label => {
                    if (label === 'Stokta') return getComputedStyle(document.documentElement).getPropertyValue('--secondary-color');
                    if (label === 'Satıldı') return getComputedStyle(document.documentElement).getPropertyValue('--sold-color');
                    if (label === 'Gemide') return getComputedStyle(document.documentElement).getPropertyValue('--ship-color');
                    if (label === 'Uçakta') return getComputedStyle(document.documentElement).getPropertyValue('--info-color');
                    return '#ccc';
                });

                if(pieChartInstance) {
                    pieChartInstance.data.labels = labels;
                    pieChartInstance.data.datasets[0].data = data;
                    pieChartInstance.data.datasets[0].backgroundColor = colors;
                    pieChartInstance.update();
                } else {
                    pieChartInstance = new Chart(pieChartCanvas, {
                        type: 'doughnut', data: { labels, datasets: [{ label: 'Ürün Adedi', data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
                    });
                }
            };

            const renderLineChart = () => {
                const monthlyData = allProducts.reduce((acc, product) => {
                    if (product && product.date) {
                        const month = product.date.substring(0, 7);
                        acc[month] = (acc[month] || 0) + product.quantity;
                    }
                    return acc;
                }, {});
                
                const sortedMonths = Object.keys(monthlyData).sort();
                const labels = sortedMonths.map(month => new Date(month + '-02').toLocaleString('tr-TR', { month: 'long', year: '2-digit' }));
                const data = sortedMonths.map(month => monthlyData[month]);

                if(lineChartInstance) {
                    lineChartInstance.data.labels = labels;
                    lineChartInstance.data.datasets[0].data = data;
                    lineChartInstance.update();
                } else {
                    lineChartInstance = new Chart(lineChartCanvas, {
                        type: 'line',
                        data: { labels, datasets: [{ label: 'Sipariş Edilen Ürün Adedi', data, fill: true, borderColor: 'var(--primary-color)', backgroundColor: 'rgba(52, 152, 219, 0.1)', tension: 0.1 }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });
                }
            };

            const renderProducts = () => {
                let processedProducts = allProducts;
                if (activeFilter !== 'Tümü') {
                    processedProducts = processedProducts.filter(p => p.status === activeFilter);
                }
                if (searchTerm) {
                    processedProducts = processedProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())));
                }
                const [key, direction] = activeSort.split('_');
                processedProducts.sort((a, b) => {
                    let valA = a[key], valB = b[key];
                    if (key === 'name' || key === 'sku') {
                        valA = (valA || '').toLowerCase(); valB = (valB || '').toLowerCase();
                    }
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
                
                productListDiv.innerHTML = '';
                if (processedProducts.length === 0) {
                     productListDiv.innerHTML = `<div class="placeholder-message"><p>Gösterilecek ürün bulunamadı.</p></div>`;
                } else {
                    processedProducts.forEach(product => {
                        const productElement = document.createElement('div');
                        const isLowStock = product.status === 'Stokta' && product.criticalStock && product.quantity < product.criticalStock;
                        productElement.className = `product-item ${isLowStock ? 'low-stock' : ''}`;
                        productElement.dataset.id = product.id;
                        const priceUSD = product.price / usdToTryRate;
                        const displayDate = product.date ? new Date(product.date).toLocaleDateString('tr-TR') : 'Tarih Yok';
                        productElement.innerHTML = `
                            ${isLowStock ? '<div class="low-stock-icon">⚠️</div>' : '<div></div>'}
                            <div class="product-info">
                                <div>
                                    <span class="product-name">${product.name}</span>
                                    ${product.sku ? `<span class="product-sku">${product.sku}</span>` : ''}
                                </div>
                                <div class="product-meta">
                                    <span>${displayDate}</span> &bull;
                                    <span>${product.quantity} Adet</span> &bull;
                                    <span class="price-usd">${formatCurrency(product.price, 'TRY')} / ${formatCurrency(priceUSD, 'USD')}</span>
                                </div>
                            </div>
                            <div class="product-details">
                                <span class="product-status status-${product.status}">${product.status}</span>
                                <div class="product-actions">
                                    <button class="btn btn-action edit-btn" title="Düzenle">✏️</button>
                                    <button class="btn btn-danger-outline delete-btn" title="Sil">🗑️</button>
                                </div>
                            </div>`;
                        productListDiv.appendChild(productElement);
                    });
                }
            };
            
            const renderLogs = () => {
                logListDiv.innerHTML = '';
                if (allLogs.length === 0) {
                    logListDiv.innerHTML = `<div class="placeholder-message"><p>Henüz bir işlem geçmişi yok.</p></div>`;
                } else {
                    allLogs.forEach(log => {
                        const logElement = document.createElement('div');
                        logElement.className = 'log-item';
                        const logDate = new Date(log.timestamp).toLocaleString('tr-TR');
                        const icons = {'Oluşturuldu': '➕', 'Güncellendi': '✏️', 'Silindi': '🗑️'};
                        logElement.innerHTML = `
                            <div class="log-icon">${icons[log.action] || 'ℹ️'}</div>
                            <div class="log-details">
                                <p><span class="log-product-name">${log.details.productName || ''}</span> - ${log.action}</p>
                                <p class="log-change">${log.details.change || ''}</p>
                                <p class="log-timestamp">${logDate}</p>
                            </div>
                        `;
                        logListDiv.appendChild(logElement);
                    });
                }
            };

            const resetForm = () => {
                addProductForm.reset();
                editProductIdInput.value = '';
                priceCurrencySelect.value = 'TRY';
                productDateInput.value = new Date().toISOString().split('T')[0];
                formTitle.textContent = 'Yeni Ürün Ekle';
                submitBtn.querySelector('span').textContent = 'Stoğa Ekle';
                submitBtn.classList.remove('btn-secondary');
                submitBtn.classList.add('btn-primary');
                document.querySelector('#add-product-panel').classList.remove('editing');
                cancelEditBtn.style.display = 'none';
                document.querySelectorAll('.input-field.invalid').forEach(el => el.classList.remove('invalid'));
            };

            const validateForm = () => {
                let isValid = true;
                document.querySelectorAll('.input-field.invalid').forEach(el => el.classList.remove('invalid'));
                if (!productNameInput.value.trim()) {
                    productNameInput.classList.add('invalid'); isValid = false;
                }
                const price = parseFloat(productPriceInput.value);
                if (isNaN(price) || price < 0) {
                    productPriceInput.classList.add('invalid'); isValid = false;
                }
                const quantity = parseInt(productQuantityInput.value);
                if (isNaN(quantity) || quantity <= 0) {
                    productQuantityInput.classList.add('invalid'); isValid = false;
                }
                if (!productDateInput.value) {
                    productDateInput.classList.add('invalid'); isValid = false;
                }
                return isValid;
            };

            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!validateForm()){
                    showToast('Lütfen kırmızı alanları düzeltin.', 'info'); return;
                }
                const price = parseFloat(productPriceInput.value);
                const currency = priceCurrencySelect.value;
                const priceInTry = currency === 'USD' ? price * usdToTryRate : price;
                const criticalStock = parseInt(criticalStockLevelInput.value) || 0;

                const productData = {
                    name: productNameInput.value.trim(),
                    sku: productSkuInput.value.trim(),
                    date: productDateInput.value,
                    price: priceInTry,
                    quantity: parseInt(productQuantityInput.value),
                    status: productStatusSelect.value,
                    criticalStock: criticalStock
                };
                const editId = editProductIdInput.value;

                if (editId) {
                    const oldProduct = allProducts.find(p => p.id === editId);
                    let changes = [];
                    Object.keys(productData).forEach(key => {
                        if (String(productData[key]) !== String(oldProduct[key])) {
                            changes.push(`${key}: "${oldProduct[key] || ''}" -> "${productData[key] || ''}"`);
                        }
                    });

                    if(changes.length > 0){
                        productsRef.child(editId).update(productData).then(() => {
                            logAction('Güncellendi', { productName: productData.name, change: changes.join(', ') });
                            showToast('Ürün başarıyla güncellendi!', 'success'); resetForm(); switchToPage('dashboard-page');
                        });
                    } else {
                         showToast('Değişiklik yapılmadı.', 'warning');
                         resetForm(); 
                         switchToPage('dashboard-page');
                    }
                } else {
                    productData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                    productsRef.push(productData).then((newRef) => {
                         logAction('Oluşturuldu', { productName: productData.name, productId: newRef.key });
                         showToast('Ürün başarıyla kaydedildi!', 'success'); resetForm(); productNameInput.focus(); switchToPage('dashboard-page');
                    });
                }
            });

            productListDiv.addEventListener('click', (e) => {
                const editButton = e.target.closest('.edit-btn');
                if (editButton) {
                    switchToPage('form-page');
                    const productId = editButton.closest('.product-item').dataset.id;
                    const product = allProducts.find(p => p.id === productId);
                    if (product) {
                        editProductIdInput.value = product.id;
                        productNameInput.value = product.name;
                        productSkuInput.value = product.sku || '';
                        productDateInput.value = product.date;
                        productPriceInput.value = product.price.toFixed(2);
                        priceCurrencySelect.value = 'TRY';
                        productQuantityInput.value = product.quantity;
                        criticalStockLevelInput.value = product.criticalStock || '';
                        productStatusSelect.value = product.status;
                        formTitle.textContent = 'Ürünü Düzenle';
                        submitBtn.querySelector('span').textContent = 'Değişiklikleri Kaydet';
                        submitBtn.classList.replace('btn-primary', 'btn-secondary');
                        document.querySelector('#add-product-panel').classList.add('editing');
                        cancelEditBtn.style.display = 'block';
                        productNameInput.focus();
                        showToast(`"${product.name}" düzenleniyor...`, 'warning');
                    }
                }
                const deleteButton = e.target.closest('.delete-btn');
                if(deleteButton){
                    productToDeleteId = deleteButton.closest('.product-item').dataset.id;
                    deleteModal.classList.add('show');
                }
            });

            modalConfirmBtn.addEventListener('click', () => {
                if(productToDeleteId){
                    const productToDelete = allProducts.find(p => p.id === productToDeleteId);
                    productsRef.child(productToDeleteId).remove()
                        .then(() => {
                            logAction('Silindi', { productName: productToDelete.name });
                            showToast('Ürün silindi.', 'info');
                        });
                    deleteModal.classList.remove('show');
                    productToDeleteId = null;
                }
            });

            modalCancelBtn.addEventListener('click', () => deleteModal.classList.remove('show'));
            deleteModal.addEventListener('click', (e) => {
                if(e.target === deleteModal) deleteModal.classList.remove('show');
            });
            
            cancelEditBtn.addEventListener('click', () => {
                resetForm();
                switchToPage('dashboard-page');
            });
            searchBox.addEventListener('input', (e) => { searchTerm = e.target.value; renderProducts(); });
            sortBySelect.addEventListener('change', (e) => { activeSort = e.target.value; renderProducts(); });
            filterButtonsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    filterButtonsContainer.querySelector('.active').classList.remove('active');
                    e.target.classList.add('active');
                    activeFilter = e.target.dataset.filter;
                    renderProducts();
                }
            });

             exportCsvBtn.addEventListener('click', () => {
                if (allProducts.length === 0) {
                    showToast('Dışa aktarılacak ürün yok.', 'info'); return;
                }
                const headers = 'Tarih,Ürün Kodu,Ürün Adı,Birim Fiyat (TL),Birim Fiyat (USD),Adet,Durum,Toplam Değer (TL),Toplam Değer (USD)\n';
                const rows = allProducts.map(p => {
                    const totalTL = p.price * p.quantity;
                    const priceUSD = p.price / usdToTryRate;
                    const totalUSD = totalTL / usdToTryRate;
                    return `${p.date},"${p.sku}","${p.name}",${p.price.toFixed(2)},${priceUSD.toFixed(2)},${p.quantity},${p.status},${totalTL.toFixed(2)},${totalUSD.toFixed(2)}`;
                }).join('\n');
                
                const blob = new Blob([`\uFEFF${headers + rows}`], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'stok-listesi.csv';
                link.click();
                URL.revokeObjectURL(link.href);
                showToast('Stok listesi indiriliyor...', 'success');
            });

            await fetchAndUpdateRate();

            productsRef.on('value', snapshot => {
                const productsData = snapshot.val();
                allProducts = productsData ? Object.keys(productsData).map(key => ({ id: key, ...productsData[key] })) : [];
                updateSummary();
                renderProducts();
                renderPieChart();
                renderLineChart();
            });

            logsRef.orderByChild('timestamp').limitToLast(100).on('value', snapshot => {
                const logsData = snapshot.val();
                allLogs = logsData ? Object.keys(logsData).map(key => ({ id: key, ...logsData[key] })).reverse() : [];
                renderLogs();
            });
        });
    