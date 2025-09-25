let convidados = [];
let dadosImportacao = [];

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        atualizarDashboard();
        atualizarListaConvidados();
        atualizarRelatorio();
    } else {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }

    const formCadastro = document.getElementById('form-cadastro');
    formCadastro.removeEventListener('submit', cadastrarConvidado);
    formCadastro.addEventListener('submit', cadastrarConvidado);
    document.getElementById('form-login').addEventListener('submit', login);
    document.getElementById('arquivo-importacao').addEventListener('change', processarArquivo);
    document.getElementById('busca-checkin').addEventListener('input', buscarConvidados);
});

async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao fazer login');
        }
        const { token } = await response.json();
        localStorage.setItem('token', token);
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        atualizarDashboard();
        atualizarListaConvidados();
        atualizarRelatorio();
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('form-login').reset();
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('tab-active', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    });

    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.add('tab-active', 'text-white');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');

    if (tabName === 'relatorio') {
        atualizarRelatorio();
    }
}

async function cadastrarConvidado(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const novoConvidado = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        cpf: document.getElementById('cpf').value,
        telefone: document.getElementById('telefone').value,
        empresa: document.getElementById('empresa').value,
        observacoes: document.getElementById('observacoes').value
    };

    console.log('Sending guest data:', novoConvidado);

    try {
        const response = await fetch('/api/guests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(novoConvidado)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao cadastrar convidado');
        }
        document.getElementById('form-cadastro').reset();
        alert('Convidado cadastrado com sucesso!');
        atualizarDashboard();
        atualizarListaConvidados();
    } catch (error) {
        console.error('Erro ao cadastrar convidado:', error);
        alert('Erro ao cadastrar convidado: ' + error.message);
    } finally {
        submitButton.disabled = false;
    }
}

function processarArquivo(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const conteudo = e.target.result;
        if (arquivo.name.endsWith('.csv')) {
            processarCSV(conteudo);
        } else {
            alert('Formato não suportado. Use apenas CSV.');
        }
    };
    reader.readAsText(arquivo);
}

function processarCSV(conteudo) {
    const linhas = conteudo.split('\n');
    const cabecalho = linhas[0].split(',').map(col => col.trim());

    dadosImportacao = [];

    for (let i = 1; i < linhas.length; i++) {
        if (linhas[i].trim()) {
            const valores = linhas[i].split(',').map(val => val.trim());
            dadosImportacao.push({
                nome: valores[0] || '',
                email: valores[1] || '',
                cpf: valores[2] || '',
                telefone: valores[3] || '',
                empresa: valores[4] || ''
            });
        }
    }

    mostrarPreview();
}

function mostrarPreview() {
    const preview = document.getElementById('preview-importacao');
    const tbody = document.getElementById('preview-dados');

    tbody.innerHTML = '';

    dadosImportacao.slice(0, 5).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2">${item.nome}</td>
            <td class="py-2">${item.email}</td>
            <td class="py-2">${item.cpf}</td>
            <td class="py-2 hidden sm:table-cell">${item.telefone}</td>
            <td class="py-2 hidden md:table-cell">${item.empresa}</td>
        `;
        tbody.appendChild(tr);
    });

    preview.classList.remove('hidden');
    document.getElementById('btn-importar').disabled = false;
}

async function importarDados() {
    try {
        const response = await fetch('/api/guests/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(dadosImportacao)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao importar convidados');
        }
        const result = await response.json();
        alert(`${result.count} convidados importados com sucesso!`);
        document.getElementById('arquivo-importacao').value = '';
        document.getElementById('preview-importacao').classList.add('hidden');
        document.getElementById('btn-importar').disabled = true;
        dadosImportacao = [];
        atualizarDashboard();
        atualizarListaConvidados();
    } catch (error) {
        console.error('Erro ao importar convidados:', error);
        alert('Erro ao importar convidados: ' + error.message);
    }
}

async function buscarConvidados() {
    const termo = document.getElementById('busca-checkin').value.toLowerCase();
    const resultados = document.getElementById('resultados-busca');
    const semResultados = document.getElementById('sem-resultados');

    if (!termo) {
        resultados.innerHTML = '';
        semResultados.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/guests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao buscar convidados');
        }
        const convidados = await response.json();
        const encontrados = convidados.filter(c =>
            c.nome.toLowerCase().includes(termo) ||
            c.email.toLowerCase().includes(termo) ||
            (c.cpf && c.cpf.toLowerCase().includes(termo)) ||
            (c.empresa && c.empresa.toLowerCase().includes(termo))
        );

        if (encontrados.length === 0) {
            resultados.innerHTML = '<p class="text-center py-4 text-gray-500">Nenhum convidado encontrado</p>';
            semResultados.classList.add('hidden');
            return;
        }

        semResultados.classList.add('hidden');
        resultados.innerHTML = encontrados.map(convidado => `
            <div class="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div class="flex-1">
                    <h3 class="font-medium text-lg">${convidado.nome}</h3>
                    <p class="text-sm text-gray-600">${convidado.email}</p>
                    ${convidado.cpf ? `<p class="text-sm text-gray-500">CPF: ${convidado.cpf}</p>` : ''}
                    ${convidado.empresa ? `<p class="text-sm text-gray-500">Empresa: ${convidado.empresa}</p>` : ''}
                </div>
                <div class="text-left sm:text-right">
                    ${convidado.checkin ?
                        `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✅ Check-in feito</span>
                         <p class="text-xs text-gray-500 mt-1">${convidado.horarioCheckin}</p>` :
                        `<button onclick="fazerCheckin(${convidado.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all w-full sm:w-auto">
                            Fazer Check-in
                         </button>`
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao buscar convidados:', error);
        alert('Erro ao buscar convidados: ' + error.message);
    }
}

