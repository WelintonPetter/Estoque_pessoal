// Configuração da API do Notion
const NOTION_API_KEY = 'ntn_y79905652872yJFlP3s3RiMwUP5tvvITKJ5Oitdg9nmgne';
// Vamos usar um input para o usuário informar o ID da database
let NOTION_DATABASE_ID = ''; // Removido o ID fixo

// Elementos do DOM
const inventoryBody = document.getElementById('inventoryBody');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const addItemForm = document.getElementById('addItemForm');
const editItemForm = document.getElementById('editItemForm');
const editModal = document.getElementById('editModal');
const closeModalBtn = document.querySelector('.close');
const shelfMapContainer = document.getElementById('shelfMapContainer');

// Funções para o mapa da prateleira
function showShelfMap(localizador) {
    // Limpar seleção anterior
    document.querySelectorAll('.shelf-cell').forEach(cell => {
        cell.classList.remove('selected');
    });

    // Selecionar nova célula
    const cell = document.querySelector(`.shelf-cell[data-position="${localizador.toLowerCase()}"]`);
    if (cell) {
        cell.classList.add('selected');
        shelfMapContainer.style.display = 'block';
    }
}

function closeShelfMap() {
    shelfMapContainer.style.display = 'none';
}

// Adicionar elementos para configuração da database
const configSection = document.createElement('div');
configSection.className = 'config-section';
configSection.innerHTML = `
    <h2>Configuração da Database</h2>
    <div class="form-group">
        <label for="databaseId">ID da Database do Notion:</label>
        <input type="text" id="databaseId" placeholder="Cole o ID da sua database aqui">
        <button id="quickAccessBtn" class="btn">Estoque Pessoal</button>
        <button id="saveConfig" class="btn">Salvar e Conectar</button>
    </div>
    <p class="help-text">O ID da database pode ser encontrado na URL da sua página do Notion.</p>
`;

// Inserir a seção de configuração antes do formulário de adição
document.querySelector('.form-container').insertAdjacentElement('beforebegin', configSection);

// Event listener para salvar a configuração
document.getElementById('saveConfig').addEventListener('click', async () => {
    const databaseId = document.getElementById('databaseId').value.trim();
    
    if (!databaseId) {
        showError('Por favor, informe o ID da database.');
        return;
    }
    
    // Salvar o ID no localStorage para uso futuro
    localStorage.setItem('notionDatabaseId', databaseId);
    NOTION_DATABASE_ID = databaseId;
    
    // Tentar buscar os itens com o novo ID
    try {
        await fetchInventoryItems();
        // Se der certo, esconder a seção de configuração
        configSection.style.display = 'none';
    } catch (error) {
        console.error('Erro ao conectar com a database:', error);
        showError('Erro ao conectar com a database. Verifique o ID e tente novamente.');
    }
});

// Variáveis globais
let inventoryItems = [];
let stockChart = null;

// Função para atualizar o dashboard
function updateDashboard() {
    updateStockChart();
}

// Função para atualizar o gráfico
function updateStockChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    const categories = ['eletronicos', 'alimentos', 'vestuario', 'outros'];
    const data = categories.map(category => {
        return inventoryItems.filter(item => item.category === category).length;
    });

    if (stockChart) {
        stockChart.destroy();
    }

    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Eletrônicos', 'Alimentos', 'Vestuário', 'Outros'],
            datasets: [{
                label: 'Itens por Categoria',
                data: data,
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Função para filtrar e buscar itens
function filterItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;

    const filteredItems = inventoryItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesStock = !stockFilter || (
            stockFilter === 'low' && item.quantity < 10 ||
            stockFilter === 'normal' && item.quantity >= 10 && item.quantity < 50 ||
            stockFilter === 'high' && item.quantity >= 50
        );

        return matchesSearch && matchesCategory && matchesStock;
    });

    displayInventoryItems(filteredItems);
}

