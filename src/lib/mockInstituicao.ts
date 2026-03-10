export interface DadosInstituicao {
  nome: string;
  cnpj: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
}

export const instituicaoStorageKey = 'school-compass:instituicao';

export const defaultInstituicao: DadosInstituicao = {
  nome: 'Colégio Classe 360',
  cnpj: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  telefone: '',
  email: '',
};
