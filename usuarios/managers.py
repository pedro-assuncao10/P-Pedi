from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _

class UsuarioManager(BaseUserManager):
    """
    Gerenciador customizado para o modelo de Usuário, onde o email é o identificador único
    para autenticação em vez de nomes de usuário.
    """
    def create_user(self, email, password, **extra_fields):
        """
        Cria e salva um usuário com o email e a senha fornecidos.
        """
        if not email:
            raise ValueError(_('O Email deve ser definido'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Cria e salva um superusuário com o email e a senha fornecidos.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superusuário deve ter is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superusuário deve ter is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)
