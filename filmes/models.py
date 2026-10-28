import os
from typing import List, Literal

from redis_om import Field, JsonModel, get_redis_connection

redis = get_redis_connection(
    url=os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True,
)


class Filme(JsonModel, index=True):
    titulo: str = Field(index=True, full_text_search=True, min_length=1)
    diretores: List[str] = Field(min_length=1)
    ano_lancamento: int = Field(ge=1888, le=2100)
    duracao_minutos: int = Field(gt=0)
    genero: str = Field(index=True, min_length=1)
    sinopse: str
    horarios: List[str]
    salas: List[int]
    cartaz: str = ""
    lugares: int = Field(ge=0)
    classificacao: Literal["Livre", "10", "12", "14", "16", "18"]
    status: Literal["em_cartaz", "em_breve", "fora_de_cartaz"] = "em_breve"
    nota: float = Field(ge=0, le=10, default=0)

    class Meta:
        database = redis
