# usuarios/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from .managers import UsuarioManager

class Usuario(AbstractUser):
    """
    Modelo de usuário customizado.
    O login será feito com o campo de email em vez do username.
    """
    # Remove o campo username do modelo padrão, pois não será utilizado.
    username = None
    
    # Define o email como o campo principal, único e obrigatório.
    email = models.EmailField(_('endereço de e-mail'), unique=True)

    # Define que o campo 'email' será usado para o login.
    USERNAME_FIELD = 'email'
    
    # Lista de campos que serão solicitados ao criar um superusuário via createsuperuser.
    # Como o email já é o USERNAME_FIELD, ele é obrigatório por padrão.
    REQUIRED_FIELDS = []

    # Associa o gerenciador customizado ao modelo
    objects = UsuarioManager()

    def __str__(self):
        return self.email