// Adicionar event listeners para busca e filtros
document.getElementById('searchInput').addEventListener('input', filterItems);
document.getElementById('categoryFilter').addEventListener('change', filterItems);
document.getElementById('stockFilter').addEventListener('change', filterItems);

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se já temos um ID salvo
        const savedId = localStorage.getItem('notionDatabaseId');
        // Adicione esta função após fetchInventoryItems
        async function getNotionDatabaseSchema() {
            try {
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                const notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`;
                
                const response = await fetch(proxyUrl + notionUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json',
                        'Origin': window.location.origin
                    }
                });
        
                if (!response.ok) {
                    throw new Error(`Erro ao obter schema: ${response.status}`);
                }
        
                const data = await response.json();
                console.log('Schema da database:', data);
                console.log('Propriedades disponíveis:', data.properties);
                
                // Retorna os nomes exatos das propriedades
                return Object.keys(data.properties);
            } catch (error) {
                console.error('Erro ao obter schema:', error);
                return null;
            }
        }
        
        // Chame esta função no início para debug
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                // Código existente...
                
                // Adicione esta linha após definir NOTION_DATABASE_ID
                if (savedId) {
                    NOTION_DATABASE_ID = savedId;
                    document.getElementById('databaseId').value = savedId;
                    
                    // Obter o schema para debug
                    const propertyNames = await getNotionDatabaseSchema();
                    console.log('Nomes exatos das propriedades:', propertyNames);
                    
                    // Tentar buscar os itens com o ID salvo
                    await fetchInventoryItems();
                    // Se der certo, esconder a seção de configuração
                    configSection.style.display = 'none';
                }
            } catch (error) {
                // Código existente...
            }
        });
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar a aplicação: ' + error.message);
        // Mostrar a seção de configuração em caso de erro
        configSection.style.display = 'block';
    }
});

// Buscar itens do inventário
async function fetchInventoryItems() {
    try {
        // Verificar se temos o ID da database
        if (!NOTION_DATABASE_ID) {
            showError('Por favor, configure o ID da database para começar.');
            return;
        }
        
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        
        // Verificar se o usuário tem acesso ao CORS Anywhere
        const corsCheckUrl = 'https://cors-anywhere.herokuapp.com/';
        try {
            const corsCheck = await fetch(corsCheckUrl, {
                method: 'GET'
            });
            
            if (!corsCheck.ok) {
                showError('Você precisa solicitar acesso temporário ao CORS Anywhere. Visite https://cors-anywhere.herokuapp.com/corsdemo e clique no botão para solicitar acesso.');
                return;
            }
        } catch (corsError) {
            console.error('Erro ao verificar acesso ao CORS Anywhere:', corsError);
            showError('Não foi possível acessar o proxy CORS. Visite https://cors-anywhere.herokuapp.com/corsdemo e solicite acesso temporário.');
            return;
        }
        
        // Usar um serviço de proxy CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
        
        console.log('Tentando acessar a database com ID:', NOTION_DATABASE_ID);
        
        const response = await fetch(proxyUrl + notionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-02-22',
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Notion API Error Details:', errorData);
            
            // Mensagem de erro mais detalhada
            let errorMsg = `Erro na API do Notion: ${response.status}`;
            if (errorData.message) {
                errorMsg += ` - ${errorData.message}`;
            }
            
            if (response.status === 403) {
                errorMsg += '. Verifique se você compartilhou a database com sua integração no Notion.';
            } else if (response.status === 404) {
                errorMsg += '. Database não encontrada. Verifique o ID da database.';
            }
            
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data); // Log para debug
        
        // In the fetchInventoryItems function, update the item mapping
        inventoryItems = data.results.map(item => {
            console.log('Propriedades do item:', item.properties); // Log para debug
            
            // Extrair o ID com tratamento de erro melhorado
            let itemId = 0;
            try {
                itemId = item.properties.ID?.number || 
                         item.properties.id?.number || 
                         item.properties.Id?.number || 0;
            } catch (e) {
                console.error('Erro ao extrair ID:', e);
            }
            
            // Extrair o nome com tratamento de erro melhorado
            let name = 'Sem nome';
            try {
                name = item.properties['Nome do Item']?.title[0]?.text?.content || 
                       item.properties['Nome do item']?.title[0]?.text?.content || 
                       item.properties['nome do item']?.title[0]?.text?.content || 
                       item.properties['Nome']?.title[0]?.text?.content || 'Sem nome';
            } catch (e) {
                console.error('Erro ao extrair nome:', e);
            }
            
            // Extrair a quantidade com tratamento de erro melhorado
            let quantity = 0;
            try {
                quantity = item.properties.Quantidade?.number || 
                           item.properties.quantidade?.number || 
                           item.properties.Quantity?.number || 0;
            } catch (e) {
                console.error('Erro ao extrair quantidade:', e);
            }
            
            // Extrair o localizador
            let localizador = '';
            try {
                localizador = item.properties.Localizador?.select?.name || '';
            } catch (e) {
                console.error('Erro ao extrair localizador:', e);
            }

            // Extrair a categoria
            let categoria = '';
            try {
                categoria = item.properties.Categoria?.select?.name || 
                           item.properties.categoria?.select?.name || 
                           item.properties.Category?.select?.name || '';
            } catch (e) {
                console.error('Erro ao extrair categoria:', e);
            }
            
            return {
                id: item.id,
                itemId: itemId,
                name: name,
                quantity: quantity,
                localizador: localizador,
                category: categoria
            };
        });

        console.log('Itens processados:', inventoryItems); // Log para debug
        renderInventoryItems();
    } catch (error) {
        console.error('Erro ao buscar itens:', error);
        showError('Erro ao buscar itens do estoque: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Renderizar itens na tabela
function renderInventoryItems() {
    inventoryBody.innerHTML = '';
    
    if (inventoryItems.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" style="text-align: center;">Nenhum item encontrado</td>';
        inventoryBody.appendChild(emptyRow);
        return;
    }
    
    inventoryItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>
                <span style="cursor: pointer; text-decoration: underline;" 
                      onclick="showShelfMap('${item.localizador || ''}')"
                >${item.localizador || '-'}</span>
            </td>
            <td>${item.category || '-'}</td>
            <td class="action-buttons">
                <button class="btn btn-edit" data-id="${item.id}">Editar</button>
                <button class="btn btn-delete" data-id="${item.id}">Excluir</button>
            </td>
        `;

        inventoryBody.appendChild(row);
    });
    
    // Adicionar event listeners para os botões
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => openEditModal(button.dataset.id));
    });
    
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', () => deleteItem(button.dataset.id));
    });
}

