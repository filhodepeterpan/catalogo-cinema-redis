# Catálogo de Cinema – API (Backend)

API REST em **Python (Django)** para gerenciar o catálogo de filmes de um cinema, com banco de dados **Redis** (via **Redis OM**). Permite cadastrar, listar, consultar, atualizar e excluir filmes (CRUD completo), com busca por título e filtro por gênero.

> O frontend (HTML, CSS e JS) fica no diretório `frontend/` na raiz do projeto.

## Tecnologias

- Python 3.12 e Django
- Redis Stack (RedisJSON + RediSearch)
- Redis OM (modelagem e consultas no Redis)
- django-cors-headers (liberar o frontend em outra porta)
- Docker e Docker Compose

## Como executar (recomendado: Docker)

**Requisito:** ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e **aberto** (aguarde o status "Engine running").

1. Clone o repositório e entre na pasta do projeto (onde está o `manage.py`).
2. Suba os serviços:

   ```bash
   docker compose up --build
   ```

3. A API ficará disponível em: <http://localhost:8000/api/filmes/>

   Se aparecer `[]`, está funcionando (ainda não há filmes cadastrados).

4. Para parar: `Ctrl+C` e depois `docker compose down`.
   Os dados ficam guardados no volume `redis-data`. Para apagar tudo, incluindo os dados: `docker compose down -v`.

Não é preciso instalar Python nem Redis na máquina. O Docker baixa a imagem do Redis automaticamente na primeira execução (é necessária internet nesse momento).

## Como executar para desenvolvimento (sem Docker para o Django)

1. Suba apenas o Redis:

   ```bash
   docker compose up redis -d
   ```

2. Crie e ative o ambiente virtual e instale as dependências:

   ```bash
   python -m venv venv
   venv\Scripts\Activate.ps1      # Windows (PowerShell)
   # source venv/bin/activate     # Linux/Mac
   pip install -r requirements.txt
   ```

3. Rode o servidor:

   ```bash
   python manage.py runserver
   ```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Endereço do Redis. No Docker Compose é `redis://redis:6379`. |
| `CORS_ORIGINS` | `http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000` | Origens do frontend autorizadas a chamar a API, separadas por vírgula. |

## Endpoints da API

Base: `http://localhost:8000/api`

> Use sempre a **barra final** nas URLs (`/filmes/`). Sem ela, o Django redireciona e o `POST` falha.

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/filmes/` | Lista todos os filmes. Filtros opcionais: `?genero=Terror` e `?busca=meia` (busca no título; aceita parte da palavra, ex.: `mei` encontra "Meia-Noite") | 200 | – |
| POST | `/filmes/` | Cadastra um filme | 201 | 400 |
| GET | `/filmes/{id}/` | Consulta um filme pelo ID | 200 | 404 |
| PUT | `/filmes/{id}/` | Atualiza um filme (pode enviar só os campos que mudam) | 200 | 400, 404 |
| DELETE | `/filmes/{id}/` | Exclui um filme | 200 | 404 |

### Exemplo de corpo (POST/PUT)

```json
{
  "titulo": "À Meia-Noite Levarei Sua Alma",
  "diretores": ["José Mojica Marins"],
  "ano_lancamento": 1964,
  "duracao_minutos": 84,
  "genero": "Terror",
  "sinopse": "Resumo do filme.",
  "horarios": ["13h", "18h", "21h"],
  "salas": [5, 6],
  "cartaz": "caminho-da-imagem/arquivo.jpeg",
  "lugares": 83,
  "classificacao": "18",
  "status": "em_cartaz",
  "nota": 8.5
}
```

### Exemplo de resposta de sucesso (POST/PUT)

```json
{
  "mensagem": "Filme cadastrado com sucesso",
  "filme": { "pk": "01J...", "titulo": "À Meia-Noite Levarei Sua Alma", "...": "..." }
}
```

### Exemplo de resposta de erro

```json
{ "erro": "Filme não encontrado" }
```

```json
{
  "erro": "Dados inválidos",
  "detalhes": [
    { "campo": "nota", "mensagem": "Input should be less than or equal to 10" }
  ]
}
```

### Exemplo de teste no PowerShell (Windows)

O PowerShell costuma estragar as aspas do JSON no `curl`. Use `Invoke-RestMethod`:

```powershell
$filme = @{
  titulo = "À Meia-Noite Levarei Sua Alma"
  diretores = @("José Mojica Marins")
  ano_lancamento = 1964
  duracao_minutos = 84
  genero = "Terror"
  sinopse = "Resumo do filme."
  horarios = @("13h","18h","21h")
  salas = @(5,6)
  cartaz = ""
  lugares = 83
  classificacao = "18"
  status = "em_cartaz"
  nota = 8.5
} | ConvertTo-Json

