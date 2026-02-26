from django.contrib.auth.forms import PasswordChangeForm
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash

from clientes.models import PerfilCliente
from .forms import PerfilClienteForm

class EditarDadosAPIView(APIView):
    """
    API para o usuário editar seus próprios dados de perfil.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Garante que o perfil do cliente exista, criando-o se necessário
        perfil, created = PerfilCliente.objects.get_or_create(usuario=request.user)
        
        # O campo 'email' não deve ser editado, então o removemos dos dados
        request.data.pop('email', None)

        form = PerfilClienteForm(request.data, instance=perfil)
        if form.is_valid():
            form.save()
            return Response({'success': True, 'message': 'Dados atualizados com sucesso!', 'reload': True})
        return Response({'success': False, 'errors': form.errors}, status=status.HTTP_400_BAD_REQUEST)

class AlterarSenhaAPIView(APIView):
    """
    API para o usuário alterar sua própria senha.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        form = PasswordChangeForm(user=request.user, data=request.data)
        if form.is_valid():
            form.save()
            # A sessão é atualizada para não deslogar o usuário após a troca de senha
            update_session_auth_hash(request, form.user)
            return Response({'success': True, 'message': 'Senha alterada com sucesso!'})
        return Response({'success': False, 'errors': form.errors}, status=status.HTTP_400_BAD_REQUEST)

