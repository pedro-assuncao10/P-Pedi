# usuarios/permissions.py

def eh_equipe(user):
    """
    Verifica se o usuário faz parte da equipe (Staff ou Superuser).
    Usado nos decorators @user_passes_test
    """
    return user.is_authenticated and (user.is_staff or user.is_superuser)