// Adicionar um novo item
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemName = document.getElementById('itemName').value.trim();
    const itemQuantity = parseInt(document.getElementById('itemQuantity').value);
    const itemLocalizador = document.getElementById('itemLocalizador').value.trim();
    const itemCategory = document.getElementById('itemCategory').value.trim();
    
    if (!itemName || isNaN(itemQuantity) || itemQuantity < 1 || !itemCategory) {
        showError('Por favor, preencha todos os campos corretamente, incluindo a categoria.');
        return;
    }
    
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        
        // Determinar o próximo ID
        const nextId = inventoryItems.length > 0 
            ? Math.max(...inventoryItems.map(item => item.itemId)) + 1 
            : 1;
        
        // Usar um serviço de proxy CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const notionUrl = 'https://api.notion.com/v1/pages';
        
        // Log para debug
        console.log('Tentando adicionar item:', {
            nome: itemName,
            quantidade: itemQuantity,
            id: nextId,
            database_id: NOTION_DATABASE_ID
        });
        
        const requestBody = {
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
                'ID': {
                    number: nextId
                },
                'Nome do Item': {
                    title: [
                        {
                            text: {
                                content: itemName
                            }
                        }
                    ]
                },
                'Quantidade': {
                    number: itemQuantity
                },
                'Localizador': {
                    select: {
                        name: itemLocalizador || 'a1' // Default to 'a1' if empty
                    }
                },
                'Categoria': {
                    select: {
                        name: itemCategory || 'outros' // Default para 'outros' se vazio
                    }
                }
            }
        };
        
        console.log('Corpo da requisição:', JSON.stringify(requestBody, null, 2)); // Log para debug
        
        const response = await fetch(proxyUrl + notionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-02-22',
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro ao adicionar item:', errorData);
            throw new Error(`Erro na API do Notion: ${response.status} - ${errorData.message || ''}`);
        }

        // Limpar o formulário
        addItemForm.reset();
        
        // Atualizar a lista de itens
        await fetchInventoryItems();
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        showError('Erro ao adicionar item: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
    }
});

