from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction, IntegrityError
from datetime import datetime
from .models import PerfilCliente, Endereco

class SalvarDadosCompletosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user
        
        try:
            with transaction.atomic():
                # 1. Cria ou Atualiza o Perfil (Dados Pessoais)
                if not hasattr(user, 'perfilcliente'):
                    nome = data.get('nome_completo', '')
                    if not nome:
                        nome = user.first_name or user.email.split('@')[0]
                        
                    perfil = PerfilCliente.objects.create(
                        usuario=user,
                        nome_completo=nome
                    )
                else:
                    perfil = user.perfilcliente
                
                # Atualiza Nome
                if 'nome_completo' in data and data.get('nome_completo'):
                    perfil.nome_completo = data.get('nome_completo')
                
                # Atualiza CPF
                if 'cpf' in data:
                    cpf_val = data.get('cpf')
                    perfil.cpf = cpf_val if cpf_val else None
                    
                # Atualiza Telefone
                if 'telefone' in data:
                    perfil.telefone = data.get('telefone')

                # ADICIONADO: Atualiza e formata Data de Nascimento
                if 'data_nascimento' in data and data.get('data_nascimento'):
                    data_nasc_str = data.get('data_nascimento')
                    try:
                        # Tenta converter a string no formato DD/MM/YYYY que o JS envia
                        if '/' in data_nasc_str:
                            perfil.data_nascimento = datetime.strptime(data_nasc_str, '%d/%m/%Y').date()
                        else:
                            # Fallback caso venha YYYY-MM-DD
                            perfil.data_nascimento = datetime.strptime(data_nasc_str, '%Y-%m-%d').date()
                    except ValueError:
                        raise Exception("Formato de data inválido. Use DD/MM/AAAA.")
                
                try:
                    perfil.save()
                except IntegrityError as e:
                    # Trata o erro do banco caso o CPF já pertença a outra pessoa
                    erro_str = str(e).lower()
                    if 'cpf' in erro_str and ('unique' in erro_str or 'duplicate' in erro_str):
                        raise Exception("Este CPF já está cadastrado em outra conta!")
                    else:
                        raise e
                
                # 2. Cria ou Atualiza o Endereço
                # Ignoramos a atualização de endereço se nenhum CEP for passado (útil para quando o usuário só edita o perfil)
                if data.get('cep'):
                    endereco, end_created = Endereco.objects.get_or_create(
                        perfil_cliente=perfil,
                        cep=data.get('cep'),
                        numero=data.get('numero'),
                        defaults={
                            'logradouro': data.get('logradouro'),
                            'bairro': data.get('bairro'),
                            'cidade': data.get('cidade'),
                            'estado': data.get('estado'),
                            'complemento': data.get('complemento', ''),
                            'latitude': data.get('latitude', ''),  # SALVA LATITUDE
                            'longitude': data.get('longitude', ''), # SALVA LONGITUDE
                            'is_principal': True
                        }
                    )
                    
                    if not end_created:
                        endereco.logradouro = data.get('logradouro')
                        endereco.bairro = data.get('bairro')
                        endereco.cidade = data.get('cidade')
                        endereco.estado = data.get('estado')
                        endereco.complemento = data.get('complemento', '')
                        endereco.latitude = data.get('latitude', '')  # ATUALIZA LATITUDE
                        endereco.longitude = data.get('longitude', '') # ATUALIZA LONGITUDE
                        endereco.is_principal = True
                        endereco.save()
                
                return Response({
                    'success': True, 
                    'message': 'Dados atualizados com sucesso!'
                })

        except Exception as e:
            # Captura a nossa mensagem amigável (ou erros não previstos do banco) e devolve para o front
            erro_msg = str(e)
            
            # Última rede de segurança para mensagens feias do banco sqlite/postgres
            if 'cpf' in erro_msg.lower() and ('unique' in erro_msg.lower() or 'duplicate' in erro_msg.lower()):
                erro_msg = "Este CPF já está cadastrado em outra conta!"
                
            return Response({'success': False, 'errors': erro_msg}, status=status.HTTP_400_BAD_REQUEST)