async function fazerCheckin(id) {
    try {
        const response = await fetch(`/api/guests/${id}/checkin`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao realizar check-in');
        }
        alert(`Check-in realizado com sucesso!`);
        buscarConvidados();
        atualizarDashboard();
        atualizarListaConvidados();
    } catch (error) {
        console.error('Erro ao realizar check-in:', error);
        alert('Erro ao realizar check-in: ' + error.message);
    }
}

async function confirmarPresenca(id) {
    try {
        const response = await fetch(`/api/guests/${id}/confirm`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao confirmar presença');
        }
        atualizarDashboard();
        atualizarListaConvidados();
    } catch (error) {
        console.error('Erro ao confirmar presença:', error);
        alert('Erro ao confirmar presença: ' + error.message);
    }
}

async function removerConvidado(id) {
    if (confirm('Tem certeza que deseja remover este convidado?')) {
        try {
            const response = await fetch(`/api/guests/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao remover convidado');
            }
            atualizarDashboard();
            atualizarListaConvidados();
        } catch (error) {
            console.error('Erro ao remover convidado:', error);
            alert('Erro ao remover convidado: ' + error.message);
        }
    }
}

async function atualizarDashboard() {
    try {
        const response = await fetch('/api/guests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar dashboard');
        }
        convidados = await response.json();
        const total = convidados.length;
        const confirmados = convidados.filter(c => c.confirmado).length;
        const checkins = convidados.filter(c => c.checkin).length;
        const taxa = total > 0 ? Math.round((checkins / total) * 100) : 0;

        document.getElementById('total-convidados').textContent = total;
        document.getElementById('total-confirmados').textContent = confirmados;
        document.getElementById('total-checkin').textContent = checkins;
        document.getElementById('taxa-presenca').textContent = taxa + '%';
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        alert('Erro ao atualizar dashboard: ' + error.message);
    }
}

async function atualizarListaConvidados() {
    try {
        const response = await fetch('/api/guests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar lista de convidados');
        }
        convidados = await response.json();
        const tbody = document.getElementById('lista-convidados');

        if (convidados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        Nenhum convidado cadastrado ainda
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = convidados.map(convidado => `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 px-2 sm:px-4">
                    <div class="font-medium">${convidado.nome}</div>
                    <div class="text-sm text-gray-500 sm:hidden">${convidado.email}</div>
                    ${convidado.cpf ? `<div class="text-xs text-gray-400 md:hidden">CPF: ${convidado.cpf}</div>` : ''}
                </td>
                <td class="py-3 px-2 sm:px-4 hidden sm:table-cell">${convidado.email}</td>
                <td class="py-3 px-2 sm:px-4 hidden md:table-cell">${convidado.cpf || '-'}</td>
                <td class="py-3 px-2 sm:px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        convidado.confirmado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${convidado.confirmado ? 'Confirmado' : 'Pendente'}
                    </span>
                </td>
                <td class="py-3 px-2 sm:px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        convidado.checkin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }">
                        ${convidado.checkin ? 'Presente' : 'Ausente'}
                    </span>
                </td>
                <td class="py-3 px-2 sm:px-4">
                    <div class="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                        <button onclick="confirmarPresenca(${convidado.id})" class="text-blue-600 hover:text-blue-800 text-xs sm:text-sm bg-transparent border-none cursor-pointer">
                            ${convidado.confirmado ? 'Desconfirmar' : 'Confirmar'}
                        </button>
                        <button onclick="removerConvidado(${convidado.id})" class="text-red-600 hover:text-red-800 text-xs sm:text-sm bg-transparent border-none cursor-pointer">
                            Remover
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao atualizar lista de convidados:', error);
        alert('Erro ao atualizar lista de convidados: ' + error.message);
    }
}

async function atualizarRelatorio() {
    try {
        const response = await fetch('/api/guests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar relatório');
        }
        convidados = await response.json();
        const total = convidados.length;
        const presentes = convidados.filter(c => c.checkin).length;
        const ausentes = total - presentes;

        document.getElementById('rel-total').textContent = total;
        document.getElementById('rel-presentes').textContent = presentes;
        document.getElementById('rel-ausentes').textContent = ausentes;

        const tbody = document.getElementById('tabela-relatorio');
        tbody.innerHTML = convidados.map(convidado => `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 px-2 sm:px-4">
                    <div class="font-medium">${convidado.nome}</div>
                    <div class="text-sm text-gray-500 sm:hidden">${convidado.email}</div>
                    ${convidado.cpf ? `<div class="text-xs text-gray-400 md:hidden">CPF: ${convidado.cpf}</div>` : ''}
                    ${convidado.empresa ? `<div class="text-xs text-gray-400 lg:hidden">Empresa: ${convidado.empresa}</div>` : ''}
                </td>
                <td class="py-3 px-2 sm:px-4 hidden sm:table-cell">${convidado.email}</td>
                <td class="py-3 px-2 sm:px-4 hidden md:table-cell">${convidado.cpf || '-'}</td>
                <td class="py-3 px-2 sm:px-4 hidden lg:table-cell">${convidado.empresa || '-'}</td>
                <td class="py-3 px-2 sm:px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        convidado.checkin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${convidado.checkin ? 'Presente' : 'Ausente'}
                    </span>
                </td>
                <td class="py-3 px-2 sm:px-4 hidden md:table-cell">${convidado.horarioCheckin || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao atualizar relatório:', error);
        alert('Erro ao atualizar relatório: ' + error.message);
    }
}

async function exportarRelatorio() {
    try {
        const response = await fetch('/api/report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao exportar relatório');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-presenca-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Erro ao exportar relatório: ' + error.message);
    }
}