$bytes = [System.Text.Encoding]::UTF8.GetBytes($filme)
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/filmes/ -ContentType "application/json; charset=utf-8" -Body $bytes

# Listar e filtrar (parênteses necessários para usar Select-Object)
(Invoke-RestMethod "http://localhost:8000/api/filmes/") | Select-Object pk, titulo
(Invoke-RestMethod "http://localhost:8000/api/filmes/?genero=Terror") | Select-Object titulo
(Invoke-RestMethod "http://localhost:8000/api/filmes/?busca=meia") | Select-Object titulo
```

### Exemplo com curl (Linux/Mac ou Git Bash)

```bash
curl -X POST http://localhost:8000/api/filmes/ \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Exemplo","diretores":["Fulano"],"ano_lancamento":2000,"duracao_minutos":100,"genero":"Drama","sinopse":"...","horarios":["18h"],"salas":[1],"cartaz":"","lugares":50,"classificacao":"12","status":"em_cartaz","nota":7}'
```

## Modelagem da base de dados (Redis)

Cada filme é armazenado como um documento JSON em uma chave própria, no formato `:filmes.models.Filme:<id>`, onde `<id>` é gerado automaticamente (ULID).

| Campo | Tipo | Regras |
|---|---|---|
| `pk` | string | Identificador do filme, gerado pela API |
| `titulo` | string | Obrigatório; indexado para busca por texto |
| `diretores` | lista de strings | Pelo menos 1 |
| `ano_lancamento` | inteiro | Entre 1888 e 2100 |
| `duracao_minutos` | inteiro | Maior que 0 |
| `genero` | string | Obrigatório; indexado para filtro |
| `sinopse` | string | Texto livre |
| `horarios` | lista de strings | Ex.: `["13h", "18h"]` |
| `salas` | lista de inteiros | Ex.: `[5, 6]` |
| `cartaz` | string | URL ou caminho da imagem (opcional) |
| `lugares` | inteiro | Lugares disponíveis, maior ou igual a 0 |
| `classificacao` | string | `Livre`, `10`, `12`, `14`, `16` ou `18` |
| `status` | string | `em_cartaz`, `em_breve` ou `fora_de_cartaz` |
| `nota` | número | Entre 0 e 10 |

A validação dos dados é feita no backend (Pydantic, via Redis OM). Dados inválidos retornam `400` com a lista de problemas.

## Estrutura do projeto

```
catalogo_cinema/            # pasta do projeto (raiz do repositório)
├── catalogo_cinema/        # configurações do Django (settings, urls)
├── filmes/                 # app: models.py (Redis OM), views.py, urls.py
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Problemas comuns

- **`failed to connect to the docker API`**: o Docker Desktop não está aberto. Abra-o e espere o "Engine running".
- **Erro de conexão com o Redis**: confira se o contêiner está rodando com `docker ps`.
- **Filtro por gênero ou busca por título não retorna nada (ou dá erro)**: os índices de busca são criados quando o servidor inicia. Se o servidor subiu antes do Redis estar pronto, apareceu o aviso `[AVISO] Não foi possível criar os índices do Redis`. Com o Redis já rodando, reinicie o servidor (ou `docker compose restart api`).
- **Erro de CORS no frontend**: inclua a origem do frontend (com a porta) em `CORS_ORIGINS`. Não abra o HTML direto pelo arquivo (`file://`); sirva-o por uma porta, por exemplo `python -m http.server 5500`.
- **Porta 6379 ou 8000 em uso**: pare o processo que a está usando ou mude a porta no `docker-compose.yml`.
