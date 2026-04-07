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

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const defaultInstituicao: DadosInstituicao = API_URL
  ? {
      nome: '',
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
    }
  : {
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
