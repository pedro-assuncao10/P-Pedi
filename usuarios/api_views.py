from django.contrib.auth.forms import PasswordChangeForm
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash

class AlterarSenhaAPIView(APIView):
    """
    API para o usuário alterar sua própria senha.
    Essa é uma responsabilidade global, válida tanto para Clientes quanto para Lojistas.
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