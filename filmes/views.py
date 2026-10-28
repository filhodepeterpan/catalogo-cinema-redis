import json
import re

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError
from redis_om import NotFoundError

from .models import Filme


def erro(mensagem, status, detalhes=None):
    corpo = {"erro": mensagem}
    if detalhes:
        corpo["detalhes"] = detalhes
    return JsonResponse(corpo, status=status)


def ler_json(request):
    """Devolve (dados, None) ou (None, resposta_de_erro)."""
    try:
        dados = json.loads(request.body)
    except ValueError:
        return None, erro("JSON inválido", 400)
    if not isinstance(dados, dict):
        return None, erro("O corpo da requisição deve ser um objeto JSON", 400)
    dados.pop("pk", None)  # o ID é sempre gerado/controlado pela API
    return dados, None


def detalhes_validacao(e):
    return [
        {"campo": ".".join(str(p) for p in item["loc"]), "mensagem": item["msg"]}
        for item in e.errors()
    ]


@csrf_exempt
def filmes(request):
    # LISTAR (com filtros opcionais)
    if request.method == "GET":
        filtros = []
        genero = request.GET.get("genero")
        # Busca por título: só letras, números e espaços (evita erro de sintaxe no Redis)
        busca = re.sub(r"[^\w\s]", " ", request.GET.get("busca", "")).strip()
        if genero:
            filtros.append(Filme.genero == genero)
        if busca:
            filtros.append(Filme.titulo % f"{busca}*")  # prefixo: "mei" acha "Meia-Noite"
        resultado = Filme.find(*filtros).all()
        return JsonResponse([f.model_dump() for f in resultado], safe=False)

    # CADASTRAR
    if request.method == "POST":
        dados, falha = ler_json(request)
        if falha:
            return falha
        try:
            filme = Filme(**dados)
        except ValidationError as e:
            return erro("Dados inválidos", 400, detalhes_validacao(e))
        filme.save()
        return JsonResponse(
            {"mensagem": "Filme cadastrado com sucesso", "filme": filme.model_dump()},
            status=201,
        )

    return erro("Método não permitido", 405)


@csrf_exempt
def filme_detalhe(request, pk):
    try:
        filme = Filme.get(pk)
    except NotFoundError:
        return erro("Filme não encontrado", 404)

    # CONSULTAR POR ID
    if request.method == "GET":
        return JsonResponse(filme.model_dump())

    # ATUALIZAR
    if request.method == "PUT":
        dados, falha = ler_json(request)
        if falha:
            return falha
        try:
            # Junta os dados atuais com os enviados e valida tudo de novo
            atualizado = Filme(**{**filme.model_dump(), **dados, "pk": pk})
        except ValidationError as e:
            return erro("Dados inválidos", 400, detalhes_validacao(e))
        atualizado.save()
        return JsonResponse(
            {"mensagem": "Filme atualizado com sucesso", "filme": atualizado.model_dump()}
        )

    # EXCLUIR
    if request.method == "DELETE":
        Filme.delete(pk)
        return JsonResponse({"mensagem": "Filme excluído com sucesso"})

    return erro("Método não permitido", 405)
