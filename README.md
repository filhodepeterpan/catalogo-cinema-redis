# Catálogo de Cinema – Aplicação Completa

Aplicação completa para gerenciamento e navegação do catálogo de filmes de um cinema. O projeto conta com um **frontend estático** integrado e uma **API REST em Python (Django)** com banco de dados **Redis** (via **Redis OM**).

O frontend já está pronto e vem integrado no projeto na pasta `frontend/`. Não é necessário rodar nenhum comando de terminal para o frontend.

---

## Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (na pasta `frontend/`)
- **Backend:** Python 3.12 e Django (API REST)
- **Banco de Dados:** Redis Stack (RedisJSON + RediSearch) via Redis OM
- **CORS:** `django-cors-headers` configurado para comunicação entre front e back
- **Orquestração:** Docker e Docker Compose

---

## Como Executar o Projeto

Você precisa apenas do **Docker Desktop** instalado para rodar a aplicação completa.

### Passo 1: Abrir o Docker
Certifique-se de que o aplicativo **Docker Desktop** esteja aberto no seu computador e com o status *"Engine running"*.

### Passo 2: Subir a aplicação
No terminal, na pasta raiz do projeto, execute o comando:

```bash
docker compose up --build
```

### Passo 3: Acessar a aplicação
Após os contêineres subirem:
- **Aplicação / Frontend:** Abra o arquivo `frontend/index.html` no seu navegador (ou acesse via servidor local se configurado).
- **API (Backend):** Ficará disponível em <http://localhost:8000/api/filmes/>.

### Para Parar a Aplicação
No terminal, pressione `Ctrl + C` e execute:
```bash
docker compose down
```
*(Para apagar o banco de dados e reiniciar do zero, use `docker compose down -v`)*.

---

## Variáveis de Ambiente

Caso precise alterar configurações de rede ou portas, utilize as variáveis abaixo (já pré-configuradas no `docker-compose.yml`):

| Variável | Padrão | Descrição |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379` | Endereço de conexão com o contêiner do Redis. |
| `CORS_ORIGINS` | `http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000` | Origens autorizadas a realizar requisições para a API. |

---

## Endpoints da API

Base da API: `http://localhost:8000/api`

> **Atenção:** Mantenha a **barra final** nas URLs (`/filmes/`) para evitar redirecionamentos do Django que possam falhar requisições `POST` ou `PUT`.

| Método | Rota | Descrição | Status Sucesso |
|---|---|---|---|
| `GET` | `/filmes/` | Lista todos os filmes. Aceita filtros query params: `?genero=Nome` e `?busca=termo` | `200 OK` |
| `POST` | `/filmes/` | Cadastra um novo filme | `201 Created` |
| `GET` | `/filmes/{id}/` | Retorna os detalhes de um filme específico pelo ID | `200 OK` |
| `PUT` | `/filmes/{id}/` | Atualiza os dados de um filme (parcial ou completo) | `200 OK` |
| `DELETE` | `/filmes/{id}/` | Remove um filme do catálogo | `200 OK` |

### Exemplo de Payload (POST / PUT)

```json
{
  "titulo": "À Meia-Noite Levarei Sua Alma",
  "diretores": ["José Mojica Marins"],
  "ano_lancamento": 1964,
  "duracao_minutos": 84,
  "genero": "Terror",
  "sinopse": "Um coveiro sádico busca uma mulher para gerar um filho perfeito.",
  "horarios": ["13h", "18h", "21h"],
  "salas": [5, 6],
  "cartaz": "caminho-ou-url-da-imagem.jpeg",
  "lugares": 83,
  "classificacao": "18",
  "status": "em_cartaz",
  "nota": 8.5
}
```

---

## Estrutura do Repositório

```text
catalogo_cinema/            # Pasta raiz do projeto
├── frontend/               # Interface da aplicação (HTML, CSS, JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── catalogo_cinema/        # Configurações do projeto Django
├── filmes/                 # App Django (models, views, urls, validações)
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Solução de Problemas Comuns

- **Erro `failed to connect to the docker API`:** O Docker Desktop não está aberto. Abra a aplicação no seu sistema operacional e aguarde carregar.
- **Erro de CORS ao realizar requisições no Frontend:** Verifique se a origem/porta onde você abriu o `index.html` está listada em `CORS_ORIGINS` no `docker-compose.yml`.
- **Filtros por busca/gênero não funcionam:** Os índices do RediSearch são inicializados na subida do backend. Se o Redis demorou a subir, basta reiniciar o contêiner da API com `docker compose restart api`.