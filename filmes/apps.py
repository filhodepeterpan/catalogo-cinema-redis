from django.apps import AppConfig


class FilmesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "filmes"

    def ready(self):
        from redis_om import Migrator

        from . import models

        try:
            Migrator().run()
        except Exception as erro:
            print(f"[AVISO] Não foi possível criar os índices do Redis: {erro}")
