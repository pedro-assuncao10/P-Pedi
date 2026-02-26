from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction
from .models import PerfilCliente, Endereco

class SalvarDadosCompletosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user
        
        try:
            with transaction.atomic():
                # 1. Cria ou Atualiza o Perfil (Dados Pessoais)
                # O usuario pode já ter perfil mas não ter endereço, então usamos get_or_create
                perfil, created = PerfilCliente.objects.get_or_create(usuario=user)
                
                # Se vieram dados de perfil no formulário, atualizamos
                if 'nome_completo' in data:
                    perfil.nome_completo = data.get('nome_completo')
                    perfil.cpf = data.get('cpf')
                    perfil.telefone = data.get('telefone')
                    perfil.save()
                
                # 2. Cria o Endereço
                endereco = Endereco.objects.create(
                    perfil_cliente=perfil,
                    cep=data.get('cep'),
                    logradouro=data.get('logradouro'),
                    numero=data.get('numero'),
                    bairro=data.get('bairro'),
                    cidade=data.get('cidade'),
                    estado=data.get('estado'),
                    complemento=data.get('complemento', ''),
                    is_principal=True
                )
                
                return Response({
                    'success': True, 
                    'message': 'Cadastro completo realizado!',
                    'endereco': {
                        'logradouro': endereco.logradouro,
                        'numero': endereco.numero,
                        'bairro': endereco.bairro
                    }
                })

        except Exception as e:
            # Em caso de erro (ex: CPF duplicado), retorna o erro
            return Response({'success': False, 'errors': str(e)}, status=status.HTTP_400_BAD_REQUEST)