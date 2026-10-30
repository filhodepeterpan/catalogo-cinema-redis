// ===== Configuração =====
const API = "http://localhost:8000/api/filmes/"; // a barra final é obrigatória

const $ = s => document.querySelector(s);
const rotulo = { em_cartaz: "Em cartaz", em_breve: "Em breve", fora_de_cartaz: "Fora de cartaz" };
const estado = { busca: "", genero: "", status: "" };
let filmes = [];      // lista atual, vinda da API (que lê do Redis)
let editando = null;  // filme em edição (null = cadastrando)

// ===== Camada de API: único lugar que usa fetch =====
async function req(url, opcoes = {}) {
  const cabecalhos = opcoes.body ? { "Content-Type": "application/json" } : {};
  let resp;
  try {
    resp = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw { erro: "Não foi possível falar com a API. Confira se o backend está rodando em localhost:8000." };
  }
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw corpo; // o backend devolve { erro, detalhes }
  return corpo;
}

const listar = (genero = "", busca = "") => {
  const p = new URLSearchParams();
  if (genero) p.set("genero", genero);
  if (busca) p.set("busca", busca);
  return req(`${API}?${p}`);                                                                     // GET /filmes/
};
const cadastrar = filme => req(API, { method: "POST", body: JSON.stringify(filme) });            // POST /filmes/
const atualizar = (pk, filme) => req(`${API}${pk}/`, { method: "PUT", body: JSON.stringify(filme) }); // PUT /filmes/{pk}/
const excluir = pk => req(`${API}${pk}/`, { method: "DELETE" });                                 // DELETE /filmes/{pk}/

// ===== Carregar e mostrar =====
async function carregar() {
  $("#aviso").textContent = "Carregando filmes…";
  try {
    const todos = await listar(estado.genero, estado.busca);
    // a API não filtra por status, então filtramos aqui
    filmes = estado.status ? todos.filter(f => f.status === estado.status) : todos;
    $("#aviso").textContent = filmes.length ? "" : "Nenhum filme encontrado. Ajuste a busca ou cadastre um filme.";
  } catch (e) {
    filmes = [];
    $("#aviso").textContent = e.erro || "Erro ao carregar os filmes.";
  }
  $("#lista").replaceChildren(...filmes.map(card));
}

// As opções de gênero vêm de uma busca sem filtros, para o select não encolher
async function carregarGeneros() {
  try {
    const todos = await listar();
    const sel = $("#genero"), atual = sel.value;
    sel.replaceChildren(new Option("Todos os gêneros", ""), ...[...new Set(todos.map(f => f.genero))].sort().map(g => new Option(g, g)));
    sel.value = atual;
  } catch { /* sem API, o select fica só com "Todos os gêneros" */ }
}

const atualizarTudo = () => { carregar(); carregarGeneros(); };

function card(f) {
  const n = $("#tpl-card").content.cloneNode(true), q = s => n.querySelector(s), cartaz = q(".cartaz");
  cartaz.dataset.inicial = f.titulo.trim().charAt(0).toUpperCase();
  if (f.cartaz) { q("img").src = f.cartaz; q("img").onerror = () => cartaz.classList.add("sem-imagem"); } else cartaz.classList.add("sem-imagem");
  q(".selo").textContent = rotulo[f.status]; q(".selo").dataset.status = f.status;
  q(".titulo").textContent = f.titulo;
  q(".classe").textContent = f.classificacao; q(".classe").dataset.c = f.classificacao;
  q(".detalhes").textContent = `${f.genero}, ${f.ano_lancamento}, ${f.duracao_minutos} min`;
  q(".dir").textContent = "Direção: " + f.diretores.join(", ");
  q(".sinopse").textContent = f.sinopse;
  q(".sessoes").replaceChildren(...f.horarios.map(h => Object.assign(document.createElement("li"), { textContent: h })));
  q(".lugares").textContent = (f.salas.length ? `Sala ${f.salas.join(", ")}\n` : "") + `${f.lugares} lugares livres`;
  q(".editar").onclick = () => abrir(f);
  q(".excluir").onclick = async () => {
    if (!confirm(`Excluir “${f.titulo}”?`)) return;
    try { await excluir(f.pk); atualizarTudo(); }
    catch (e) { $("#aviso").textContent = e.erro || "Não foi possível excluir o filme."; }
  };
  return n;
}

// ===== Formulário (cadastrar e editar) =====
function abrir(f = null) {
  editando = f;
  const form = $("#form"); form.reset(); $("#erros").textContent = "";
  $("#modal-titulo").textContent = f ? "Editar filme" : "Cadastrar filme";
  $("#salvar").textContent = f ? "Salvar alterações" : "Cadastrar filme";
  if (f) for (const [k, v] of Object.entries(f)) if (form.elements[k]) form.elements[k].value = Array.isArray(v) ? v.join(", ") : v;
  $("#modal").showModal();
}

$("#form").onsubmit = async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const lista = s => s.split(",").map(x => x.trim()).filter(Boolean);
  if (!d.titulo.trim() || !lista(d.diretores).length || !d.ano_lancamento || !d.duracao_minutos || !d.genero.trim() || d.lugares === "")
    return $("#erros").textContent = "Preencha título, diretores, ano, duração, gênero e lugares.";
  const filme = { ...d, diretores: lista(d.diretores), horarios: lista(d.horarios), salas: lista(d.salas).map(Number), ano_lancamento: +d.ano_lancamento, duracao_minutos: +d.duracao_minutos, lugares: +d.lugares };
  try {
    editando ? await atualizar(editando.pk, filme) : await cadastrar(filme);
    $("#modal").close();
    atualizarTudo();
  } catch (err) {
    $("#erros").textContent = err.detalhes
      ? err.detalhes.map(x => `${x.campo}: ${x.mensagem}`).join("; ")
      : err.erro || "Não foi possível salvar o filme.";
  }
};

// ===== Filtros =====
let espera;
$("#busca").oninput = e => {
  clearTimeout(espera); // espera o usuário parar de digitar antes de chamar a API
  espera = setTimeout(() => { estado.busca = e.target.value.trim(); carregar(); }, 300);
};
$("#genero").onchange = e => { estado.genero = e.target.value; carregar(); };
document.querySelectorAll(".aba").forEach(b => b.onclick = () => {
  document.querySelectorAll(".aba").forEach(x => x.classList.toggle("ativa", x === b));
  estado.status = b.dataset.status; carregar();
});
$("#btn-novo").onclick = () => abrir();
$("#cancelar").onclick = () => $("#modal").close();

// ===== Início =====
atualizarTudo();
