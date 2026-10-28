from django.urls import path

from . import views

urlpatterns = [
    path("filmes/", views.filmes),
    path("filmes/<str:pk>/", views.filme_detalhe),
]