// Editar e excluir também precisam usar o proxy CORS
// Abrir modal de edição
function openEditModal(itemId) {
    const item = inventoryItems.find(item => item.id === itemId);
    
    if (!item) {
        showError('Item não encontrado');
        return;
    }
    
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemQuantity').value = item.quantity;
    document.getElementById('editItemLocalizador').value = item.localizador;
    
    editModal.style.display = 'block';
}

// Editar item
editItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = document.getElementById('editItemId').value;
    const itemName = document.getElementById('editItemName').value.trim();
    const itemQuantity = parseInt(document.getElementById('editItemQuantity').value);
    const itemLocalizador = document.getElementById('editItemLocalizador').value.trim();
    const itemCategory = document.getElementById('editItemCategory').value;
    
    if (!itemName || isNaN(itemQuantity) || itemQuantity < 1 || !itemCategory) {
        showError('Por favor, preencha todos os campos corretamente, incluindo a categoria.');
        return;
    }
    
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        
        // Usar um serviço de proxy CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const notionUrl = `https://api.notion.com/v1/pages/${itemId}`;
        
        // Log para debug
        console.log('Tentando editar item:', {
            id: itemId,
            nome: itemName,
            quantidade: itemQuantity
        });
        
        const requestBody = {
            properties: {
                'Nome do Item': {
                    title: [
                        {
                            text: {
                                content: itemName
                            }
                        }
                    ]
                },
                'Quantidade': {
                    number: itemQuantity
                },
                'Localizador': {
                    select: {
                        name: itemLocalizador || 'a1'
                    }
                },
                'Categoria': {
                    select: {
                        name: itemCategory || 'outros' // Default para 'outros' se vazio
                    }
                }
            }
        };
        
        console.log('Corpo da requisição de edição:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(proxyUrl + notionUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-02-22',
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro ao editar item:', errorData);
            throw new Error(`Erro na API do Notion: ${response.status} - ${errorData.message || ''}`);
        }

        // Fechar o modal
        editModal.style.display = 'none';
        
        // Atualizar a lista de itens
        await fetchInventoryItems();
        
    } catch (error) {
        console.error('Erro ao editar item:', error);
        showError('Erro ao editar item: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
    }
});

// Excluir item
async function deleteItem(itemId) {
    if (!confirm('Tem certeza que deseja excluir este item?')) {
        return;
    }
    
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        
        // Usar um serviço de proxy CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        // Corrigido: usar a API de páginas, não de blocos
        const notionUrl = `https://api.notion.com/v1/pages/${itemId}`;
        
        // Para excluir uma página no Notion, usamos o método PATCH para arquivá-la
        const response = await fetch(proxyUrl + notionUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-02-22',
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({
                archived: true // Arquivar a página em vez de excluí-la
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro ao excluir item:', errorData);
            throw new Error(`Erro na API do Notion: ${response.status} - ${errorData.message || ''}`);
        }
        
        // Atualizar a lista de itens
        await fetchInventoryItems();
        
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showError('Erro ao excluir item: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Exibir mensagem de erro
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Adicionar event listener para o botão de acesso rápido
document.getElementById('quickAccessBtn').addEventListener('click', () => {
    const defaultDatabaseId = '1c41dc4659a780acb974d6fa9f88a407';
    document.getElementById('databaseId').value = defaultDatabaseId;
});