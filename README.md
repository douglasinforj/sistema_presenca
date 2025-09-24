# Sistema de Presença

Sistema de Presença é uma aplicação web para gerenciamento de convidados e presenças em eventos. Permite cadastrar convidados, importar listas via CSV, realizar check-in e gerar relatórios de presença. A aplicação utiliza Node.js com Express no backend, SQLite para persistência de dados e uma interface frontend com HTML, CSS (Tailwind) e JavaScript.

## Funcionalidades

- **Dashboard**: Exibe métricas como total de convidados, confirmados, check-ins e taxa de presença.
- **Cadastro**: Adiciona novos convidados individualmente.
- **Importação**: Importa listas de convidados via arquivos CSV.
- **Check-in**: Permite buscar e registrar a presença de convidados.
- **Relatório**: Gera relatórios de presença com opção de exportação em CSV.

## Tecnologias Utilizadas

- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: HTML, Tailwind CSS, JavaScript
- **Dependências**: express, sqlite3, cors, csv-parser
- **Desenvolvimento**: nodemon
- **Hospedagem**: Compatível com Render

## Estrutura do Projeto

```

sistema-presenca/
├── data/
│   └── guests.db (criado automaticamente)
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── index.html
├── server.js
├── package.json
├── .env
├── .gitignore
└── README.md

```

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (geralmente incluído com o Node.js)

## Instalação

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/douglasinforj/sistema_presenca.git
   cd sistema-presenca

2. **Instale as dependências**:

- npm install

3. **Configure as variáveis de ambiente**:

```
PORT=3000
DATABASE_PATH=./data/guests.db
CORS_ORIGIN=*
NODE_ENV=development
```

4. **Inicie o servidor**:

- npm start

5. **Acesse a aplicação**:

- Abra o navegador em http://localhost:3000


## Deploy no Render

1. Crie um novo Web Service no Render.
2. Configure o ambiente:
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
3. Faça o push do repositório para o Render.
4. Certifique-se de que o diretório data é gravável ou que o banco SQLite (guests.db) será criado na raiz do projeto.

## Uso do Sistema:

- Cadastrar Convidado: Na aba "Cadastro", preencha os campos e clique em "Cadastrar Convidado".
- Importar Lista: Na aba "Importar", selecione um arquivo CSV com colunas Nome,Email,CPF,Telefone,Empresa e clique em "Importar Convidados".
- Check-in: Na aba "Check-in", busque por nome, email, CPF ou empresa e clique em "Fazer Check-in".
- Relatório: Na aba "Relatório", visualize a lista de convidados e exporte como CSV.

## Formato do CSV para Importação:

- O arquivo CSV deve ter o seguinte formato:

  - Nome,Email,CPF,Telefone,Empresa
  - João Silva,joao@email.com,123.456.789-00,11999999999,Empresa X
  - Maria Oliveira,maria@email.com,987.654.321-00,11988888888,Empresa Y

## Observações:

- O banco de dados SQLite (guests.db) é criado automaticamente na pasta data ou na raiz do projeto, caso a pasta data não esteja disponível (ex.: em ambientes como Render).
- Apenas arquivos CSV são suportados para importação.
- A aplicação inclui tratamento de erros básico, exibindo mensagens ao usuário em caso de falhas.

## Contribuição

- Faça um fork do repositório.
- Crie uma branch para sua feature (git checkout -b feature/nova-funcionalidade).
- Commit suas alterações (git commit -m 'Adiciona nova funcionalidade').
- Push para a branch (git push origin feature/nova-funcionalidade).
- Abra um Pull Request.

## Licença

- Este projeto está licenciado sob a Licença MIT.